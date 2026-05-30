# 🏦 Banco Dhabi — Sistema OTP con Patrones Arquitectónicos Avanzados

> Parcial III · Patrones Arquitectónicos · Node.js + PostgreSQL + MongoDB + Docker

Sistema de envío de OTPs por SMS que implementa **Circuit Breaker**, **CQRS**, **Fallback entre proveedores** y **Consistencia Eventual**.

---

## 📐 Arquitectura

```
  Cliente / App
       │
       ▼
  [Notification Service — Express]
       │                    │
       ▼                    ▼
  COMMAND SIDE         QUERY SIDE
  (Escritura)          (Lectura)
  PostgreSQL           MongoDB
  notifications_cmd    notifications_read
       │                    ▲
       └──[SyncWorker]──────┘
          (cada 5s · consistencia eventual)
                │
                ▼
        [Circuit Breaker]
        CLOSED ──► Aldeamo  (principal)
        OPEN   ──► Twilio   (fallback)
```

### Patrones implementados

| Patrón | Descripción | Archivos clave |
|---|---|---|
| **Circuit Breaker** | 3 fallos → OPEN, timeout 10s → HALF_OPEN, 2 éxitos → CLOSED | `src/services/circuitBreaker.js` |
| **CQRS** | Escrituras en PostgreSQL, lecturas en MongoDB | `src/routes/notifications.js` |
| **Fallback** | Aldeamo falla → Twilio automáticamente | `src/services/smsService.js` |
| **Consistencia Eventual** | SyncWorker replica SQL → NoSQL cada 5s | `src/workers/syncWorker.js` |

---

## 🗂️ Estructura del proyecto

```
cqrs-parcial/
├── docker-compose.yml
├── .env
├── package.json
└── src/
    ├── index.js
    ├── config/
    │   ├── database.js          # Sequelize / PostgreSQL
    │   └── mongodb.js           # Mongoose / MongoDB
    ├── models/
    │   ├── NotificationCmd.js   # Modelo SQL (escritura)
    │   └── NotificationRead.js  # Modelo NoSQL (lectura)
    ├── services/
    │   ├── circuitBreaker.js
    │   ├── aldeamoService.js    # Proveedor principal (simulado)
    │   ├── twilioService.js     # Fallback (simulado)
    │   └── smsService.js        # Orquestador CB + fallback
    ├── workers/
    │   └── syncWorker.js        # Sync SQL → MongoDB
    └── routes/
        └── notifications.js
```

---

## ⚙️ Requisitos

- Node.js >= 18
- Docker Desktop
- npm

---

## 🚀 Instalación y arranque

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/gabrielabejarano09/CQRS-parcial.git
cd CQRS-parcial
npm install
```

### 2. Crear el archivo `.env` en la raíz

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=dhabi_notifications
DB_USER=dhabi_user
DB_PASS=dhabi_pass123

MONGO_URI=mongodb://dhabi_user:dhabi_pass123@localhost:27017/dhabi_read?authSource=admin

CB_FAILURE_THRESHOLD=3
CB_SUCCESS_THRESHOLD=2
CB_TIMEOUT_MS=10000

SYNC_INTERVAL_MS=5000
```

### 3. Levantar las bases de datos con Docker

```bash
docker-compose up -d
```

> Si ya existían volúmenes con credenciales distintas, primero limpia:
> ```bash
> docker-compose down
> docker volume rm cqrs-parcial_postgres_data
> docker-compose up -d
> ```

### 4. Iniciar el servidor

```bash
npm run dev      # desarrollo (nodemon)
npm start        # producción
```

Salida esperada:

```
[PostgreSQL] Conexion establecida correctamente.
[Sequelize] Tablas sincronizadas.
[MongoDB] Conexion establecida correctamente.
[SyncWorker] Iniciado. Sincronizando cada 5s
[Server] Banco Dhabi OTP corriendo en http://localhost:3000
```

---

## 📡 API Endpoints

### Enviar OTP — Command Side (escribe en PostgreSQL)

```http
POST /api/notifications/send-otp
Content-Type: application/json

{ "phone": "+573001234567" }
```

### Listar notificaciones — Query Side (lee desde MongoDB)

```http
GET /api/notifications/
GET /api/notifications/?limit=10
```

### Buscar por teléfono

```http
GET /api/notifications/phone/+573001234567
```

### Estado del Circuit Breaker

```http
GET /api/notifications/circuit-breaker
```

### Simular fallo de Aldeamo (para pruebas)

```http
POST /api/notifications/simulate-failure
Content-Type: application/json

{ "enable": true }    # activa fallo forzado
{ "enable": false }   # desactiva
```

### Health check

```http
GET /api/health
```

---

## 🧪 Pruebas de funcionalidad

### Flujo normal (Circuit Breaker CLOSED → Aldeamo)

```bash
curl -X POST http://localhost:3000/api/notifications/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+573001234567"}'
```

Respuesta esperada:
```json
{
  "success": true,
  "provider": "aldeamo",
  "usedFallback": false,
  "circuitBreakerState": "CLOSED"
}
```

