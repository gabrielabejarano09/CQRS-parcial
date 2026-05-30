const { Sequelize } = require('sequelize');

let sequelize;

const connectPostgres = async () => {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      dialect: 'postgres',
      logging: false,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
    }
  );

  try {
    await sequelize.authenticate();
    console.log('[PostgreSQL] Conexion establecida correctamente.');
  } catch (error) {
    console.error('[PostgreSQL] Error de conexion:', error.message);
    process.exit(1);
  }
};

const getSequelize = () => sequelize;

module.exports = { connectPostgres, getSequelize };