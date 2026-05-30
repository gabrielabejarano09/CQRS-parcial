
const sendSMS = async ({ phone, message }) => {
  // Simular latencia de red (150-400ms)
  await new Promise(r => setTimeout(r, 150 + Math.random() * 250));

  // Twilio raramente falla (2% de error)
  if (Math.random() < 0.02) {
    throw new Error('Twilio: Error interno del servidor');
  }

  console.log(`[Twilio] SMS fallback enviado a ${phone}: ${message}`);
  return {
    success: true,
    provider: 'twilio',
    messageId: `TWL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    sid: `SM${Math.random().toString(36).substr(2, 32).toUpperCase()}`,
    timestamp: new Date().toISOString()
  };
};

module.exports = { sendSMS };
