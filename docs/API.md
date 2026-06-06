# Snap API

Base URL: `http://localhost:3000`

Rutas protegidas requieren el header:
```
Authorization: Bearer <token>
```

---

## Auth

### POST /auth/register

Registra un nuevo usuario.

**Body**
```json
{
  "email": "user@example.com",
  "password": "minimo8chars",
  "name": "Nombre"
}
```

**Respuestas**

| Código | Descripción |
|--------|-------------|
| 201 | Registro exitoso |
| 400 | Campo inválido o ausente |
| 409 | Email ya registrado |

**201 — Éxito**
```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Nombre"
  }
}
```

---

### POST /auth/login

Autentica un usuario existente.

**Body**
```json
{
  "email": "user@example.com",
  "password": "minimo8chars"
}
```

**Respuestas**

| Código | Descripción |
|--------|-------------|
| 200 | Login exitoso |
| 400 | Campo ausente |
| 401 | Credenciales incorrectas |

**200 — Éxito**
```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Nombre"
  }
}
```

---

## URLs

### POST /urls `🔒`

Crea una URL corta. Cada código es de 6 caracteres alfanuméricos aleatorios.

**Body**
```json
{ "url": "https://url-larga.com/ruta" }
```

**Respuestas**

| Código | Descripción |
|--------|-------------|
| 201 | URL creada |
| 400 | `url` ausente o no es string |
| 401 | Sin autenticación |

**201 — Éxito**
```json
{
  "code": "aB3xYz",
  "url": "https://url-larga.com/ruta",
  "shortUrl": "/aB3xYz"
}
```

---

### GET /urls

Lista todas las URLs creadas. Público.

**Respuestas**

| Código | Descripción |
|--------|-------------|
| 200 | Lista de URLs |

**200 — Éxito**
```json
[
  {
    "code": "aB3xYz",
    "url": "https://url-larga.com/ruta",
    "created_at": 1748995200
  }
]
```

Ordenado por fecha de creación descendente (`created_at` es Unix timestamp en segundos).

---

### DELETE /urls/:code `🔒`

Elimina una URL. Solo el propietario puede borrarla.

**Respuestas**

| Código | Descripción |
|--------|-------------|
| 204 | Eliminada |
| 401 | Sin autenticación |
| 403 | La URL pertenece a otro usuario |
| 404 | Código no encontrado |

---

### GET /:code

Redirige a la URL original. Registra el click automáticamente. Público.

**Respuestas**

| Código | Descripción |
|--------|-------------|
| 302 | Redirect a la URL original |
| 404 | Código no encontrado |

---

## Dashboard

### GET /dashboard `🔒`

Devuelve un resumen de las URLs y clicks del usuario autenticado. Incluye totales globales, evolución de clicks en los últimos 30 días, y las 5 URLs con más tráfico.

**Respuestas**

| Código | Descripción |
|--------|-------------|
| 200 | Dashboard del usuario |
| 401 | Sin autenticación |

**200 — Éxito**
```json
{
  "totals": {
    "urls": 12,
    "clicks": 847,
    "avg_clicks_per_url": 70.58
  },
  "clicks_by_day": [
    { "date": "2026-05-07", "clicks": 34 },
    { "date": "2026-05-08", "clicks": 51 }
  ],
  "top_urls": [
    {
      "code": "aB3xYz",
      "original_url": "https://url-larga.com/ruta",
      "clicks": 312
    }
  ]
}
```

**Campos**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `totals.urls` | integer | Total de URLs creadas por el usuario |
| `totals.clicks` | integer | Total de clicks en todas sus URLs |
| `totals.avg_clicks_per_url` | float | Media de clicks por URL, redondeada a 2 decimales |
| `clicks_by_day` | array | Clicks agrupados por día (UTC), últimos 30 días, solo días con actividad |
| `top_urls` | array | Hasta 5 URLs ordenadas por clicks descendente |

---

## Health

### GET /health

Estado del servidor. Público.

**200**
```json
{ "status": "ok" }
```

---

## Errores comunes

```json
{ "error": "Authentication required" }   // 401 — sin token
{ "error": "Invalid or expired token" }  // 401 — token inválido
{ "error": "Route not found" }           // 404 — ruta inexistente
{ "error": "Internal server error" }     // 500 — error inesperado
```
