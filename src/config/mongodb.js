require('dotenv').config();
const mongoose = require('mongoose');

const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[MongoDB] Conexion establecida correctamente.');
  } catch (error) {
    console.error('[MongoDB] Error de conexion:', error.message);
    process.exit(1);
  }
};

// Manejar eventos de conexion
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Desconectado.');
});

module.exports = { connectMongo };
