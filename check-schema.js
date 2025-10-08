const mysql = require('mysql2/promise');

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: '93.113.96.11',
    user: 'fatihtunali',
    password: 'Dlr235672.-Yt',
    database: 'pricing',
    port: 3306
  });

  console.log('Connected to database\n');

  try {
    // Check hotels table
    console.log('=== HOTELS TABLE ===');
    const [hotelsSchema] = await connection.query('DESCRIBE hotels');
    console.table(hotelsSchema);

    // Check meals table
    console.log('\n=== MEALS TABLE ===');
    const [mealsSchema] = await connection.query('DESCRIBE meals');
    console.table(mealsSchema);

    // Check sic_tours table
    console.log('\n=== SIC_TOURS TABLE ===');
    const [sicToursSchema] = await connection.query('DESCRIBE sic_tours');
    console.table(sicToursSchema);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkSchema().catch(console.error);
