const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  let connection;

  try {
    // Connect to MySQL server
    connection = await mysql.createConnection({
      host: '93.113.96.11',
      user: 'fatihtunali',
      password: 'Dlr235672.-Yt',
      port: 3306
    });

    console.log('Connected to MySQL server');

    // Create database if not exists
    await connection.query('CREATE DATABASE IF NOT EXISTS pricing');
    console.log('Database "pricing" created or already exists');

    // Use the database
    await connection.query('USE pricing');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "users" created');

    // Create hotels table (for future autocomplete)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS hotels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        price_per_person DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "hotels" created');

    // Create activities table (for future autocomplete)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        price_per_person DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "activities" created');

    // Create quotes table (to save pricing calculations)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        quote_name VARCHAR(255),
        pax INT NOT NULL,
        total_per_person DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        components JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('Table "quotes" created');

    // Hash the password
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Insert admin user
    await connection.query(`
      INSERT INTO users (email, password, name, role)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      password = VALUES(password),
      name = VALUES(name),
      role = VALUES(role)
    `, ['fatihtunali@gmail.com', hashedPassword, 'Fatih Tunali', 'admin']);

    console.log('\n✅ Database setup complete!');
    console.log('Admin user created:');
    console.log('Email: fatihtunali@gmail.com');
    console.log('Password: 123456');

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
