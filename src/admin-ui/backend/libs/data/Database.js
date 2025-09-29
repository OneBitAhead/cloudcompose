// Default configuration
const crypto = require('node:crypto')
const fsp = require("node:fs/promises")

const EventEmitter2 = require('eventemitter2');
// Change original emit method to send (event, payload) instead of (payload) only
const originalEmit = EventEmitter2.prototype.emit;
EventEmitter2.prototype.emit = function (event, ...args) {
    return originalEmit.call(this, event, event, ...args);
}


const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require("path");
const fsPromises = require("fs").promises;
const cloneDeep = require('lodash').cloneDeep;
const validator = require('validator');
const Helper = require("../Helper");
const { scryptSync, randomFillSync, createCipheriv, createDecipheriv } = require('crypto');
const algorithm = 'aes-256-cbc';
const { hasRole } = require("../Helper");
const { split } = require('lodash');

// CRYPT
const Crypt = {
    encrypt(password, value) {
        const key = scryptSync(password, 'salt', 32);
        var iv = randomFillSync(new Uint8Array(16));
        var hexIV = new Buffer.from(iv).toString("hex");
        var byteIV = new Buffer.from(hexIV, 'hex');
        const cipher = createCipheriv(algorithm, key, byteIV);
        var crypted = cipher.update(value, 'utf8', 'hex')
        crypted += cipher.final('hex');
        return hexIV + ":" + crypted;
    },
    decrypt(password, value) {
        const key = scryptSync(password, 'salt', 32);
        var parts = value.split(":");
        var byteIV = new Buffer.from(parts[0], 'hex');
        const cipher = createDecipheriv(algorithm, key, byteIV);
        var decrypted = cipher.update(parts[1], 'hex', 'utf8')
        decrypted += cipher.final('utf8');
        return decrypted;
    }
}

/**
 * Hilfsklasse für die Datenbank
 *
 * Json-Column abstraktion für SQLite und dynamische Datenstruktur der Anwendungs-Tabelle 
 * 
 */
class JsonTable {

    #db;

    constructor(db, table, options) {

        this.#db = db;

        this.table = table;
        options = options || {};

        // Um "upsert" auszuführen
        if (options.idColumns && options.idColumns.length !== 0) this.identifyingColumns = [].concat(options.idColumns);
        else this.identifyingColumns = ["id"];


        if (options.columns) this.columns = cloneDeep(options.columns);
        else options.columns = {};

        this.physicalAttributes = options.physicalAttributes || [].concat(STATIC_PHYSICAL_ATTRIBUTES);

        this.defaultSort = options.defaultSort;
        this.unique = options.unique || {};
        this.updateEventWithData = options.updateEventWithData || false;
        this.relations = options.relations;
    }

