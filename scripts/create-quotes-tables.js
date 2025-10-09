require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function createQuotesTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('Creating quotes tables...');

    // Drop existing tables if they exist (in reverse order due to foreign keys)
    await connection.execute(`DROP TABLE IF EXISTS quote_expenses`);
    console.log('✓ Dropped old quote_expenses table (if existed)');

    await connection.execute(`DROP TABLE IF EXISTS quote_days`);
    console.log('✓ Dropped old quote_days table (if existed)');

    await connection.execute(`DROP TABLE IF EXISTS quotes`);
    console.log('✓ Dropped old quotes table (if existed)');

    // Main quotes table
    await connection.execute(`
      CREATE TABLE quotes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        quote_name VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        tour_type ENUM('SIC', 'Private') NOT NULL,
        pax INT NOT NULL,
        markup DECIMAL(10, 2) NOT NULL DEFAULT 0,
        tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
        transport_pricing_mode ENUM('total', 'vehicle') NOT NULL DEFAULT 'total',
        pricing_table LONGTEXT NULL,
        itinerary_data LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_quote_name (quote_name),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✓ Created quotes table');

    // Quote days table
    await connection.execute(`
      CREATE TABLE quote_days (
        id INT PRIMARY KEY AUTO_INCREMENT,
        quote_id INT NOT NULL,
        day_number INT NOT NULL,
        date DATE NOT NULL,
        FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
        INDEX idx_quote_id (quote_id)
      )
    `);
    console.log('✓ Created quote_days table');

    // Quote expenses table
    await connection.execute(`
      CREATE TABLE quote_expenses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        quote_day_id INT NOT NULL,
        category VARCHAR(100) NOT NULL,
        hotel_category VARCHAR(100),
        location VARCHAR(255),
        description TEXT,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        single_supplement DECIMAL(10, 2),
        child_0to2 DECIMAL(10, 2),
        child_3to5 DECIMAL(10, 2),
        child_6to11 DECIMAL(10, 2),
        vehicle_count INT,
        price_per_vehicle DECIMAL(10, 2),
        FOREIGN KEY (quote_day_id) REFERENCES quote_days(id) ON DELETE CASCADE,
        INDEX idx_quote_day_id (quote_day_id),
        INDEX idx_category (category),
        INDEX idx_location (location)
      )
    `);
    console.log('✓ Created quote_expenses table');

    console.log('\n✅ All tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createQuotesTables().catch(console.error);
