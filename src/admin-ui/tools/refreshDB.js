

// Run the drop!
(async function main(){
     
  const db = await require("../backend/libs/data/Database")("tenant-cc.db");
  await db.refreshDatabaseStructure();
  process.exit();
})()