    /**
     * Anlegen der Tabelle (und DROP wenn bereits da!)
     */
    async init() {
        await this.#db.knex.schema.dropTableIfExists(this.tablename);
        await this.#db.knex.schema.createTable(this.tablename, function (table) {
            table.increments();
            table.timestamps(true, true);
            table.json("json");
        });
    }


    async fetchById(req, id, options) {

        options = options || {};
        var query = this.#db.knex(this.table)
        query = this.__prepareFetch(req, "fetchById", query, { id: id }, options);
        query.where(`${this.table}.id`, id);

        if (options.debug) console.log(query.toString())

        var data = await query;
        data = this.__prepareOutgoingData(req, data, options);

        return data;
    }

    async fetch(req, criteria, options) {

        options = options || {};

        var query = this.#db.knex(this.table)
        query = this.__prepareFetch(req, "fetch", query, criteria, options);

        if (options.debug) console.log(query.toString())

        var data = await query;

        if (options.withoutDataPreparation !== true) data = this.__prepareOutgoingData(req, data, options);

        return data;

    }

    __prepareOutgoingData(req, records, options) {

        options = options || {};
        var multipleRecords = Array.isArray(records);
        var data = [].concat(records);

        for (var x in data) {

            // hook for every record 
            if (typeof this.beforePrepareOutgoingData === "function") {
                this.beforePrepareOutgoingData.apply(this, [data[x], options]);
            }

            let hasOneForeignRecs = {};

            for (var y in data[x]) {

                // foreign keys loaded?
                if (y.indexOf(".") !== -1) {
                    var splitted = y.split(".");
                    if (hasOneForeignRecs[splitted[0]] === undefined) hasOneForeignRecs[splitted[0]] = {};
                    hasOneForeignRecs[splitted[0]][splitted[1]] = data[x][y];
                    delete data[x][y];
                    continue;
                }

                var colConf = this.columns[y];

                // Password fields
                if (colConf && colConf.type == "password" && options.withPasswordHash !== true) {
                    data[x][y] = (!data[x][y]) ? '' : "*********";
                }
                else if (colConf && colConf.type == "passwordSafe") {

                    if (options.withDecryptedValues !== true) data[x][y] = (!data[x][y]) ? '' : "*********";
                    else {
                        // weak or strong encryption
                        if (options.strongEncryption === false) {
                            // encrypt the data with the default password                       
                            var pwd = this.#db.getSoftEncryptionPwd();
                            if (data[x][y] !== undefined) data[x][y] = Crypt.decrypt(pwd, data[x][y]);
                        } else {
                            // Decrypt with masterPassword of user
                            var masterPassword = Helper.getVar(req, "session.masterPassword", false);
                            if (masterPassword === false) throw new Error("No MasterPassword present! You cannot get encrypted values from the database!");
                            if (data[x][y] !== undefined) data[x][y] = Crypt.decrypt(masterPassword, data[x][y]);
                        }
                    }
                }
                else if (colConf && colConf.type == "datetime") {
                    try {
                        if (data[x][y] !== undefined && data[x][y] !== null && data[x][y].slice(-1) !== "Z") data[x][y] += "Z";
                    } catch (e) {
                        log.error("DB", `Datetime error: ${data[x][y]} is no ISO string`)
                    }
                }
                else if (colConf && colConf.type == "boolean") {
                    if (data[x][y] === 1) data[x][y] = true;
                    else if (data[x][y] === 0) data[x][y] = false;
                    if (colConf.nullable === false && !data[x][y]) data[x][y] = false;

                }
                // Selections
                else if ((colConf && colConf.type == "selection" && colConf.many === true) || (colConf && colConf.type == "fk_m2m")) {
                    var value = data[x][y];
                    if (value == undefined || value == null || value == "") {
                        data[x][y] = [];
                    } else {
                        try {
                            data[x][y] = [].concat(JSON.parse(value));
                        } catch (e) {
                            data[x][y] = [value];
                        }
                    }
                } else if (colConf && colConf.type == "json") {
                    try {
                        if (data[x][y] !== undefined && data[x][y] !== null) data[x][y] = JSON.parse(data[x][y]);
                    } catch (e) {
                        log.error("DB", `JSON error: '${data[x][y]}' is no JSON`)
                    }
                }
            }

            // Foreign keys
            if (options.withRelations === true) {
                var relOpt = structuredClone(options);
                delete relOpt.withRelations;
                // run through all foreign keys (direct ones)
                for (var c in this.columns) {
                    let col = this.columns[c];
                    if (col.type !== "fk_hasOne") continue;
                    // data?
                    if (hasOneForeignRecs[c]) {
                        // prepare that data for outgoing too (record by record)
                        data[x][c] = this.#db.table(col.table).__prepareOutgoingData(req, hasOneForeignRecs[c], relOpt);
                    }
                }
            }

        }

        if (!multipleRecords) return data[0];
        else return data;

    }


    getFetchQuery(req, options) {

        options = options || {};
        var query = this.#db.knex(this.table); // .select(`${this.table}.id`)
        query = this.__prepareFetch(req, "fetch", query, options);
        return query;

    }


    async count(req, options) {

        options = options || {};
        var query = this.#db.knex(this.table); // .select(`${this.table}.id`)
        options.attributes = [];
        query = this.__prepareFetch(req, "fetch", query, options);

        var countResult = await query.count("id as count");
        return countResult[0].count;

    }


    async insert(req, data, options) {

        options = options || {};


        if (options.ignoreHooks !== true && typeof this.beforeInsert === "function") {
            var result = await this.beforeInsert.apply(this, [data, options]);
            if (result === false) return false;
        }


        // store orig data for the event!
        var origData = JSON.parse(JSON.stringify(data));

        var record = {};
        // ID
        if (data.id) {
            record["id"] = data.id;
            delete data.id;
        }

        var data = await this.__prepareIngoingData(req, data, undefined, options);

        var id = await this.#db.knex(this.table).insert(data);
        // Returns an id [3]
        if (options.ignoreEvents !== true) {
            // Emit insert event
            let event = `${this.table}:insert:${id[0]}`;
            this.#db.emit(event, { id: id[0], data: origData });
            if (this.#db.wsh) this.#db.wsh.emit(`db:${event}`, origData);
        }

        // after insert hook
        if (options.ignoreHooks !== true && typeof this.afterInsert === "function") {
            try {
                await this.afterInsert.apply(this, [id[0], data, options]);
            } catch (e) {
                log.error("DB", e);
            }
        }

        return id;

    }


    async upsert(req, data, options) {

        options = options || {};

        var stats = options.stats || {};
        if (!stats.inserted || isNaN(stats.inserted)) stats.inserted = 0;
        if (!stats.updated || isNaN(stats.updated)) stats.updated = 0;
        if (!stats.deleted || isNaN(stats.deleted)) stats.deleted = 0;
        if (!stats.unchanged || isNaN(stats.unchanged)) stats.unchanged = 0;

        // prüfen, ob der Datensatz die benötigten Identitäts-Spalten besitzt
        var checkQuery = this.getFetchQuery();
        for (var x in this.identifyingColumns) {
            if (data[this.identifyingColumns[x]] == undefined) throw new Error(`Upsert ${this.table} needs the columns in the dataset: ${this.identifyingColumns.join(", ")}`.toString());
            checkQuery.where(this.__getSQL(this.table, this.identifyingColumns[x], true), "=", data[this.identifyingColumns[x]]);
        }

        // Prüfen, ob ein solcher Datensatz existiert...
        var updateQuery = checkQuery.clone();
        var exists = await checkQuery;
        if (exists.length == 0) {
            stats.inserted++;
            return await this.insert(req, data, options);
        }

        exists = this.__prepareOutgoingData(req, exists, options);

        // Check if we NEED to update the record!
        // compare the existing one with the data given!
        var updateData = {};
        var needsUpdate = false;

        for (var x in data) {
            var colConf = this.columns[x];
            if (colConf && colConf.type === "selection") {
                if (JSON.stringify(exists[0][x]) !== JSON.stringify(data[x])) {
                    if (!x.startsWith("__")) needsUpdate = true;
                    updateData[x] = data[x];
                }
            } else {
                if (exists[0][x] !== data[x]) {
                    if (!x.startsWith("__")) needsUpdate = true;
                    updateData[x] = data[x];
                }
            }
        }


        // record id
        var id = exists[0].id;

        if (needsUpdate === false) {
            stats.unchanged++;
            return [id];
        }
        // update the record!
        // Remove id columns --> this is an upsert
        for (var x in this.identifyingColumns) {
            delete updateData[this.identifyingColumns[x]];
        }

        if (options.ignoreHooks !== true && typeof this.beforeUpdate === "function") {
            var result = await this.beforeUpdate.apply(this, [id, updateData, options]);
            if (result === false) return false;
        }

        var data = await this.__prepareIngoingData(req, updateData, id, options);
        // increase version
        data["__version"] = exists[0].__version + 1;

        stats.updated++;
        await updateQuery.update(data);


        if (options.ignoreEvents !== true) {
            var event = `${this.table}:update:${id}`;
            // Emit change        
            if (this.updateEventWithData === true) {
                var data = await this.fetchById(id);
                this.#db.emit(event, data[0]);
            } else {
                this.#db.emit(event, { id: id, __changed__: updateData });
            }
            if (this.#db.wsh) this.#db.wsh.emit(`db:${event}`, updateData);
        }

        // after update hook
        if (options.ignoreHooks !== true && typeof this.afterUpdate === "function") {
            try {
                await this.afterUpdate.apply(this, [id, updateData, options]);
            } catch (e) {
                log.error("DB", e);
            }
        }
        return [id];

    }


    async update(req, id, data, options) {

        options = options || {};

        if (typeof this.beforeUpdate === "function") {
            var result = await this.beforeUpdate.apply(this, [id, data, options]);
            if (result === false) return false;
        }

        var exists = await this.#db.knex(this.table).select("*").where(`${this.table}.id`, id);
        if (exists.length == 0) throw new Error("NoSuchRecord with ID: " + id);

        // is user request (req.session) only NOT locked records can be updated
        if (req.session && exists[0].__locked === 1) throw new Error("RecordIsLocked: " + id);


        var data = await this.__prepareIngoingData(req, data, id, options);

        // Check if we NEED to update the record!
        // compare the existing one with the data given!
        var updateData = {};
        var needsUpdate = false;

        for (var x in data) {
            var colConf = this.columns[x];
            if (colConf && colConf.type === "selection") {
                if (JSON.stringify(exists[0][x]) !== JSON.stringify(data[x])) {
                    if (!x.startsWith("__")) needsUpdate = true;
                    updateData[x] = data[x];
                }
            } else {
                if (exists[0][x] !== data[x]) {
                    if (!x.startsWith("__")) needsUpdate = true;
                    updateData[x] = data[x];
                }
            }
        }


        if (needsUpdate === false) {
            return [id];
        }

        data = updateData;

        // increase version
        data["__version"] = exists[0].__version + 1;

        var query = this.#db.knex(this.table).where(`${this.table}.id`, id).update(data);
        await query;


        var event = `${this.table}:update:${id}`;

        if (options.ignoreEvents !== true) {
            // Emit change        
            if (this.updateEventWithData === true) {
                var data = await this.fetchById(id);
                this.#db.emit(event, data[0]);
            } else {
                this.#db.emit(event, { id: id, __changed__: updateData });
            }
            // send only changed data!
            if (this.#db.wsh) this.#db.wsh.emit(`db:${event}`, updateData);
        }

        // after update hook
        if (typeof this.afterUpdate === "function") {
            try {
                await this.afterUpdate.apply(this, [id, updateData, options]);
            } catch (e) {
                log.error("DB", e);
            }
        }


        return [id];

    }


    // check unique (for id columns and the post or update)
    async __checkUnique(req, data, id) {


        for (var x in this.unique) {
            await this.__checkUniqueAttributes(req, data, id, this.unique[x]);
        }

        if (this.identifyingColumns.length == 1 && this.identifyingColumns[0] == "id") {
            return true;
        } else if (this.identifyingColumns.length > 0) {
            // Default uniqueness check with the attributes of "identifying columns"
            await this.__checkUniqueAttributes(req, data, id, this.identifyingColumns);
        }


    }



    async __checkUniqueAttributes(req, data, id, attributes) {

        // check if ALL columns of the id columns are in data ...
        var dataToCompare = {};
        var allDataProvided = true;
        for (var x in attributes) {
            var col = attributes[x];
            if (data[col] == undefined) allDataProvided = false;
            else dataToCompare[col] = data[col];
        }

        if (id !== undefined && allDataProvided === false) {
            // fetch the needed data
            var uniqueRecordData = await this.fetchById(req, id);
            var rec = uniqueRecordData[0];
            for (var x in attributes) {
                var col = attributes[x];
                dataToCompare[col] = rec[col];
            }
        }

        // Check the complete database for the uniqueness
        var query = this.#db.knex(this.table).select(`${this.table}.id`)
        for (var x in dataToCompare) {
            query.whereRaw(`${this.__getSQL(this.table, x, true)} = :val`, { val: dataToCompare[x] });
        }
        var records = await query;


        if (id !== undefined) {
            // update (id is known)
            if (records.length > 1 || (records.length == 1 && parseInt(records[0].id) !== parseInt(id))) {
                let error = `Update uniqueness error in table '${this.table}': ${attributes.join(", ")}`;
                throw new Error(error);
            }
        } else {
            // create (NO id)
            if (records.length !== 0) {
                let error = `Insert uniqueness error in table '${this.table}': ${attributes.join(", ")}`;
                throw new Error(error);
            }
        }

        return true;



    }


    async deleteWhere(req, where, options) {

        if (Object.keys(where).length == 0) throw new Error(`At least one condition is needed for "deleteWhere"`);

        var query = this.#db.knex(this.table)
        query.select(`${this.table}.id`);
        query = this.__prepareFetch(req, "fetch", query, where);

        // is user request (req.session) only NOT locked records can be deleted
        if (req.session) query.where("__locked", 0);
        // if transaction...use it
        if (req.trx) query.transacting(req.trx);

        var data = await query.select("id");
        let ids = [];
        for (var x in data) {
            ids.push(data[x].id);
        }
        // NOW CALL DELETE FUNCTION ....
        return await this.#delete(req, ids, options);
    }

    async delete(req, ids, options) {
        return await this.#delete(req, ids, options);
    }


    async deleteAll(req, options) {

        // get all ids first
        var query = this.#db.knex(this.table).select(`${this.table}.id`);
        // is user request (req.session) only NOT locked records can be deleted
        if (req.session) query.where("__locked", 0);
        // if transaction...use it
        if (req.trx) query.transacting(req.trx);
        var entries = await query;

        var ids = [];
        for (var x in entries) ids.push(entries[x].id);

        return await this.#delete(req, ids, options);


    }



    async #delete(req, ids, options) {


        ids = [].concat(ids);
        options = options || {};

        try {
            if (options.ignoreHooks !== true && typeof this.beforeDelete == "function") {
                var result = await this.beforeDelete.apply(this, [ids, options]);
                if (result === false) {
                    throw new Error("BeforeDeleteError", result);
                }
            }

            var primaryCall = false;
            // already a transaction?
            if (!req.trx) {
                const trx = await this.#db.knex.transaction();
                req.trx = trx;
                primaryCall = true;
            }

            var query = this.#db.knex(this.table).whereIn("id", ids);
            query.transacting(req.trx);
            // is user request (req.session) only NOT locked records can be deleted
            if (req.session) query.where("__locked", 0);


            // Is there an option set (eventWithDeletedData)
            var deletedDataById = {};
            if (options.eventWithDeletedData) {
                var deletedData = await query.clone();
                for (var x in deletedData) {
                    deletedDataById[deletedData[x].id] = deletedData[x];
                }
            }
            // delete base record/s
            var del = await query.del();

            // check cascade delete
            await this.checkCascadeDelete(req, this.table, ids, options);

            // commit: if the primary call!!
            if (primaryCall) await req.trx.commit();

        } catch (e) {
            if (!primaryCall) throw e;
            else {
                await req.trx.rollback();
                throw e;
            }
        }


        for (var x in ids) {

            if (options.ignoreEvents !== true) {
                var event = `${this.table}:delete:${ids[x]}`;
                // Emit delete event
                var payload = { id: ids[x] };
                if (options.eventWithDeletedData && deletedDataById[ids[x]]) payload.beforeDelete = deletedDataById[ids[x]];
                this.#db.emit(event, payload);
                if (this.#db.wsh) this.#db.wsh.emit(`db:${event}`, payload);
            }

            // after delete hook
            if (options.ignoreHooks !== true && typeof this.afterDelete === "function") {
                try {
                    await this.afterDelete.apply(this, [ids[x]]);
                } catch (e) {
                    log.error("DB", e);
                }
            }


        }

        return del;
    }




    async __prepareIngoingData(req, data, id, options) {

        options = options || {};
        var record = {};

        var type = (id !== undefined) ? "update" : "insert";

        // check uniqueness first
        await this.__checkUnique(req, data, id);

        // Nullable check
        for (var x in this.columns) {
            if (this.columns[x].nullable === false) {
                if (type == "insert" && (data[x] === undefined || data[x] === null || (typeof data[x] === "string" && data[x].trim() == "")) && this.columns[x].default === undefined) throw new Error(`${x} is not nullable`);
                else if (type == "update" && data[x] !== undefined && (data[x] === null || (typeof data[x] === "string" && data[x].trim() == ""))) throw new Error(`${x} is not nullable`);
            }
        }

        // validate OR check encryption
        for (var x in data) {

            var colConf = this.columns[x];
            if (!colConf) continue;

            //-----------------
            // Validation
            //-----------------       
            if (colConf.validator) {

                if (validator[colConf.validator] !== undefined) {
                    try {
                        var params = colConf.validatorParameters || [];
                        var result = validator[colConf.validator].apply(this, [data[x], ...params])
                        if (result === false) throw new Error(`${x} with value ${data[x]} not valid type: ${colConf.validator}.`)
                    } catch (e) {
                        throw new Error(`${x} with value ${data[x]} throws an error in validation: ${e.toString()}`)
                    }
                } else if (typeof colConf.validator == "function") {

                    // recordId, data, value, validator, db
                    var result = await colConf.validator.apply(this, [id, data, data[x], validator, this.#db, Helper])
                    if (result === false) throw new Error(`${x} with value ${data[x]} not valid.`)

                }
            }

            //-----------------
            // TYPE CONVERSIONS (for insert and update)
            //-----------------
            if (colConf.type == "passwordSafe") {

                if (options.passwordSafeDirectValue === true) {
                    data[x] = data[x];
                } else if (options.strongEncryption === false) {
                    // encrypt the data with the default password
                    var pwd = this.#db.getSoftEncryptionPwd()
                    data[x] = Crypt.encrypt(pwd, data[x]);
                } else {
                    // we need to encrypt the data with the master password (only if masterpassword is present in the session!!)
                    var masterPassword = Helper.getVar(req, "session.masterPassword", false);
                    if (masterPassword === false) throw new Error("No MasterPassword present! No insert/update with strong encryption is possible!");
                    // change the data...
                    data[x] = Crypt.encrypt(masterPassword, data[x]);
                }
            } else if (colConf.type == "boolean") {
                data[x] = this.__getBoolean(data[x]);

            } else if (colConf.type === "datetime") {

                if (typeof data[x] === "number") data[x] = new Date(data[x]).toISOString();


            } else if (colConf.type == "integer") {

                if ((!data[x] || data[x].toString().trim() === "") && colConf.nullable !== false) {
                    delete data[x];
                    continue;
                }

                let d = parseInt(data[x], 10);
                if (isNaN(d)) throw new Error(`${x} with value ${data[x]} not a valid integer.`)
                data[x] = d;

            } else if (colConf.type === "json") {

                // check if              
                if (data[x] !== undefined && data[x] !== null) data[x] = this.#ensureJSONString(data[x]);

            } else if (colConf.type === "fk_hasOne") {

                // check if the id exists!                
                var exists = await this.#db.table(colConf.table).fetchById(req, data[x])
                if (exists.length === 0) throw new Error(`Relation ${x} with id ${data[x]} does not exist!`);

            } else if (colConf.type === "fk_m2m") {
                data[x] = JSON.stringify(data[x]);
            }


        }

        // UPDATE
        if (type == "update") {

            var array = [];
            var values = {};

            for (var x in data) {
                if (x === "id") continue;
                if (x.substring(0, 2) == "__") {
                    continue;
                }

                var colConf = this.columns[x];
                if (!colConf) continue;

                if (colConf.immutable === true && req.session !== undefined) {
                    delete data[x];
                    log.debug("DB", `Removed: '${x}' it's immutable`);
                }

                if (this.physicalAttributes.indexOf(x) !== -1) {

                    if ((colConf.type == "selection" && colConf.many === true) || colConf.type == "fk_m2m") {
                        if (typeof data[x] === "string") {
                            record[x] = data[x];
                        } else {
                            record[x] = JSON.stringify(data[x]);
                        }
                    } else {
                        record[x] = data[x];
                    }
                    continue;
                }



                array.push(`'$.${x}'`);

                if (colConf.type == "boolean") {
                    // Add directly as 0 or 1
                    array.push(this.__getBoolean(data[x]));
                } else if (typeof data[x] == "string") {
                    // values to escape...
                    array.push(`:${x}`);
                    values[x] = data[x];

                } else if ((colConf.type == "selection" && colConf.many === true) || colConf.type == "fk_m2m") {
                    // construct json array 

                    var jsonArray = [];
                    var arrayValues = {}
                    for (var e in data[x]) {
                        jsonArray.push(`:${e}`);
                        arrayValues[e] = data[x][e];
                    }
                    array.push(this.#db.knex.raw(`json_array(${jsonArray.join(",")})`, arrayValues));

                } else if (data[x] == true || data[x] == false || !isNaN(data[x])) {
                    array.push(`:${x}`);
                    values[x] = JSON.stringify(data[x]);

                } else {
                    array.push(`:${x}`);
                    values[x] = data[x];
                }
            }

            if (array.length > 0) {
                record.json = this.#db.knex.raw(`json_set(json,${array.join(", ")})`, values)
            }
            record.__validFrom = new Date().toISOString();

        }
        // INSERT 
        else if (type == "insert") {

            // other physical attributes
            for (var x in this.physicalAttributes) {
                var a = this.physicalAttributes[x];
                if (data[a] !== undefined) {
                    var colConf = this.columns[a];
                    if ((colConf.type == "selection" && colConf.many === true) || colConf.type == "fk_m2m") {
                        if (typeof data[a] === "string") {
                            record[a] = data[a];
                        } else {
                            record[a] = JSON.stringify(data[a]);
                        }
                    } else {
                        record[a] = data[a];
                    }
                    delete data[a];
                }
            }
            // add the json data...        
            record.json = this.#db.knex.raw(`json_insert(:value)`, { value: JSON.stringify(data) });

            record.__createdAt = new Date().toISOString();
            record.__validFrom = record.__createdAt;
        }

        return record;
    }


    __getBoolean(value) {

        if (value == true || value == 1 || value == "true" || value == "1") return 1;
        else return 0;

    }


    #ensureJSONString(value) {
        // Check if `value` is a string
        if (typeof value === "string") {
            // Try parsing to confirm it's valid JSON
            try {
                JSON.parse(value);
                // It's a valid JSON string already
                return value;
            } catch {
                // It's just a normal string, so stringify it
                return JSON.stringify(value);
            }
        }
        // If it's not a string at all, stringify it
        return JSON.stringify(value);
    }


    async checkCascadeDelete(req, tablename, ids, options = {}) {

        var relations = this.#db.getRelationTargets(this.table);

        // with deletion data!
        options.eventWithDeletedData = true;

        for (var x in relations) {
            let table = relations[x].table;
            let col = relations[x].col;
            await this.#db.table(table).deleteWhere(req, { attrib: col, op: "in", value: ids }, options);

        }

    }


    __getSQL(table, attr, withoutAs, internalOptions = {}) {

        // foreign key?                
        if (this.physicalAttributes.indexOf(attr) !== -1) {
            return this.#db.knex.raw(`${table}.\`${attr}\``)
        } else if (attr.indexOf(".") !== -1) {

            var split = attr.split(".");
            if (this.columns[split[0]] === undefined) throw new Error("NoSuchRelation:" + split[0]);

            internalOptions.withRelations = true;
            var colDef = this.columns[split[0]];
            // other model!
            let sql = this.#db.table(colDef.table).__getSQL(split[0], split[1]);

            return sql;

        } else {
            if (withoutAs) return this.#db.knex.raw(`json_extract(${table}.json, '$.${attr}')`);
            else return this.#db.knex.raw(`json_extract(${table}.json, '$.${attr}') as '${attr}'`);
        }
    }


    __parseFixedData(data) {

        var values = {};

        var params = data.split(",");
        for (var x in params) {
            var split = params[x].split(":");
            // check if there is such a column...          
            var colDef = this.columns[split[0]];
            if (!colDef) continue;
            var val = split[1];
            if (colDef.type == "boolean") val = this.__getBoolean(val);

            values[split[0]] = val;

        }

        return values;

    }

    __prepareFetch(req, type, query, criteria, options) {

        options = options || {};

        // Prepare fields
        if (options.attributes) {
            // ALWAYS ADD ID!
            query.select(this.__getSQL(this.table, "id"));

            var selectCols = [];
            for (var x in options.attributes) {
                let attr = options.attributes[x];
                if (attr === "id") continue;
                if (attr === "*") {
                    selectCols = Object.keys(this.columns);
                    break;
                }
                if (attr.indexOf(".") !== -1) {
                    var splitted = attr.split(".");
                    if (this.relations[splitted[0]] === undefined) throw new Error(`No such relation: ${splitted[0]}`);
                    continue;
                }
                else {
                    selectCols.push(attr);
                }
            }

            for (var x in selectCols) {
                query.select(this.__getSQL(this.table, selectCols[x]));
            }




        } else if (this.columns) {
            for (var x in this.columns) {
                if (this.columns[x].type == "fk_hasOne" && options.withRelations) continue;
                query.select(this.__getSQL(this.table, x));
            }
        }

        // needs relations!
        var internalOptions = {};

        // NEW criteria (like in scinario-core)
        if (criteria) this.#db.CriteriaBuilder.addCriteriaToQuery(req, this.table, criteria, internalOptions, query);

        if (internalOptions.withRelations) options.withRelations = true;

        if (typeof this.onFetch == "function") {
            query = this.onFetch.apply(this, [type, query, options]);
        }

        if (options && options.fixedData) {

            var params = this.__parseFixedData(options.fixedData);

            for (var x in params) {
                query.whereRaw(`${this.__getSQL(this.table, x, true)} = :val`, { val: params[x] });
            }
        }

        // Is there a default sort for the table
        if (options.sort == undefined && this.defaultSort !== undefined) options.sort = this.defaultSort;

        // Prepare sorting
        if (options.sort) {

            for (var x in options.sort) {
                let s = options.sort[x];
                var colDef = this.columns[s.field];
                if (!colDef || colDef.type == "fk_hasOne" || colDef.type == "fk_m2m") continue;
                // query.orderBy(`_base_.${s.field}`, (s.direction == "asc")? 'asc':'desc');
                // NO JOINS!
                query.orderByRaw(`${this.__getSQL(this.table, s.field, true)} ${(s.direction == "asc") ? 'asc' : 'desc'} NULLS LAST`)
            }
        }

        if (options.search) {

            // var logic = (options.searchLogic === "OR") ? "OR": "AND";
            var search = options.search;
            for (var x in search) {
                var s = search[x];
                var colDef = this.columns[s.field];
                if (!colDef || colDef.type == "fk_m2m") continue;
                if (colDef.type === "fk_hasOne") {
                    // console.log("TODO: Search in colName of fk_hasOne too");
                    continue;
                }
                query.orWhere(`${this.table}.${s.field}`, "like", `%${s.value}%`);
            }
        }

        if (options.groupBy) {
            var groups = [].concat(options.groupBy);
            for (var x in groups) {
                query.groupByRaw(this.__getSQL(this.table, groups[x], true));
            }
        }


        // Fetch fk_hasOne via leftJoin
        if (options.withRelations) {
            // OWN RELATIONS!
            for (var x in this.columns) {
                let c = this.columns[x];
                if (c.type !== "fk_hasOne") continue;
                this.__addLeftJoin(query, x, x, c.table, "id", options)
            }
        }


        if (options.limit) {
            query.limit(options.limit);
        }
        if (options.offset) {
            query.offset(options.offset);
        }

        return query;
    }



    __addLeftJoin(query, alias, joinAttribute, table, foreignJoinAttribute, options) {

        // ID from table
        query.select(this.#db.knex.raw(`${alias}.id as '${alias}.id'`));

        var specificAttributes = [];
        var allAttributes = false;

        if (options.attributes) {
            for (var x in options.attributes) {
                var splitted = options.attributes[x].split(".");
                if (splitted[0] !== alias) continue;
                if (splitted.length === 1) continue;
                if (splitted[1] === "*") {
                    allAttributes = true;
                    break;
                } else {
                    specificAttributes.push(splitted[1]);
                }
            }
        }

        var columns = [];
        if (allAttributes === true) {
            columns = Object.keys(this.#db.table(table).columns);
        } else if (specificAttributes.length !== 0) {
            columns = specificAttributes;
        } else {
            // get id columns
            columns = this.#db.table(table).identifyingColumns;
        }

        for (var t in columns) {
            let col = columns[t];
            query.select(this.#db.knex.raw(`${this.#db.table(table).__getSQL(alias, col, true)} as '${alias}.${col}'`))
        }
        query.leftJoin({ [alias]: table }, `${this.table}.${joinAttribute}`, `${alias}.${foreignJoinAttribute}`);

    }

}


/**
 * Criteria Builder (from scinario-core)
 * 
 * 
 */
class CriteriaBuilder {

    #db;

    constructor(db) {

        this.#db = db;

        this.criteriaMapping = {
            '=': 'where',
            '<': 'where',
            '>': 'where',
            '>=': 'where',
            '<=': 'where',
            in: 'whereIn',
            nin: 'whereNotIn',
            between: 'whereBetween',
            nbetween: 'whereNotBetween',
            like: 'whereLike',
            nlike: 'whereNotLike',
            '<>': 'whereNotEqual',
            null: 'whereNull',
            nnull: 'whereNotNull',
            raw: 'raw',
            // Special case
            inOrNull: 'inOrNull'
        };

        this.conditionTypes = ['AND', 'OR', 'AND NOT'];

        // if we use these operators, we need to add a "OR NULL" criteria as well
        this.needsOrNullOption = ['whereNotLike', 'whereNotIn', 'whereNotBetween'];
        this.negationMapping = {
            whereNotLike: 'whereLike',
            whereNotIn: 'whereIn',
            whereNotBetween: 'whereBetween',
        };

        this.aggregatorFunc = ['count', 'avg', 'sum', 'min', 'max'];
        // only these operations are allowed if an aggregator is "active"
        this.aggregatorOp = ['=', '<', '>', '<=', '>=', 'between', 'nbetween', '<>', 'nlike'];

    }


    /**
       * Convert a plain java object like
       * { a: "32", b: "345"}
       * 
       * to a criteria object:
       *
       *[{attrib:"a",op:"=",value:"32"},{attrib:"b", op:"=",value:"345"}]
       *
       *
       * @param {*} plainObject
       */
    fromPlainObjToCriteriaObj(plainObject, type) {

        var criteria = [];

        if (this.conditionTypes.indexOf(type) == -1) {
            log.warn('DB', `Condition could not be created. Type '${type}' is not a valid type. Use one of AND, OR, AND NOT or OR NOT`);
            return criteria;
        }

        // array ?! do NOT convert anything!
        if (plainObject.length !== undefined) return plainObject;

        // If there is a "condition" entry with "AND" or "OR"
        // and a rules: Array....then there is a high possibility of being a criteria object already
        if (plainObject.condition && (plainObject.condition == 'AND' || plainObject.condition == 'OR') && plainObject.rules) {
            // return it directly
            return plainObject;
        }

        // OR there is an "attrib" and an "op" already
        if (plainObject.attrib && plainObject.op) {
            return { condition: type, rules: [plainObject] };
        }

        for (var x in plainObject) {
            criteria.push({
                attrib: x,
                op: '=',
                value: plainObject[x],
            });

        }

        if (!type) return criteria;
        else return { condition: type, rules: criteria };


    }

    /**
       * Prepare the where part of a request
       *
       * In operations like fetch/update/delete there can be select-statements, this have criteria this match directly an attribute,
       * an 1:m table or even a n:m-target!
       *
       * The provided criteria is analysed and grouped table-wise. Then these criteria is
       * mixed into the corresponding select statements. If you have criteria of connected tables be sure
       * to
       * 1) do a right(!) join instead of the left join at "belongsToOne" relations
       * 2) first find the connected records (including the criteria) and reduce the records corresponding to the connected tables!
       *
       * With this you can reach n:m tables also e.g. if you have a group user scenario (n:m) you can search for
       * all core_Users with lastname "Peterson" this are in groups of a core_Groups with names like "XY"
       *
       * Example:
       * criteria:[{attrib:"lastname",op:"=",value:"Peterson"},{attrib:"groups.name", op:"like",value:"%XY%"}]
       *
       */
    addCriteriaToQuery(req, modelname, criteria, options, baseQueryObj) {

        // Collect the needed aliases...(if any)
        // These are names for relation tables that need to be joined....(everything that is NOT
        // an attribute of the model...)
        var neededAliases = {};

        // Empty criteria:
        if (Object.keys(criteria).length == 0) return [];

        var options = options || {};

        var command = 'andWhere';
        if (options.negateCriteriaQuery === true) command = 'whereNot';

        var that = this;
        // Add rights management to the base model too
        try {
            // add knex-sql function to build "andWhere" to the query
            baseQueryObj[command](function () {
                that.#buildRecursiveWhereCriteria(req, this, modelname, criteria, undefined, options, neededAliases);
            });
        } catch (e) {
            throw e;
        }

        // IMPORTANT: The SQL-Query needs to be converted to a string ONCE so that
        // the recursion is done ONCE to fetch the needed aliases!
        try {
            var string = baseQueryObj.toString();
        } catch (e) {

            // create a new error to know where we are calling this funciton!!!
            var newE = new Error();
            log.error("DB", newE, "CriteriaBuilder._addCriteriaToQuery");
        }

        return Object.keys(neededAliases);

    }



    /**
     * Validates a criteria object!
     * 
     */
    async validate(req, basemodel, criteria, options) {
        var c = structuredClone(criteria);
        await this.#validate(req, basemodel, c, options);
        return c;
    }

    #checkRuleFormat(rule) {

        var keys = Object.keys(rule).sort();
        // remove all things NOT allowed
        if (keys.length > 1) {
            keys = keys.filter((val) => {
                if (["condition", "rules", "attrib", "value", "op", "aggregator"].indexOf(val) === -1) {
                    delete rule[val]
                    return false;
                } else return true;
            })
        }

        var keysString = keys.join("_");

        if (keys.length === 1) {
            // it's a short rule like {"key":455}
            return "shortRule";
        } else if (keys.length === 2 && ["condition_rules"].indexOf(keysString) !== -1) {
            return "condition";
        } else if (keys.length === 2 && ["attrib_value"].indexOf(keysString) !== -1) {
            return "rule";
        } else if (keys.length === 2 && ["attrib_op"].indexOf(keysString) !== -1 && ["null", "nnull"].indexOf(rule.op) !== -1) {
            return "rule";
        } else if (keys.length === 3 && ["attrib_op_value"].indexOf(keysString) !== -1) {
            return "rule";
        } else if (keys.length === 4 && ["aggregator_attrib_op_value"].indexOf(keysString) !== -1) {
            return "aggregation";
        }
        return false;
    }

    #validate(req, basemodel, criteria, options) {

        // If an array check the rules in the object
        if (Array.isArray(criteria) === true) {
            for (var x in criteria) {
                criteria[x] = this.#validate(req, basemodel, criteria[x], options);
            }
        } else if (Object.keys(criteria).length > 0) {

            options = options || {};

            var format = this.#checkRuleFormat(criteria);
            if (!format) throw new Error('CriteriaFormatWrong', { vars: { rule: JSON.stringify(criteria), model: basemodel } });

            // what to validate
            switch (format) {

                case 'condition':
                    // make the condition uppercase string
                    criteria.condition = criteria.condition.toString().toUpperCase();
                    // and check
                    if (this.conditionTypes.indexOf(criteria.condition) === -1) throw new Error('CriteriaUnknownCondition', { vars: { condition: criteria.condition } });
                    // validate the rules
                    this.#validate(req, basemodel, criteria.rules, options);
                    break;

                case 'shortRule':
                    // convert to "long" format of a rule
                    // NO break so the "rule" code is run after this too
                    var key = Object.keys(criteria)[0];
                    var value = criteria[key];
                    criteria = { attrib: key, op: "=", value: value };

                case 'rule':

                    // check availability of "attrib" (by basemodel)
                    var hasAttribute = this.#db.hasAttribute(req, basemodel, criteria.attrib, { withoutRightCheck: true });
                    var isRelation = this.#db.isRelation(req, basemodel, criteria.attrib, undefined, { withoutRightCheck: true });

                    if (isRelation !== false) {
                        // check type of relation...we only allow for direct relation (hasOne,belongsToOne)
                        // others cannot be checked 
                        if (options.onlyDirectRelations === true) {
                            if (["belongsToOne", "hasOne"].indexOf(isRelation.relation) === -1) {
                                throw new Error("OnlyHasOneRelationsAllowedForCriteria", { vars: { modelname: basemodel, attribute: criteria.attrib } });
                            }
                        }
                        // check if the attribute has a DOT ... NO ... add the "id"
                        if (criteria.attrib.indexOf(".") === -1) criteria.attrib = criteria.attrib + ".id";

                    } else if (hasAttribute !== false) {

                        if (options.combineMetaObject === true) {
                            if (criteria.attrib.substring(0, 2) == "__") criteria.attrib = "__meta." + criteria.attrib;
                        }


                        // all ok
                    } else {
                        throw new Error("NoSuchAttributeForCriteria", { vars: { modelname: basemodel, attribute: criteria.attrib } });
                    }

                    // check "op"
                    if (criteria.op && this.criteriaMapping[criteria.op] === undefined) throw new Error('CriteriaUnknownOperator', { vars: { op: criteria.op } });
                    break;


                case 'aggregation':

                    // check "aggregator"


                    break;



            }

            return criteria;


        } else {
            log.error("DB", criteria, "Missformed criteira");
            throw new Error("CriteriaMissformed", { vars: { criteria } })
        }

    }




    /**
     * Helper function: checks if the <attribute> is contained in the criteria
     *
     * @param {*} attribute
     * @param {*} criteria
     * @param {*} condition
     * @param {*} pos
     * @returns
     */
    contains(attribute, criteria, condition, pos) {

        var condition = (typeof condition === "string") ? condition.toUpperCase() : 'AND';
        var pos = pos || 0;

        var hit = [];
        // Find an attribute in the criteria object...
        // Object or array?!
        // OBJECT: so check "condition" and go on recursive with the "rules"-part
        if (criteria[attribute] !== undefined) {
            hit = hit.concat({ attribute: attribute, pos: pos, condition: condition, op: '=', value: criteria[attribute] });
        } else if (criteria['attrib'] == attribute) {
            hit = hit.concat({ attribute: attribute, pos: pos, condition: condition, op: criteria.op || '=', value: criteria.value });
        } else {
            if (criteria.length !== undefined) {
                for (var x in criteria) {
                    if (criteria[x].attrib == attribute) hit = hit.concat({ attribute: attribute, pos: pos, condition: condition, value: criteria[x].value, op: criteria[x].op || '=' });
                    else if (criteria[x].condition) hit = hit.concat(this.contains(attribute, criteria[x].rules, criteria[x].condition, pos + 1));
                }
            } else {
                if (typeof criteria.condition === "string" && this.conditionTypes.indexOf(criteria.condition.toUpperCase()) !== -1) {
                    hit = hit.concat(this.contains(attribute, criteria.rules, criteria.condition, pos + 1));
                }
            }
        }
        return hit;
    }


    /**
     * Helper function: return all <attributes> used in the criteria object (e.g. for business rules)
     *
     * @param {*} attribute
     * @param {*} criteria
     * @param {*} condition
     * @param {*} pos
     * @returns
     */
    containedAttributes(criteria) {

        var attributes = [];
        criteria = [].concat(criteria);

        for (var x in criteria) {
            let c = criteria[x];
            if (c.rules) attributes = attributes.concat(this.containedAttributes(c.rules));
            else if (c.attrib) attributes.push(c.attrib);
        }
        return attributes;

    }


    combineConditions(cond1, type, cond2) {

        var rules = [];

        try {

            if (this.conditionTypes.indexOf(type) == -1) {
                log.warn('DB', `Conditions could not be combined. Type '${type}' is not a valid type. Use one of AND, OR, AND NOT or OR NOT`);
                return cond1;
            }

            // array.....
            if (cond1.length !== undefined) {
                rules = rules.concat(cond1);
            } else {
                // object....(check if it needs to be converted to a criteria object!)
                cond1 = this.fromPlainObjToCriteriaObj(cond1, 'AND');
                rules.push(cond1);
            }

            if (cond2.length !== undefined) {
                rules = rules.concat(cond2);
            } else {
                // object....(check if it needs to be converted to a criteria object!)
                cond2 = this.fromPlainObjToCriteriaObj(cond2, 'AND');
                rules.push(cond2);
            }

        } catch (e) {
            log.error("DB", { type, cond1, cond2, e }, 'Combine conditions error');
        }
        var ret = [{ condition: type, rules: rules }];
        return ret;

    }


    /**
       *
       * @param criteria
       * @param {*} type
       * @param {*} attribute
       * @param {*} op
       * @param {*} value
       */
    addCondition(criteria, type, attribute, op, value) {

        // type should be AND or OR
        if (this.conditionTypes.indexOf(type) == -1) {
            log.warn('DB', `Condition could not be added. Type '${type}' is not a valid type. Use one of AND, OR, AND NOT or OR NOT`);
            return criteria;
        }


        var rule = { attrib: attribute, op: op, value: value };

        if (Object.keys(criteria).length == 0 && criteria.length == 0) {
            criteria['condition'] = type;
            criteria['rules'] = [rule];
            return criteria;
        }

        // Check if the criteria is an array or an object

        if (typeof criteria === "object" && criteria !== null && !Array.isArray(criteria)) {
            // condition: "AND"
            if (criteria.condition == type) {
                // Just add to the existing rules of ADD
                criteria.rules.push(rule);
            } else {
                // WRAP another "and" or "or" around....
                var rules = [rule];
                criteria = { condition: type, rules: [rule, criteria] };
            }

        } else if (Array.isArray(criteria)) {
            // There is just a rule given...wrap it..
            var rules = [rule];
            for (var x in criteria) {
                rules.push(criteria[x]);
            }
            criteria = { condition: type, rules: rules };
        }

        return criteria;

    }


    #buildRecursiveWhereCriteria(req, obj, basemodel, whereObject, condition, options, neededAliases) {

        var that = this;

        if (Object.keys(whereObject).length == 0) return;


        // Only ONE direct rule with at least "attrib" and "op" or attrib and value
        if (whereObject.attrib !== undefined && (whereObject.op !== undefined || whereObject.value !== undefined)) {
            // Put it in an array :)
            whereObject = [whereObject];
        }

        // Object or array?!
        // OBJECT: so check "condition" and go on recursive with the "rules"-part
        if (whereObject.length == undefined) {

            if (whereObject.condition !== undefined && typeof whereObject.condition === "string" && this.conditionTypes.indexOf(whereObject.condition.toUpperCase()) !== -1) {
                // Be sure to use the UPPERCASE 'AND' (AND NOT) and 'OR'
                whereObject.condition = whereObject.condition.toUpperCase();

                if (whereObject.condition == 'AND' || whereObject.condition == 'AND NOT') var method = 'andWhere';
                else if (whereObject.condition == 'OR') var method = 'orWhere';

                obj[method](function () {
                    that.#buildRecursiveWhereCriteria(req, this, basemodel, whereObject.rules, whereObject.condition, options, neededAliases);
                });

            } else {

                // Maybe just a simple object ({id:2,modelname: 3}) than convert it to a valid criteria array
                if (whereObject instanceof Array === false) {
                    // convert ....
                    var criteria = [];
                    for (var x in whereObject) {

                        if (whereObject[x] === undefined) {

                            throw new Error('CriteriaUndefinedValueNotAllowed', { vars: [basemodel, x] });
                        }

                        criteria.push({ attrib: x, value: whereObject[x] });

                    }
                    // Try this again....
                    var condition = (condition || 'AND');
                    for (var x in criteria) {
                        // special case condition "AND NOT" the first rule is added via "AND"
                        // all the following via AND NOT...
                        if (condition == 'AND NOT' && x == 0) {
                            this.#setWhereRule(req, obj, basemodel, criteria[x], 'AND', options, neededAliases);
                        } else {
                            this.#setWhereRule(req, obj, basemodel, criteria[x], condition, options, neededAliases);
                        }
                    }

                }
            }
        } else {

            var condition = (condition || 'AND');

            for (var x in whereObject) {
                // special case condition "AND NOT" the first rule is added via "AND"
                // all the following via AND NOT...
                if (condition == 'AND NOT' && x == 0) {
                    this.#setWhereRule(req, obj, basemodel, whereObject[x], 'AND', options, neededAliases);
                } else {
                    this.#setWhereRule(req, obj, basemodel, whereObject[x], condition, options, neededAliases);
                }
            }
        }
    }


    /**
       * Set a whereRule to a query
       *
       *
       */
    #setWhereRule(req, queryObj, basemodel, rule, condition, options, neededAliases) {

        // Maybe an empty object as rule => "rule": {}
        // then we have nothing to do!
        if (Object.keys(rule).length == 0) return;

        var method = 'andWhere';
        var rawMethod = 'andWhereRaw';

        switch (condition) {
            case 'AND': method = 'andWhere'; rawMethod = 'andWhereRaw'; break;
            case 'OR': method = 'orWhere'; rawMethod = 'orWhereRaw'; break;
            case 'AND NOT': method = 'whereNot'; rawMethod = 'andWhereNotRaw'; break;
        }

        // check the "rule" format (before going further)
        // 1) either a {condition: "AND"|"OR", rules:[]}
        // 2) or direct {attrib:<>, value:<>} or {attrib:'', op:'', value:''}  or {attrib: "", aggregator:"", op:"", "value": }
        // 2) or direct {[key]:<value>}
        var FORMAT_OK = false;

        var keys = Object.keys(rule).sort();
        var keysString = keys.join("_");

        if (keys.length === 1) {
            FORMAT_OK = true;
        } else if (keys.length === 2 && ["condition_rules", "attrib_value"].indexOf(keysString) !== -1) {
            FORMAT_OK = true;
        } else if (keys.length === 2 && ["attrib_op"].indexOf(keysString) !== -1 && ["null", "nnull"].indexOf(rule.op) !== -1) {
            FORMAT_OK = true;
        } else if (keys.length === 3 && ["attrib_op_value"].indexOf(keysString) !== -1) {
            FORMAT_OK = true;
        } else if (keys.length === 4 && ["aggregator_attrib_op_value"].indexOf(keysString) !== -1) {
            FORMAT_OK = true;
        }
        if (FORMAT_OK === false) {
            throw new Error('CriteriaFormatWrong', { vars: { rule: JSON.stringify(rule), model: basemodel } });
        }

        // Maybe the configuration says that unknown attributes can be stored as
        // elements of the dynamic column
        var storeUnknownAttributesAsDynamicCol = Helper.getVar(req, 'scinario.clientObj.models.' + basemodel + '.storeUnknownAttributesAsDynamicCol', false);
        var useInstanceRights = Helper.getVar(req, 'scinario.liveConfig.' + basemodel + '.useInstanceRights', false);
        var dataTypes = Helper.getVar(req, 'scinario.clientObj.models.' + basemodel + '.attributes', {});

        var that = this;
        // more recursion?
        if (rule.condition && rule.rules) {
            queryObj[method](function () {
                that.#buildRecursiveWhereCriteria(req, this, basemodel, rule, undefined, options, neededAliases);
            });
            return;
        }
        // Check if SHORT-Version => {"attributeName":"value"};
        // => object has ONLY one KEY!
        if (Object.keys(rule).length === 1) {

            if (typeof rule === 'object' && Object.keys(rule).length > 0) {
                var attrib = Object.keys(rule)[0];
                var value = rule[attrib];
                rule['attrib'] = attrib;
                rule['value'] = value;
                // delete the attribute name (if NOT named "value" or "attrib")
                if (attrib !== 'value' && attrib !== 'attrib') delete rule[attrib];
            } else {
                log.info('DB', `QueryCriteria for ${basemodel} is missing an 'attrib' and 'value' attribute. Ignoring this condition. Rule was ` + JSON.stringify(rule));
                return;
            }
        }

        // allowed criteria:
        if (rule.op === undefined) rule.op = '=';

        if (rule.aggregator) {
            if (this.aggregatorFunc.indexOf(rule.aggregator) == -1) throw new Error('AggregatorNotAllowed', { vars: { agg: rule.aggregator, attribute: rule.attrib } });
            if (this.aggregatorOp.indexOf(rule.op) == -1) throw new Error('AggregatorOperationNotAllowed', { vars: { op: rule.op, attribute: rule.attrib } });
        } else {
            var op = this.criteriaMapping[rule.op];
            if (op == undefined) {
                throw new Error('CriteriaOperatorNotExisting', { vars: { criteria: rule.op, attribute: rule.attrib } });
            }
        }

        if (rule.attrib === undefined) {
            log.info('DB', `QueryCriteria for ${basemodel} is missing an 'attrib' attribute. Rule was ` + JSON.stringify(rule));
            throw new Error('QueryCriteriaMissingAttrib', { vars: [basemodel, rule] });
        }


        var value = rule.value;
        if (value === undefined && rule.op !== 'null' && rule.op !== 'nnull') {
            throw new Error('CriteriaUndefinedValueNotAllowed', { vars: [rule.attrib, rule] });
        }
        var modelname = basemodel;


        var dynamicCol = Helper.getVar(req, 'scinario.liveConfig.' + basemodel + '.dynamicCols.' + rule.attrib);
        if (dynamicCol && dynamicCol.type == 'boolean') {
            if (value == 'true' || value == true) value = 1;
            else value = 0;
        }

        var split = rule.attrib.split('.');


        /** ****************************************************************/
        /** **    Check the attribute type (direct/relation/keyRef)  *******/
        /** **    WITH RIGHT CHECK ON EACH USED ATTRIBTUE            *******/
        /** ****************************************************************/

        // The attrib is something like "owner.name"
        if (split.length == 2) {

        } else {
            var type = 'direct';
            var attrib = rule.attrib;

            var attributeType = this.#db.hasAttribute(req, basemodel, attrib, { checkMetaAttributes: true, withoutRightCheck: options.withoutRightCheck, getRestrictedInfo: true });


            // check if the attribute is existing and usable (and not restricted)
            if (attributeType === false || attributeType === '-restricted-') {

                if (storeUnknownAttributesAsDynamicCol == false || attributeType === '-restricted-') {
                    throw new Error('CriteriaNoSuchAttribute', { vars: [attrib, rule, basemodel, attributeType] });
                }
                // The attribute should be treated as "maybe" defined in the dynamic column __dcol
                // make it a raw attribute....
                attrib = req.scinario.clientObj.DB.raw(this.CORE.ORM.__getDynamicColSQL(req, attrib, basemodel, { cast: 'VARCHAR' }));

            } else {
                // Maybe something to validate in the query parameter
                var attributeData = (dataTypes[attrib] !== undefined) ? dataTypes[attrib] : { type: 'default' };

                switch (attributeData.type) {

                    // Enum
                    case 'enum':

                        let allowedOperators = ["whereIn", "whereNotIn", "whereNull", "whereNotNull", "where", "whereNotEqual"];

                        if (allowedOperators.indexOf(op) === -1) {
                            throw new Error('OnlyWhereCriteriaAllowed', { vars: { attrib: attrib, model: basemodel, ops: allowedOperators.join(",") } });
                        }
                        // internally we are switching from "whereIn"/"whereNotIn"
                        // to contains,notContains if MULTIPLE!!!
                        if (attributeData.many === true) {
                            if (op === "whereIn") op = "contains";
                            else if (op === "whereNotIn") op = "notContains";
                        }
                        value = [].concat(value);
                        break;

                    // Boolean behaviour
                    case 'boolean':
                        if (value && value.constructor.name == 'Array') {
                            for (var x in value) {
                                if (value[x] == 'true' || value[x] == '1' || value[x] == 1 || value[x] == true) value[x] = true;
                                else value[x] = false;
                            }
                        } else {
                            if (value == 'true' || value == '1' || value == 1 || value == true) value = true;
                            else value = false;
                        }
                        break;
                }
            }

        }


        // Create the query part for the subselect!
        if (type == 'direct') {
            if (rule.aggregator !== undefined) throw new Error('AggregatorForAttributeNotAllowed', { vars: { agg: rule.aggregator, attribute: rule.attrib } });
            // Add where part directly (no joins or else....)
            queryObj[method](function () {
                // Maybe a different table alias given
                var tableAlias = (options.tableAlias !== undefined) ? options.tableAlias : undefined;
                that.#addWherePart(req, this, modelname, tableAlias, rule, attrib, op, rule.op, value);
            });

        }


    }


    #addWherePart(req, queryObj, modelname, alias, rule, attrib, op, whereOp, value, usedInRelationQuery) {

        if (typeof attrib === 'object') {
            var attribute = attrib;

        } else {
            // mabye the "modelname" is just an alias and we need the "correct" definition...
            var tablename = Helper.getVar(req, 'scinario.clientObj.models.' + modelname + '.tablename', modelname);
            // Option: forSorting = true (dates are not touched....for comparisons etc)
            var attribute = this.#db.table(modelname).__getSQL(modelname, attrib, true, { useModelAlias: alias || tablename, withAs: false, forSorting: true });

            // validate the query value (for all attribute types!!!)
            value = this.#validateQueryValue(req, modelname, attrib, value, op);

            // escape correctly
            if (attribute === false) {
                if (alias) attribute = this.#db.escape(req, `${alias}.${attrib}`);
                else attribute = this.#db.escape(req, `${tablename}.${attrib}`);
            }
        }

        var that = this;
        // Check values before ANY sql statement is created (and send to database)
        // NO OBJECTS AS VALUES
        if (value && typeof value === 'object' && value.constructor.name === 'Object') throw new Error('CriteriaBuilderValueIsObject', { vars: [modelname, attrib, op, value] });
        // if ARRAY
        else if (value && typeof value === 'object' && value.constructor.name == 'Array') {
            // a single value cannot(!!) be an array or object
            for (var x in value) {
                if (typeof value[x] === 'object') throw new Error('CriteriaBuilderValueIsObject', { vars: [modelname, attrib, op, value[x]] });
            }
        }

        var that = this;

        queryObj.andWhere(function () {

            // If raw...just do it
            if (op == 'raw') {
                this.whereRaw(attribute + ' ' + value);
                return;
            }

            // .. else construct the raw statements.
            var where = '';

            if (op == 'where') {

                // Special case: the value is the javascript "null"
                // if so...change the operator to "whereNull"!!!!
                if (value === null) {
                    where = attribute + ' IS NULL';
                } else {
                    where = attribute + ' ' + whereOp + ' ? ';
                }
            } else if (op == 'whereIn' || op == 'inOrNull') {

                var placeholder = [];
                for (var x in value) {
                    placeholder.push('?');
                }

                if (placeholder.length == 0) {
                    where = attribute + ' IN(0)';
                } else {

                    // Boolean data type (then we need to check , if the value contains the FALSE option!)
                    var attributeType = Helper.getVar(req, 'scinario.clientObj.models.' + modelname + '.attributes.' + attrib + '.type', '');
                    if (attributeType == 'boolean') {

                        var containsTrue = false;
                        var containsFalse = false;
                        // check if the value "FALSE" is contained
                        for (var x in value) {
                            if (value[x] === true) containsTrue = true;
                            else if (value[x] === false) containsFalse = true;
                        }
                        if (containsTrue && containsFalse) {
                            where = `${attribute} IN(1) OR ${attribute} IN(0) OR ${attribute} IS NULL`;
                        } else if (containsTrue && !containsFalse) {
                            where = `${attribute} IN(1)`;
                        } else if (!containsTrue && containsFalse) {
                            where = `${attribute} IN(0) OR ${attribute} IS NULL`;
                        }
                        // set value to null so the WHERE is done RAW ;)
                        value = null;
                    } else {
                        // default behaviour with string, dates, whatever....
                        where = attribute + ' IN(' + placeholder.join(',') + ')';
                    }
                }
                // add special case
                if (op == 'inOrNull') where += ` OR ${attribute} IS NULL`;

            } else if (op == 'whereNotIn') {

                var placeholder = [];
                for (var x in value) {
                    placeholder.push('?');
                }
                if (placeholder.length == 0) {
                    where = attribute + ' NOT IN(0)';
                } else {
                    where = `${attribute} NOT IN(${placeholder.join(',')})`;
                }

            } else if (op == 'whereNotEqual') {
                where = attribute + ' <> ?';
            } else if (op == 'whereBetween') {
                where = attribute + ' BETWEEN ? AND ?';
            } else if (op == 'whereNotBetween') {
                where = attribute + ' NOT BETWEEN ? AND ?';
            } else if (op == 'whereLike') {
                where = attribute + ' like ?';
            } else if (op == 'whereNotLike') {
                where = `${attribute} NOT LIKE ?`;
            } else if (op == 'whereNull') {
                where = attribute + ' IS NULL';
            } else if (op == 'whereNotNull') {
                where = attribute + ' IS NOT NULL';
            }
            // special case for "enum" or "tags"
            else if (op === "contains") {

                // example output  = > (`test_issues`.`enum` LIKE '%"a"%' and `test_issues`.`enum` LIKE '%"b"%')
                var parts = [];
                for (var x in value) {
                    parts.push(`${attribute} LIKE '%"${value[x]}"%'`);
                }
                where = `(${parts.join(" AND ")})`;
                // remove the value to use the where as combined here!
                value = null;


            } else if (op === "notContains") {

                // example output  = > (`test_issues`.`enum` NOT LIKE '%"a"%' and `test_issues`.`enum` NOT LIKE '%"b"%')
                var parts = [];
                for (var x in value) {
                    parts.push(`${attribute} NOT LIKE '%"${value[x]}"%'`);
                }
                where = `(${parts.join(" OR ")})`;
                // remove the value to use the where as combined here!
                value = null;
            }

            // If the operation is one of the negating one and we are not in a
            // relation query criteria...add the OR IS NULL option
            if (that.needsOrNullOption.indexOf(op) !== -1 && usedInRelationQuery !== true) {
                where += ` OR ${attribute} IS NULL `;
            }

            // Now add it
            if (value !== null && ['whereNull', 'whereNotNull'].indexOf(op) === -1) {
                this.whereRaw(where, value);
            } else {
                this.whereRaw(where);
            }

        });

    }


    #addHavingPart(req, queryObj, modelname, alias, rule, attrib, op, whereOp, value) {

        // validate the query value
        value = this.#validateQueryValue(req, modelname, attrib, value, op);

        // get sql for the attribute...
        var attribute = this.#db.table(modelname).__getSQL(modelname, attrib, true, { useModelAlias: alias || modelname, withAs: false });

        // modelname + '.' + attrib;
        // console.log("===> having ",rule.aggregator, attribute, whereOp, value);
        switch (whereOp) {
            case '=': queryObj.havingRaw(rule.aggregator + '(' + attribute + ') = ?', [value]); break;
            case '>': queryObj.havingRaw(rule.aggregator + '(' + attribute + ') > ?', [value]); break;
            case '>=': queryObj.havingRaw(rule.aggregator + '(' + attribute + ') >= ?', [value]); break;
            case '<': queryObj.havingRaw(rule.aggregator + '(' + attribute + ') < ?', [value]); break;
            case '<=': queryObj.havingRaw(rule.aggregator + '(' + attribute + ') <= ?', [value]); break;
            case '<>': queryObj.havingRaw(rule.aggregator + '(' + attribute + ') <> ?', [value]); break;
            case 'between': queryObj.havingRaw(rule.aggregator + '(' + attribute + ') BETWEEN ? AND ?', [value[0], value[1]]); break;
            case 'nbetween': queryObj.havingRaw(rule.aggregator + '(' + attribute + ') NOT BETWEEN ? AND ?', [value[0], value[1]]); break;
        }
    }

    /**
     * MariaDB can compare anythin to anything, but Postgres cannot, so we
     * will validate the query input for the corresponding attribute here
     */
    #validateQueryValue(req, modelname, attribute, value, op) {

        if (value == undefined) return value;
        if (['raw', 'whereNull', 'whereNotNull'].indexOf(op) !== -1) return value;

        var attrib = Helper.getVar(req, 'scinario.clientObj.models.' + modelname + '.attributes.' + attribute, false);
        var dynCol = Helper.getVar(req, 'scinario.liveConfig.' + modelname + '.dynamicCols.' + attribute, false);

        var attrData = attrib || dynCol;
        if (attribute === 'id') attrData = { type: 'integer' };
        // Not a direct attribute?
        // Comparisons with other tables are integer (id) so we do not need any validation for that before
        // comparing them..
        if (attrData == false) return value;

        // check specific to the OPERATOR
        switch (op) {

            case 'whereIn':
            case 'whereNotIn':
            case 'inOrNull':
                if (Array.isArray(value) === false) throw new Error('CriteriaValueShouldBeAnArray', { vars: [attribute, op, value] });
                for (var x in value) {
                    value[x] = this.#validateDatabaseTypeData(req, attrData, attrData.type, attribute, value[x]);
                }
                break;
            case 'whereBetween':
            case 'whereNotBetween':
                if (Array.isArray(value) == false) throw new Error('CriteriaValueShouldBeAnArray', { vars: [attribute, op, value] });
                if (value.length !== 2) throw new Error('CriteriaValueShouldHaveTwoElements', { vars: [attribute, op, value] });

                value[0] = this.#validateDatabaseTypeData(req, attrData, attrData.type, attribute, value[0]);
                value[1] = this.#validateDatabaseTypeData(req, attrData, attrData.type, attribute, value[1]);
                break;
            // enums and tags
            case 'contains':
            case 'notContains':
                // leave the array as it is!!
                if (Array.isArray(value) == false) throw new Error('CriteriaValueShouldBeAnArray', { vars: [attribute, op, value] });
                break;
            default:
                value = this.#validateDatabaseTypeData(req, attrData, attrData.type, attribute, value);

        }

        return value;

    }

    #validateDatabaseTypeData(req, attrData, type, attribute, value) {
        return value;
    }


};




