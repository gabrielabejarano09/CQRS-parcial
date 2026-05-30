const CB_STATES = {
  CLOSED: 'CLOSED',       // Funcionando normal, llamadas a Aldeamo
  OPEN: 'OPEN',           // Circuito abierto, usando fallback
  HALF_OPEN: 'HALF_OPEN'  // Probando si Aldeamo se recupero
};

class CircuitBreaker {
  constructor(options = {}) {
    // Cuantos fallos seguidos antes de abrir el circuito
    this.failureThreshold = options.failureThreshold ||
      parseInt(process.env.CB_FAILURE_THRESHOLD) || 3;

    // Cuantos exitos seguidos en HALF_OPEN para cerrar de nuevo
    this.successThreshold = options.successThreshold ||
      parseInt(process.env.CB_SUCCESS_THRESHOLD) || 2;

    // Tiempo en ms que espera en OPEN antes de probar de nuevo
    this.timeout = options.timeout ||
      parseInt(process.env.CB_TIMEOUT_MS) || 10000;

    // Estado inicial
    this.state = CB_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.name = options.name || 'CircuitBreaker';
  }

  // Punto de entrada: ejecuta la funcion protegida
  async execute(protectedFn) {
    if (this.state === CB_STATES.OPEN) {
      // Verificar si ya paso el timeout de recuperacion
      const now = Date.now();
      if (now - this.lastFailureTime >= this.timeout) {
        console.log(`[CB:${this.name}] Timeout vencido, pasando a HALF_OPEN`);
        this.state = CB_STATES.HALF_OPEN;
        this.successCount = 0;
      } else {
        const remaining = Math.round((this.timeout - (now - this.lastFailureTime)) / 1000);
        throw new Error(`[CB:${this.name}] Circuito ABIERTO. Recuperacion en ${remaining}s`);
      }
    }

    try {
      const result = await protectedFn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  _onSuccess() {
    if (this.state === CB_STATES.HALF_OPEN) {
      this.successCount++;
      console.log(`[CB:${this.name}] Exito en HALF_OPEN (${this.successCount}/${this.successThreshold})`);
      if (this.successCount >= this.successThreshold) {
        this.state = CB_STATES.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        console.log(`[CB:${this.name}] Circuito CERRADO - servicio recuperado`);
      }
    } else {
      // En CLOSED, resetear contador de fallos
      this.failureCount = 0;
    }
  }

  _onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    console.error(`[CB:${this.name}] Fallo #${this.failureCount}: ${error.message}`);

    if (this.state === CB_STATES.HALF_OPEN) {
      // Si falla en HALF_OPEN, volver a OPEN inmediatamente
      this.state = CB_STATES.OPEN;
      this.successCount = 0;
      console.warn(`[CB:${this.name}] Fallo en HALF_OPEN, volviendo a OPEN`);
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = CB_STATES.OPEN;
      console.warn(`[CB:${this.name}] ABRIENDO CIRCUITO tras ${this.failureCount} fallos`);
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureThreshold: this.failureThreshold,
      lastFailureTime: this.lastFailureTime ?
        new Date(this.lastFailureTime).toISOString() : null
    };
  }
}

// Exportamos una instancia unica (Singleton) para Aldeamo
const aldeamoCB = new CircuitBreaker({ name: 'Aldeamo' });

module.exports = { CircuitBreaker, aldeamoCB, CB_STATES };
