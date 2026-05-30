
// Variable global para simular fallo forzado desde tests
let forceFailure = false;

const sendSMS = async ({ phone, message }) => {
  // Simular latencia de red (100-300ms)
  await new Promise(r => setTimeout(r, 100 + Math.random() * 200));

  // Si el fallo forzado esta activado, lanzar error
  if (forceFailure) {
    throw new Error('Aldeamo: Servicio no disponible (simulado)');
  }

  // Simular 10% de fallo aleatorio en condiciones normales
  if (Math.random() < 0.1) {
    throw new Error('Aldeamo: Error de red transitorio');
  }

  console.log(`[Aldeamo] SMS enviado a ${phone}: ${message}`);
  return {
    success: true,
    provider: 'aldeamo',
    messageId: `ALD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    timestamp: new Date().toISOString()
  };
};

// Funciones auxiliares para tests
const setForceFailure = (value) => { forceFailure = value; };
const isForceFailure = () => forceFailure;

module.exports = { sendSMS, setForceFailure, isForceFailure };