/**
 * Datenbank-Klasse
 * 
 */
const STATIC_PHYSICAL_ATTRIBUTES = ["id", "__version", "__validUntil", "__validFrom", "__createdAt", "__deletedAt", "__locked"];


class Database extends EventEmitter2 {

    wsh;
    #dbFile;
    #backupFolder;
    #tempFolder;
    #config;
    #tables;
    #adminTables;
    #knex;
    #softSecretEncryptionPwd;

    #pool;
    #hookTypes;
    CriteriaBuilder;


    constructor(config, wsh) {
        super({
            wildcard: true,       // enable namespaces/wildcards support
            delimiter: ':',       // namespace delimiter, default is '.'
            maxListeners: 100,     // optional: increase max listeners
            verboseMemoryLeak: true
        });

        this.wsh = wsh;

        var baseDir = config.baseDir;
        this.#dbFile = path.join(baseDir, config.dbName || "data.db");
        this.#backupFolder = path.join(baseDir, `backups`);
        this.#tempFolder = path.join(baseDir, `temp`);
        // structureClone will not work!
        this.#config = cloneDeep(config);

        this.CriteriaBuilder = new CriteriaBuilder(this);

        if (!process.env.SOFT_SECRET_ENCRYPTION_PWD) throw new Error("Environment needs: SOFT_SECRET_ENCRYPTION_PWD");
        this.#softSecretEncryptionPwd = process.env.SOFT_SECRET_ENCRYPTION_PWD;

        this.#hookTypes = ["onFetch", "beforeInsert", "afterInsert", "beforeUpdate", "afterUpdate", "beforeDelete", "afterDelete", "beforePrepareOutgoingData"];

    }


