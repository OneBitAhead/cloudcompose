
import knex from "knex";
import statements from './wikijs.statements.mjs';
import bcrypt from 'bcryptjs';


const getConnection = async function( config ){

    try {

        // Create the connection
        const connection = knex({
            client: 'mysql2',
            connection: {
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password,
                database: config.database
            }
            });

        return connection

    } catch(e){
        return e
    }

}

const replacePlaceholdersInStatement = function( statement, replacements ){
    
    for (const [key, value] of Object.entries(replacements||{})) {
        statement = statement.replaceAll(`{{${key}}}`, value);
    }
    if(statement.includes('{{')) console.warn('LEFTOVER REPLACEMENT', statement);
    return statement;
}

const runInitSQL = async function( constants ) {

    let connection = await getConnection( constants.db || {} )

    // console.log('connection', connection);


    // Open transaction
    const trx = await connection.transaction();

    try {

        // Run all statements 
        for (const statement of statements) {
            // Update {{variables}} in statement
            let replacedStatement = replacePlaceholdersInStatement( statement, constants.replacements );
            // Query the database

            var result = await connection.raw(replacedStatement).transacting(trx)
        }
        
        // Commit transaction
        await trx.commit();

    } catch(e) {

        console.log('error', e)

        // Rollback transaction
        await trx.rollback();
        return e

    } finally {

        await trx.executionPromise; // wait for transaction to finish (success/fail)
        await connection.destroy();

    }

}




const createPwd = async function(password){

    let saltRounds = 12;
    
    return new Promise((resolve, reject)=>{
        bcrypt.genSalt(saltRounds, (err, salt) => {
            if (err) return reject(err);
            bcrypt.hash(password, salt, (err, hash) => {
                if (err) return reject(err);
                resolve(hash);                
            });
        })
    });    
}

const upsertUsers = async function( constants, users ){

    let connection = await getConnection( constants.db || {} )

    // Open transaction
    const trx = await connection.transaction();

    try {

        // Run all statements 
        for (const user of users) {

            console.log(users);


            var hashedPassword = await createPwd(user.local_app_password);
            console.log(hashedPassword);


            try{

            // Update {{variables}} in statement

            let name = user.hasOwnProperty('firstname') ? [user.firstname || '', user.lastname || ''].join(' ') : user.email;
            if(name.trim() === '') name = user.email;
            let now = (new Date()).toISOString();

            var result = await connection.table('users')
                .insert({ 
                    email: user.email, 
                    name: name , 
                    providerKey: "Local",
                    password: hashedPassword,
                    isActive: 1, 
                    isVerified: 1, 
                    mustChangePwd: 0,
                    createdAt: now,
                    updatedAt: now,
                })
                .onConflict( ['email', 'providerKey'])
                .merge()
                .transacting(trx);

            // Assign user to admin or user group
            let groupId = user.role === 'admin' ? 1 : 3;

            // Remove all permissions
            await connection.table('userGroups').where("userId", result[0]).del().transacting(trx);
            await connection.table('userGroups').insert({ userId: result[0], groupId: groupId}).transacting(trx);
            }catch(e){
                console.log(e);
            }

        }
        
        // Commit transaction
        await trx.commit();

    } catch(e) {

        console.log('error', e)

        // Rollback transaction
        await trx.rollback();
        return e

    } finally {

        await trx.executionPromise; // wait for transaction to finish (success/fail)
        await connection.destroy();

    }

}


const deleteUsers = async function( constants, users ){

     let connection = await getConnection( constants.db || {} )

     // Open transaction
    const trx = await connection.transaction();

     try {

        // Run all statements 
        for (const user of users) { 

            // Remove userGroups entry
            let userInWiki = await connection.table('users')
                .where('providerKey', "Local" )
                .where('email', user.email)
                .select("*");

            if(userInWiki[0]){

                // Remove userGroups entry
                await connection.table('userGroups').where("userId", userInWiki[0].id).transacting(trx).del();

                // Remove user entry
                await connection.table('users').where("id", userInWiki[0].id).transacting(trx).del();
            }

        }
        
        // Commit transaction
        await trx.commit();
    
    } catch(e) {

        console.log('error', e)

        // Rollback transaction
        await trx.rollback();
        return e

    } finally {

        await trx.executionPromise; // wait for transaction to finish (success/fail)
        await connection.destroy();

    }

}


const fn = {
  runInitSQL,
  upsertUsers,
  deleteUsers
};

export default fn;