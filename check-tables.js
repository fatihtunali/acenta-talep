const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: '93.113.96.11',
    user: 'fatihtunali',
    password: 'Dlr235672.-Yt',
    database: 'pricing',
    port: 3306
  });

  console.log('Connected to database\n');

  try {
    // Check all tables
    console.log('=== ALL TABLES IN DATABASE ===');
    const [tables] = await connection.query('SHOW TABLES');
    console.table(tables);

    // Check if hotel_pricing exists
    const tableName = tables.find(t => Object.values(t)[0] === 'hotel_pricing');
    if (tableName) {
      console.log('\n=== HOTEL_PRICING TABLE ===');
      const [hotelPricingSchema] = await connection.query('DESCRIBE hotel_pricing');
      console.table(hotelPricingSchema);
    }

    // Check if restaurants exists
    const restaurantsTable = tables.find(t => Object.values(t)[0] === 'restaurants');
    if (restaurantsTable) {
      console.log('\n=== RESTAURANTS TABLE ===');
      const [restaurantsSchema] = await connection.query('DESCRIBE restaurants');
      console.table(restaurantsSchema);
    }

    // Check if restaurant_menu_pricing exists
    const menuTable = tables.find(t => Object.values(t)[0] === 'restaurant_menu_pricing');
    if (menuTable) {
      console.log('\n=== RESTAURANT_MENU_PRICING TABLE ===');
      const [menuSchema] = await connection.query('DESCRIBE restaurant_menu_pricing');
      console.table(menuSchema);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkTables().catch(console.error);