    // Tasks / Worker Pool
    setPool(pool) {
        this.#pool = pool;
    }
    async getLog(uuid) {
        return await this.#pool.getLog(uuid);
    }
    // end of pool functions    


    getConfig() {
        return this.#config;
    }

    get knex() {
        return this.#knex;
    }

    tables(table) {
        return this.#tables[table];
    }

    getSoftEncryptionPwd() {
        return this.#softSecretEncryptionPwd;
    }

    async init() {

        if (this.#config.create === false) {
            // check if the dbFile exists!
            var exists = await this.#fileExists(this.#dbFile);
            if(exists === false) throw new Error("DB-File not existing: "+this.#dbFile);
        }        

        this.#knex = require('knex')({
            client: 'better-sqlite3',
            connection: {
                filename: this.#dbFile
            },
            useNullAsDefault: true,
            pool: { min: 2, max: 10 }  // Increase max connections
        });


        this.#tables = {};
        this.#adminTables = [];

        for (var x in this.#config.tables) {
            // Check privileges (admin table?)
            if (this.#config.tables[x].adminTable === true) this.#adminTables.push(x);
            this.#loadTableDefinition(x, this.#config.tables[x]);
        }
        
        // autorefresh
        if(this.#config.autoRefresh !== false){
            log.info("DB",`Running automatic refresh of database structure for '${this.#dbFile}' (only additions)`);
            await this.refreshDatabaseStructure();
        }


    }


