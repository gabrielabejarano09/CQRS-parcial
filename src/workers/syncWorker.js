const NotificationRead = require('../models/NotificationRead');

let syncInterval = null;
let isSyncing = false;

const startSyncWorker = (NotificationCmd) => {
  const syncPendingNotifications = async () => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      const pending = await NotificationCmd.findAll({ where: { synced: false }, limit: 100 });
      if (pending.length === 0) return;
      console.log(`[SyncWorker] Sincronizando ${pending.length} notificacion(es) SQL -> MongoDB`);
      for (const notification of pending) {
        try {
          await NotificationRead.findOneAndUpdate(
            { sqlId: notification.id },
            {
              sqlId: notification.id, phone: notification.phone,
              otp: notification.otp, provider: notification.provider,
              status: notification.status, metadata: notification.metadata,
              syncedAt: new Date(), originalCreatedAt: notification.createdAt
            },
            { upsert: true, new: true }
          );
          await notification.update({ synced: true });
          console.log(`[SyncWorker] Sincronizado: ${notification.id}`);
        } catch (itemError) {
          console.error(`[SyncWorker] Error sincronizando ${notification.id}:`, itemError.message);
        }
      }
    } catch (error) {
      console.error('[SyncWorker] Error general:', error.message);
    } finally {
      isSyncing = false;
    }
  };

  const interval = parseInt(process.env.SYNC_INTERVAL_MS) || 5000;
  console.log(`[SyncWorker] Iniciado. Sincronizando cada ${interval / 1000}s`);
  syncPendingNotifications();
  syncInterval = setInterval(syncPendingNotifications, interval);
};

const stopSyncWorker = () => {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
};

module.exports = { startSyncWorker, stopSyncWorker };