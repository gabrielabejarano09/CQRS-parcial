const mongoose = require('mongoose');

const notificationReadSchema = new mongoose.Schema({
  // Referencia al registro original en PostgreSQL
  sqlId: { type: String, required: true, unique: true, index: true },
  phone: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  provider: { type: String, required: true },
  status: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Marca de tiempo de cuando fue sincronizado desde SQL
  syncedAt: { type: Date, default: Date.now },
  // Timestamps del registro original en SQL
  originalCreatedAt: { type: Date }
}, {
  collection: 'notifications_read',
  timestamps: true
});

// Indice compuesto para consultas frecuentes
notificationReadSchema.index({ phone: 1, originalCreatedAt: -1 });

const NotificationRead = mongoose.model('NotificationRead', notificationReadSchema);

module.exports = NotificationRead;
