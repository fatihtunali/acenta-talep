const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: '93.113.96.11',
    user: 'fatihtunali',
    password: 'Dlr235672.-Yt',
    database: 'pricing',
    port: 3306,
    multipleStatements: true
  });

  console.log('Connected to database');

  try {
    // Run hotels migration
    console.log('\n=== Running hotels restructure migration ===');
    const hotelsSql = fs.readFileSync(path.join(__dirname, 'migrations', 'restructure_hotels.sql'), 'utf8');
    await connection.query(hotelsSql);
    console.log('✓ Hotels migration completed successfully');

    // Run restaurants migration
    console.log('\n=== Running restaurants restructure migration ===');
    const restaurantsSql = fs.readFileSync(path.join(__dirname, 'migrations', 'restructure_restaurants.sql'), 'utf8');
    await connection.query(restaurantsSql);
    console.log('✓ Restaurants migration completed successfully');

    // Run SIC tours migration
    console.log('\n=== Running SIC tours restructure migration ===');
    const sicToursSql = fs.readFileSync(path.join(__dirname, 'migrations', 'restructure_sic_tours.sql'), 'utf8');
    await connection.query(sicToursSql);
    console.log('✓ SIC tours migration completed successfully');

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigrations().catch(console.error);
