const express = require('express');
const router = express.Router();
const NotificationRead = require('../models/NotificationRead');
const { sendOTP, getCBStatus } = require('../services/smsService');
const aldeamo = require('../services/aldeamoService');

let NotificationCmd;
const setNotificationCmd = (model) => { NotificationCmd = model; };

router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'El campo phone es requerido' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    const smsResult = await sendOTP({ phone, otp });
    const notification = await NotificationCmd.create({
      phone, otp,
      provider: smsResult.provider,
      status: smsResult.usedFallback ? 'fallback_sent' : 'sent',
      synced: false,
      metadata: {
        messageId: smsResult.messageId,
        usedFallback: smsResult.usedFallback,
        circuitBreakerState: smsResult.circuitBreakerState,
        sid: smsResult.sid || null
      }
    });
    res.status(201).json({
      success: true, notificationId: notification.id, phone,
      provider: smsResult.provider, usedFallback: smsResult.usedFallback,
      circuitBreakerState: smsResult.circuitBreakerState,
      message: 'OTP enviado y guardado en PostgreSQL. Pendiente de sync a MongoDB.'
    });
  } catch (error) {
    console.error('[Route] Error enviando OTP:', error.message);
    res.status(500).json({ success: false, error: error.message, circuitBreakerState: getCBStatus().state });
  }
});

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const notifications = await NotificationRead.find({}).sort({ originalCreatedAt: -1 }).limit(limit);
    res.json({ source: 'MongoDB (Query Side)', count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/phone/:phone', async (req, res) => {
  try {
    const notifications = await NotificationRead.find({ phone: req.params.phone }).sort({ originalCreatedAt: -1 });
    res.json({ source: 'MongoDB (Query Side)', phone: req.params.phone, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/circuit-breaker', (req, res) => res.json(getCBStatus()));

router.post('/simulate-failure', (req, res) => {
  const { enable } = req.body;
  aldeamo.setForceFailure(enable === true || enable === 'true');
  res.json({
    message: `Fallo de Aldeamo ${aldeamo.isForceFailure() ? 'ACTIVADO' : 'DESACTIVADO'}`,
    aldeamoForceFailure: aldeamo.isForceFailure(),
    circuitBreaker: getCBStatus()
  });
});

module.exports = { router, setNotificationCmd };