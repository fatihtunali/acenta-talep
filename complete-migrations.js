const mysql = require('mysql2/promise');

async function completeMigrations() {
  const connection = await mysql.createConnection({
    host: '93.113.96.11',
    user: 'fatihtunali',
    password: 'Dlr235672.-Yt',
    database: 'pricing',
    port: 3306,
    multipleStatements: true
  });

  console.log('Connected to database\n');

  try {
    // Check and clean up hotels_old table
    const [tables] = await connection.query("SHOW TABLES LIKE 'hotels_old'");
    if (tables.length > 0) {
      console.log('=== Cleaning up hotels_old table ===');
      await connection.query('DROP TABLE hotels_old');
      console.log('✓ Dropped hotels_old table');
    } else {
      console.log('✓ Hotels migration already complete');
    }

    // Check if restaurants table exists
    const [restaurantsTables] = await connection.query("SHOW TABLES LIKE 'restaurants'");
    if (restaurantsTables.length === 0) {
      console.log('\n=== Running restaurants restructure migration ===');

      // Check if meals table exists first
      const [mealsTables] = await connection.query("SHOW TABLES LIKE 'meals'");
      if (mealsTables.length > 0) {
        await connection.query(`
          RENAME TABLE meals TO meals_old;

          CREATE TABLE restaurants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            city VARCHAR(255) NOT NULL,
            restaurant_name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_city (city),
            INDEX idx_user_city (user_id, city),
            INDEX idx_restaurant_name (restaurant_name),
            UNIQUE KEY unique_user_restaurant (user_id, city, restaurant_name)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

          CREATE TABLE restaurant_menu_pricing (
            id INT AUTO_INCREMENT PRIMARY KEY,
            restaurant_id INT NOT NULL,
            menu_option VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            start_date DATE NULL,
            end_date DATE NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
            INDEX idx_menu_option (menu_option),
            INDEX idx_dates (start_date, end_date),
            INDEX idx_restaurant_id (restaurant_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

          INSERT INTO restaurants (user_id, city, restaurant_name, created_at)
          SELECT DISTINCT user_id, city, restaurant_name, MIN(created_at)
          FROM meals_old
          GROUP BY user_id, city, restaurant_name;

          INSERT INTO restaurant_menu_pricing (restaurant_id, menu_option, price, created_at)
          SELECT
            r.id,
            mo.menu_option,
            mo.price,
            mo.created_at
          FROM meals_old mo
          JOIN restaurants r ON r.user_id = mo.user_id
            AND r.city = mo.city
            AND r.restaurant_name = mo.restaurant_name;

          DROP TABLE meals_old;
        `);
        console.log('✓ Restaurants migration completed successfully');
      } else {
        console.log('⚠ meals table does not exist, creating empty restaurants structure');
        await connection.query(`
          CREATE TABLE restaurants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            city VARCHAR(255) NOT NULL,
            restaurant_name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_city (city),
            INDEX idx_user_city (user_id, city),
            INDEX idx_restaurant_name (restaurant_name),
            UNIQUE KEY unique_user_restaurant (user_id, city, restaurant_name)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

          CREATE TABLE restaurant_menu_pricing (
            id INT AUTO_INCREMENT PRIMARY KEY,
            restaurant_id INT NOT NULL,
            menu_option VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            start_date DATE NULL,
            end_date DATE NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
            INDEX idx_menu_option (menu_option),
            INDEX idx_dates (start_date, end_date),
            INDEX idx_restaurant_id (restaurant_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✓ Empty restaurants structure created');
      }
    } else {
      console.log('\n✓ Restaurants migration already complete');
    }

    // Check if sic_tours needs restructuring
    const [sicToursCheck] = await connection.query("SHOW TABLES LIKE 'sic_tours'");
    if (sicToursCheck.length > 0) {
      // Check if it has the old structure (with pricing columns)
      const [sicToursColumns] = await connection.query("SHOW COLUMNS FROM sic_tours LIKE 'pp_dbl_rate'");

      if (sicToursColumns.length > 0) {
        console.log('\n=== Running SIC tours restructure migration ===');
        await connection.query(`
          RENAME TABLE sic_tours TO sic_tours_old;

          CREATE TABLE sic_tours (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            city VARCHAR(255) NOT NULL,
            tour_name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_city (city),
            INDEX idx_user_city (user_id, city),
            INDEX idx_tour_name (tour_name),
            UNIQUE KEY unique_user_tour (user_id, city, tour_name)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

          CREATE TABLE sic_tour_pricing (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tour_id INT NOT NULL,
            start_date DATE NULL,
            end_date DATE NULL,
            pp_dbl_rate DECIMAL(10, 2) NOT NULL,
            single_supplement DECIMAL(10, 2) NULL,
            child_0to2 DECIMAL(10, 2) NULL,
            child_3to5 DECIMAL(10, 2) NULL,
            child_6to11 DECIMAL(10, 2) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (tour_id) REFERENCES sic_tours(id) ON DELETE CASCADE,
            INDEX idx_dates (start_date, end_date),
            INDEX idx_tour_id (tour_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

          INSERT INTO sic_tours (user_id, city, tour_name, created_at)
          SELECT DISTINCT user_id, city, tour_name, MIN(created_at)
          FROM sic_tours_old
          GROUP BY user_id, city, tour_name;

          INSERT INTO sic_tour_pricing (tour_id, start_date, end_date, pp_dbl_rate, single_supplement, child_0to2, child_3to5, child_6to11, created_at)
          SELECT
            st.id,
            sto.start_date,
            sto.end_date,
            sto.pp_dbl_rate,
            sto.single_supplement,
            sto.child_0to2,
            sto.child_3to5,
            sto.child_6to11,
            sto.created_at
          FROM sic_tours_old sto
          JOIN sic_tours st ON st.user_id = sto.user_id
            AND st.city = sto.city
            AND st.tour_name = sto.tour_name;

          DROP TABLE sic_tours_old;
        `);
        console.log('✓ SIC tours migration completed successfully');
      } else {
        console.log('\n✓ SIC tours migration already complete');
      }
    } else {
      console.log('\n⚠ sic_tours table does not exist, creating empty structure');
      await connection.query(`
        CREATE TABLE sic_tours (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          city VARCHAR(255) NOT NULL,
          tour_name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_city (city),
          INDEX idx_user_city (user_id, city),
          INDEX idx_tour_name (tour_name),
          UNIQUE KEY unique_user_tour (user_id, city, tour_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE sic_tour_pricing (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tour_id INT NOT NULL,
          start_date DATE NULL,
          end_date DATE NULL,
          pp_dbl_rate DECIMAL(10, 2) NOT NULL,
          single_supplement DECIMAL(10, 2) NULL,
          child_0to2 DECIMAL(10, 2) NULL,
          child_3to5 DECIMAL(10, 2) NULL,
          child_6to11 DECIMAL(10, 2) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (tour_id) REFERENCES sic_tours(id) ON DELETE CASCADE,
          INDEX idx_dates (start_date, end_date),
          INDEX idx_tour_id (tour_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('✓ Empty SIC tours structure created');
    }

    console.log('\n✅ All migrations completed successfully!');

    // Show final table list
    console.log('\n=== Final table structure ===');
    const [finalTables] = await connection.query('SHOW TABLES');
    console.table(finalTables);

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error(error);
    throw error;
  } finally {
    await connection.end();
  }
}

completeMigrations().catch(console.error);
