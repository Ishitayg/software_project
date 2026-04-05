const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.PGDATABASE || 'icoms',
  process.env.PGUSER || 'postgres',
  process.env.PGPASSWORD || 'postgres',
  {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connected successfully.');
    
    // Sync all models - force: true creates fresh tables (use once), then change to false
    await sequelize.sync({ force: false});
    console.log('✅ Database models synchronized.');
    
    return sequelize;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB, DataTypes };
