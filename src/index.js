require('dotenv').config();
const express = require('express');
const { connectPostgres, getSequelize } = require('./config/database');
const { connectMongo } = require('./config/mongodb');
const { startSyncWorker } = require('./workers/syncWorker');
const { getCBStatus } = require('./services/smsService');

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), circuitBreaker: getCBStatus() });
});

const startServer = async () => {
  try {
    await connectPostgres();

    const sequelize = getSequelize();
    const NotificationCmd = require('./models/NotificationCmd')(sequelize);
    await sequelize.sync({ alter: true });
    console.log('[Sequelize] Tablas sincronizadas.');

    await connectMongo();

    const { router: notificationsRouter, setNotificationCmd } = require('./routes/notifications');
    setNotificationCmd(NotificationCmd);
    app.use('/api/notifications', notificationsRouter);

    startSyncWorker(NotificationCmd);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`[Server] Banco Dhabi OTP corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Error al iniciar:', error.message);
    process.exit(1);
  }
};

startServer();