### Prueba de fallback y Circuit Breaker

```bash
# 1. Activar fallo forzado
curl -X POST http://localhost:3000/api/notifications/simulate-failure \
  -H "Content-Type: application/json" -d '{"enable": true}'

# 2. Enviar 3 OTPs — después del 3ro el CB pasa a OPEN
curl -X POST http://localhost:3000/api/notifications/send-otp \
  -H "Content-Type: application/json" -d '{"phone": "+573009990001"}'
# provider: "twilio", usedFallback: true, circuitBreakerState: "CLOSED" (fallo 1/3)

curl -X POST http://localhost:3000/api/notifications/send-otp \
  -H "Content-Type: application/json" -d '{"phone": "+573009990002"}'
# fallo 2/3

curl -X POST http://localhost:3000/api/notifications/send-otp \
  -H "Content-Type: application/json" -d '{"phone": "+573009990003"}'
# circuitBreakerState: "OPEN" — CB abierto

# 3. Verificar estado
curl http://localhost:3000/api/notifications/circuit-breaker
```

### Prueba de consistencia eventual (SQL → MongoDB)

```bash
# Enviar OTP (se guarda en PostgreSQL, synced=false)
curl -X POST http://localhost:3000/api/notifications/send-otp \
  -H "Content-Type: application/json" -d '{"phone": "+573005555555"}'

# Esperar 6 segundos (SyncWorker corre cada 5s)
sleep 6

# Consultar desde MongoDB
curl http://localhost:3000/api/notifications/phone/+573005555555
# source: "MongoDB (Query Side)"
```

### Recuperación automática del Circuit Breaker

```bash
# 1. Desactivar fallo forzado
curl -X POST http://localhost:3000/api/notifications/simulate-failure \
  -H "Content-Type: application/json" -d '{"enable": false}'

# 2. Esperar 10 segundos (timeout del CB → pasa a HALF_OPEN)
sleep 10

# 3. Enviar 2 OTPs exitosos → CB vuelve a CLOSED
curl -X POST http://localhost:3000/api/notifications/send-otp \
  -H "Content-Type: application/json" -d '{"phone": "+573001111111"}'
curl -X POST http://localhost:3000/api/notifications/send-otp \
  -H "Content-Type: application/json" -d '{"phone": "+573002222222"}'

# 4. Verificar
curl http://localhost:3000/api/notifications/circuit-breaker
# state: "CLOSED"
```

---

## 🗄️ Verificación directa en las bases de datos

### PostgreSQL

```bash
docker exec -it dhabi_postgres psql -U dhabi_user -d dhabi_notifications

-- Ver notificaciones
SELECT id, phone, provider, status, synced, created_at
FROM notifications_cmd ORDER BY created_at DESC;

-- Estado de sincronización
SELECT synced, COUNT(*) FROM notifications_cmd GROUP BY synced;

\q
```

### MongoDB

```bash
docker exec -it dhabi_mongo mongosh \
  -u dhabi_user -p dhabi_pass123 --authenticationDatabase admin

use dhabi_read
db.notifications_read.find().pretty()
db.notifications_read.countDocuments()
exit
```

---

## 🔄 Estados del Circuit Breaker

```
CLOSED ──(3 fallos consecutivos)──► OPEN
  ▲                                   │
  │                                   │ (timeout 10s)
  │                                   ▼
  └──(2 éxitos en HALF_OPEN)── HALF_OPEN
```

| Estado | Comportamiento |
|---|---|
| `CLOSED` | Llamadas normales a Aldeamo |
| `OPEN` | Rechaza llamadas a Aldeamo, usa Twilio |
| `HALF_OPEN` | Permite una llamada de prueba a Aldeamo |

Variables configurables en `.env`:

| Variable | Default | Descripción |
|---|---|---|
| `CB_FAILURE_THRESHOLD` | `3` | Fallos para abrir el circuito |
| `CB_SUCCESS_THRESHOLD` | `2` | Éxitos en HALF_OPEN para cerrarlo |
| `CB_TIMEOUT_MS` | `10000` | Ms en OPEN antes de probar de nuevo |
| `SYNC_INTERVAL_MS` | `5000` | Intervalo del SyncWorker en ms |

---

## 🐳 Docker

| Servicio | Imagen | Puerto | Credenciales |
|---|---|---|---|
| PostgreSQL | `postgres:15-alpine` | `5432` | `dhabi_user / dhabi_pass123` |
| MongoDB | `mongo:6-jammy` | `27017` | `dhabi_user / dhabi_pass123` |

```bash
docker-compose up -d      # levantar
docker-compose down       # detener
docker-compose down -v    # detener y borrar volúmenes
```

---

## 📝 Notas

- Los proveedores SMS (Aldeamo y Twilio) están **simulados** — no se requieren APIs reales.
- Aldeamo tiene un 10% de fallo aleatorio en condiciones normales y un modo de fallo forzado para pruebas.
- La consistencia eventual implica que los datos en MongoDB pueden estar hasta `SYNC_INTERVAL_MS` ms detrás de PostgreSQL.
