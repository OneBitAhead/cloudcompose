

// Run the drop!
(async function main(){

  const db = await require("../backend/libs/data/Database")();

  await db.drop();
  process.exit();
})()