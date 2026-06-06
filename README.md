# Snap — Acortador de URLs

Acortador de URLs con autenticación, analíticas por usuario e interfaz web. Construido con Express, SQLite y Vanilla JS.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Express.js 5, TypeScript |
| Base de datos | SQLite (better-sqlite3) |
| Autenticación | JWT (jsonwebtoken) + bcryptjs |
| Frontend | HTML + CSS + Vanilla JS (ES Modules) |
| Tests | Vitest + Supertest |

## Características

- **Registro y login** con JWT (24 h de vigencia)
- **Creación de URLs cortas** con código aleatorio de 6 caracteres o alias personalizado
- **Redirección** con registro automático de clicks (referrer + user-agent)
- **Dashboard** por usuario: total de URLs, total de clicks, promedio y tabla completa con conteos
- **Eliminación** de URLs propias (protegida por propietario)
- **Interfaz web** servida por el propio Express desde `public/`

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
git clone https://github.com/Gerardo-BravoR/SnapClaudeCodeTareaCurso.git
cd SnapClaudeCodeTareaCurso
npm install
```

## Uso

### Desarrollo

```bash
npm run dev
```

El servidor arranca en `http://localhost:3000`. Abre esa URL en el navegador para acceder a la interfaz web.

### Variables de entorno

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `PORT` | `3000` | Puerto del servidor |
| `JWT_SECRET` | *(requerido en producción)* | Secreto para firmar los tokens |
| `NODE_ENV` | `development` | Entorno de ejecución |

Crea un archivo `.env` en la raíz (no incluido en el repositorio):

```
JWT_SECRET=tu_secreto_seguro
PORT=3000
```

### Tests

```bash
npm test          # ejecución única
npm run test:watch  # modo watch
```

62 tests distribuidos en 8 archivos cubren auth, URLs, dashboard, middleware y configuración.

### Build

```bash
npm run build   # compila TypeScript a dist/
```

## Estructura del proyecto

```
src/
├── server.ts              # punto de entrada
├── app.ts                 # configuración Express y rutas
├── config.ts              # variables de entorno
├── auth/
│   ├── router.ts          # POST /auth/register, POST /auth/login
│   ├── service.ts         # lógica de negocio
│   └── middleware.ts      # requireAuth (guard JWT)
├── urls/
│   └── router.ts          # POST /urls, GET /urls, GET /urls/mine, DELETE /urls/:code
├── dashboard/
│   └── router.ts          # GET /dashboard
├── health/
│   └── router.ts          # GET /health
└── shared/
    ├── db.ts              # conexión SQLite con WAL
    └── middleware.ts      # logger, 404, error handler

public/
├── index.html             # login y registro
├── dashboard.html         # panel del usuario
├── css/styles.css         # tema dark compartido
└── js/
    ├── api.js             # fetch wrapper hacia la API
    └── auth.js            # gestión de sesión en localStorage

docs/
└── API.md                 # referencia completa de endpoints
```

## API

La referencia completa está en [`docs/API.md`](docs/API.md). Resumen de endpoints:

| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| `GET` | `/health` | | Estado del servidor |
| `POST` | `/auth/register` | | Registro de usuario |
| `POST` | `/auth/login` | | Login |
| `POST` | `/urls` | ✓ | Crear URL corta (alias opcional) |
| `GET` | `/urls` | | Listar todas las URLs |
| `GET` | `/urls/mine` | ✓ | URLs del usuario con clicks |
| `DELETE` | `/urls/:code` | ✓ | Eliminar URL propia |
| `GET` | `/:code` | | Redirigir y registrar click |
| `GET` | `/dashboard` | ✓ | Analíticas del usuario |

### Ejemplo rápido con curl

```bash
# Registro
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@example.com","password":"secreto123"}'

# Crear URL corta
curl -X POST http://localhost:3000/urls \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://ejemplo.com/ruta/muy/larga","alias":"mi-enlace"}'

# Dashboard
curl http://localhost:3000/dashboard \
  -H "Authorization: Bearer <token>"
```

## Base de datos

SQLite en modo WAL con tres tablas:

```sql
users  (id, email, password_hash, name, created_at)
urls   (id, code, original_url, user_id, created_at)
clicks (id, url_id, referrer, user_agent, clicked_at)
```

El archivo `snap.db` se crea automáticamente en la raíz al arrancar el servidor.

## Licencia

MIT