    async #fileExists(path, withInfo) {
        try {
            await fsp.access(path);

            if (withInfo === true) {
                const stats = await fsp.stat(path);
                if (stats.isFile()) return 'file';
                else if (stats.isDirectory()) return 'directory';
                else return 'other';
            }
            return true;  // File exists
        } catch (e) {
            return false; // File does not exist or no access
        }
    }



    escape(sql) {
        return this.#knex.raw(":sql:", { sql: sql }).toString();
    }

    hasAttribute() {
        return true;
    }
    isRelation() {
        return false;
    }


    getRelationTargets(table) {
        return this.#config.relationTargets[table];
    }


    #loadTableDefinition(name, config) {


        var hooksTemp = {};
        for (var x in this.#hookTypes) {
            let hookType = this.#hookTypes[x];
            if (this.#tables[name] && this.#tables[name][hook]) hooksTemp = this.#tables[name][hookType];
        }

        // set "id" as "title" if not set in columns!
        for (var x in config.columns) {
            if (config.columns[x].title === undefined || config.columns[x].title === "") config.columns[x].title = x;
        }

        // Physcial attributes ALWAYS 
        var physicalAttributes = [].concat(STATIC_PHYSICAL_ATTRIBUTES).concat(config.physicalAttributes);
        this.#tables[name] = new JsonTable(this, name, {
            columns: config.columns,
            physicalAttributes: physicalAttributes,
            idColumns: config.idColumns,
            defaultSort: config.defaultSort,
            unique: config.unique,
            updateEventWithData: config.updateEventWithData,
            relations: config.relations
        })

        for (var x in hooksTemp) {
            this.addHook(x, name, hooksTemp[x])
        }


    }


    isAdminTable(tablename) {
        if (this.#adminTables.indexOf(tablename) !== -1) return true;
        return false;
    }


    createPasswordHash(pwd) {

        var shasum = crypto.createHash('sha256')
        shasum.update(pwd);
        var pwd = shasum.digest('hex');
        return pwd;
    }



    table(tablename) {
        // knex query vorbereiten
        if (this.#tables[tablename] == undefined) throw new Error("NoSuchTableDefined:" + tablename);
        return this.#tables[tablename]
    }

    query(tablename, options) {

        // knex query vorbereiten
        if (this.#tables[tablename] == undefined) throw new Error("NoSuchTableDefined:" + tablename);
        return this.#tables[tablename].getFetchQuery(options);


    }


    // Simple HOOKs for models
    addHook(type, tablename, func) {

        try {
            if (this.#hookTypes.indexOf(type) === -1) throw new Error("NoSuchHookType:" + type);
            if (this.#tables[tablename] == undefined) throw new Error("NoSuchTableDefined:" + tablename);
            this.#tables[tablename][type] = func;
        } catch (e) {
            log.error("DB", e, `Add hook for ${tablename}`)
        }

    }

    // end of HOOKS

    /** Get params */
    async getParams(domain, key) {

        var query = this.query("parameters");
        if (domain) query.where("domain", domain);
        if (key) query.where("key", key);
        var param_records = await query;
        // if key (only one possible record)
        if (key) {
            if (param_records[0]) return param_records[0].value;
            else return false;
        }
        var params = {};
        for (var x in param_records) {
            params[param_records[x].key] = param_records[x].value;
        }
        return params;
    }


    async getSecret(req, domain, key) {
        var secrets = await this.table("secrets").fetch(req, { domain: domain, key: key }, { withEncryptedValues: true });
        if (secrets[0]) return secrets[0].value;
        else return false;
    }


    async refreshDatabaseStructure() {

        // physikalisches Erstellen der Tabelle!
        for (var x in this.#config.tables) {

            var tablename = x;
            var hasTable = await this.#knex.schema.hasTable(tablename);
            if (hasTable) {
                var toAdd = [];
                for (var y in this.#config.tables[x].physicalAttributes) {
                    let col = this.#config.tables[x].physicalAttributes[y];
                    var exists = await this.#knex.schema.hasColumn(tablename, col);
                    if (!exists) toAdd.push(col);
                }
                await this.#knex.schema.alterTable(tablename, (table) => {
                    for (var x in toAdd) {
                        let col = toAdd[x];
                        let conf = this.#config.tables[tablename].columns[col];
                        log.debug("DB", `Add column: ${tablename}.${col}`)
                        this.#addPhysicalColumn(table, col, conf);
                    }
                });
            } else {
                await this.__createTable(tablename);
                log.debug("DB", `Add table: ${tablename}`)
                await this.#knex.raw(`DROP TRIGGER IF EXISTS history_${tablename}`);
            }
        }
    }

    async drop() {

        // physikalisches Erstellen der Tabelle!
        for (var x in this.#config.tables) {

            var tablename = x;

            await this.#knex.schema.dropTableIfExists(tablename);
            await this.#knex.schema.dropTableIfExists(tablename + "_v");
            //console.log("Table dropped:", x);

            await this.__createTable(tablename);
            // console.log("Table created:", x);

        }
    }


    async __createTable(tablename, vc) {

        var conf = this.#config.tables[tablename];

        let createdTable = (!vc) ? tablename : tablename + "_v";

        // check that ALL "fk_hasOne" are physicalAttributes!
        for (var x in conf.columns) {
            if (conf.columns[x].type === "fk_hasOne" && conf.physicalAttributes.indexOf(x) === -1) {
                let error = `Column '${x}' in table '${tablename}' needs to be a physical attribute (it's an type 'fk_hasOne')!`;
                throw new Error(error);
            }
        }

        await this.#knex.schema.createTable(createdTable, (table) => {
            // ID-Spalte
            if (!vc) {
                // automatic pk
                table.increments('id').notNullable().unsigned();
            } else {
                table.integer('id').notNullable().unsigned();
            }
            // META DATA ATTRIBUTES
            //"__version"__validUntil","__validFrom","__createdAt","__deletedAt"
            table.integer("__version").notNullable().defaultTo(1);
            table.datetime("__validUntil").notNullable().defaultTo(this.#knex.raw('"9999-12-31 00:00:00.000"'));
            table.datetime("__validFrom").notNullable().defaultTo(this.#knex.raw('CURRENT_TIMESTAMP'));
            table.datetime("__createdAt").notNullable().defaultTo(this.#knex.raw('CURRENT_TIMESTAMP'));
            table.datetime("__deletedAt");

            // locked 
            table["boolean"]("__locked").defaultTo(false);

            // Add physical attribute
            for (var t in conf.physicalAttributes) {
                var col = conf.physicalAttributes[t];
                if (!conf.columns[col]) throw new Error(`Physikalische Spalte '${col}' in Tabelle '${tablename}' muss beschrieben werden!`)
                var colDef = conf.columns[col];
                this.#addPhysicalColumn(table, col, colDef);

            }
            // freie Feldwerte in einer JSON-Spalte auch immer möglich (als letzte Spalte)
            table.json("json");

        });// END OF TABNLE CREATION



        if (vc === true) {


            // If a vc table ... add the trigger!

            let insertIntoAttributes = ['id'];
            let values = ['OLD.id'];
            for (var a in conf.columns) {
                if (a === "id") continue;
                insertIntoAttributes.push(a);
                if (a == '__validUntil') values.push('new.__validFrom');
                else values.push('OLD.' + a);
            }
            /*
            CREATE TRIGGER history_server_types
                AFTER UPDATE ON server_types FOR EACH ROW
                WHEN OLD.__version <> new.__version
                BEGIN
                    INSERT INTO server_types_v (id, __createdAt, __validFrom, __locked, serverId, json)
                    VALUES (OLD.id, OLD.__createdAt, OLD.__validFrom, OLD.__locked, OLD.serverId, OLD.json)
                    ;              
                END;
            */

            var triggerSQL = `   
                CREATE TRIGGER history_${tablename}
                AFTER UPDATE ON ${tablename} FOR EACH ROW
                WHEN OLD.__version <> new.__version
                BEGIN                   
                    INSERT INTO ${tablename}_v (${insertIntoAttributes.join(', ')})
                            VALUES (${values.join(', ')});
                    
                END;
            `;
            //console.log(triggerSQL);
            await this.#knex.raw(triggerSQL);         

        }


    }

    #addPhysicalColumn(table, col, colDef) {



        if (["string", "text", "boolean"].indexOf(colDef.type) !== -1) {
            var colRef = table[colDef.type](col)
            if (colDef.default !== undefined) colRef.defaultTo(colDef.default);

        } else if (colDef.type === "json") {
            var colRef = table.text(col)
        } else if (colDef.type == "selection") {
            var colRef = table.text(col);

        } else if (colDef.type == "passwordSafe") {
            var colRef = table.text(col);
        } else if (colDef.type == "bashOutput") {
            var colRef = table.text(col);
        } else if (colDef.type == "password") {
            var colRef = table.string(col);
        } else if (colDef.type == "color") {
            var colRef = table.string(col);
        } else if (colDef.type == "datetime") {
            var colRef = table.datetime(col);

            switch (colDef.default) {
                case 'now': colRef.defaultTo(this.#knex.raw('CURRENT_TIMESTAMP')); break;
                default: "No default for:", colDef.default;
            }

        } else if (colDef.type == "date") {
            var colRef = table.date(col);
            switch (colDef.default) {
                case 'today': colRef.defaultTo(this.#knex.raw('CURRENT_DATE')); break;
                default: "No default for:", colDef.default;
            }

        } else if (colDef.type == "integer") {
            var colRef = table.integer(col);
            if (colDef.default !== undefined) colRef.defaultTo(colDef.default);

        } else if (colDef.type == "float") {
            var colRef = table.float(col);
            if (colDef.default !== undefined) colRef.defaultTo(colDef.default);
        }
        else if (colDef.type == "fk_hasOne") {
            if (colDef.table == undefined) throw new Error(`Physikalische Spalte '${col}' als Fremdschlüssel in Tabelle '${tablename}' (hasOne) benötigt Zieltabellangabe (table)!`)
            var ref = colDef.table + "." + (colDef.tableKeyId || "id");
            // no foreign key delete....will be done here in the database layer!!!
            // table.integer(col).unsigned().references(ref).onDelete('CASCADE');
            table.integer(col).unsigned();

        } else if (colDef.type == "fk_m2m") {
            if (colDef.table == undefined) throw new Error(`Physikalische Spalte '${col}' als Fremdschlüssel in Tabelle '${tablename}' (m2m) benötigt Zieltabellangabe (table)!`)
            var ref = colDef.table + "." + (colDef.tableKeyId || "id");
            table.string(col);
        } else {            
            log.error("DB", colDef, `No definition of type: ${col}`)
        }

    }


}




module.exports = async function (options = {}) {

    const { DB_CONFIG, DB_HOOKS_AND_FUNCTIONS } = require("../../dbConfig");

    // First load the base config
    var config = Object.assign({}, DB_CONFIG);
    config.relationTargets = {};

    for (var x in config.tables) {

        config.tables[x].relations = {};
        for (var t in config.tables[x].columns) {
            if (config.tables[x].columns[t].type === "fk_hasOne") {
                config.tables[x].relations[t] = config.tables[x].columns[t];
                if (config.relationTargets[config.tables[x].columns[t].table] === undefined) config.relationTargets[config.tables[x].columns[t].table] = [];
                config.relationTargets[config.tables[x].columns[t].table].push({ table: x, col: t });
            }
        }
        // if physicalAttributes is set to "*"
        if (config.tables[x].physicalAttributes === "*") {
            config.tables[x].physicalAttributes = Object.keys(config.tables[x].columns);
        }
        // physikalische Spalten
        config.tables[x].columns["id"] = { title: "id", type: "integer", colWidth: '40px' };
        config.tables[x].columns["__version"] = { title: "Version", type: "integer", colWidth: '40px' };
        config.tables[x].columns["__validUntil"] = { title: "Gültig bis", type: "datetime", colWidth: '140px' };
        config.tables[x].columns["__validFrom"] = { title: "Gültig seit", type: "datetime", colWidth: '140px' };
        config.tables[x].columns["__createdAt"] = { title: "Erstellt", type: "datetime", colWidth: '140px' };
        config.tables[x].columns["__locked"] = { title: "Gesperrt", type: "boolean", colWidth: '40px' };
    }

    // Now create a new Database object
    // set dbName from parameter!
    config.dbName = options.dbName || "database.db";
    config.baseDir = process.env.F_adminData;
    config.create = (options.create === false) ? false : true;
    config.autoRefresh = (options.autoRefresh === false) ? false: true;


    var wsh = options.wsh;

    var db = new Database(config, wsh);
    await db.init();

    // Extensions?
    if (DB_HOOKS_AND_FUNCTIONS) await DB_HOOKS_AND_FUNCTIONS(db);

    return db;



}