const { aldeamoCB, CB_STATES } = require('./circuitBreaker');
const aldeamo = require('./aldeamoService');
const twilio = require('./twilioService');

/**
 * Envia un SMS con fallback automatico.
 * Flujo:
 *   1. Si el CB esta CLOSED o HALF_OPEN: intenta Aldeamo
 *   2. Si Aldeamo falla o el CB esta OPEN: usa Twilio como fallback
 */
const sendOTP = async ({ phone, otp }) => {
  const message = `Banco Dhabi: Tu codigo OTP es ${otp}. Valido por 5 minutos.`;
  let result;
  let usedFallback = false;

  try {
    // Intento principal: Aldeamo protegido por Circuit Breaker
    result = await aldeamoCB.execute(() =>
      aldeamo.sendSMS({ phone, message })
    );
    console.log(`[SMS] Enviado via Aldeamo (CB: ${aldeamoCB.state})`);
  } catch (aldeamoError) {
    // Aldeamo fallo o CB esta OPEN -> usar Twilio como fallback
    console.warn(`[SMS] Aldeamo no disponible: ${aldeamoError.message}`);
    console.log('[SMS] Usando Twilio como fallback...');
    usedFallback = true;

    try {
      result = await twilio.sendSMS({ phone, message });
      console.log('[SMS] Fallback exitoso via Twilio');
    } catch (twilioError) {
      // Ambos proveedores fallaron
      console.error('[SMS] CRITICO: Ambos proveedores fallaron');
      throw new Error(`SMS fallido. Aldeamo: ${aldeamoError.message} | Twilio: ${twilioError.message}`);
    }
  }

  return {
    ...result,
    usedFallback,
    circuitBreakerState: aldeamoCB.state
  };
};

const getCBStatus = () => aldeamoCB.getStatus();

module.exports = { sendOTP, getCBStatus };
