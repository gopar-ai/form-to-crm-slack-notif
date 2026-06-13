# registro-form-en-pipedrive-notif-slack

Webhook que convierte un envío de formulario de Webflow en un lead completo dentro de Pipedrive y notifica al equipo en Slack — en tiempo real.

## Cómo funciona

```
Webflow Form Submit
       │
       ▼
POST /webhook/webflow
       │
       ├─► Pipedrive: crear Person  (nombre, email, teléfono, empresa, UTMs, GCLID, motivo de contacto)
       │                    │
       │                    └─► obtener o crear Organization
       │
       ├─► Pipedrive: crear Deal    (pipeline + stage resueltos por nombre, mensaje, utm_source)
       │
       ├─► Pipedrive: crear Note    (tabla HTML con todos los campos del formulario + parámetros de tracking)
       │
       └─► Slack: enviar notificación  (color según UTM source: paid / orgánico / manual)
```

Los IDs de pipeline y stage se resuelven por nombre al arrancar y se guardan en caché — sin overhead de búsqueda por request.

---

## Script de captura de UTMs (Webflow)

Para que el webhook reciba `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` y `gclid`, el formulario de Webflow necesita inyectar esos valores como campos ocultos antes de enviarse.

El script está en [`snippets/webflow-utm-capture.js`](snippets/webflow-utm-capture.js). Cópialo dentro de una etiqueta `<script>` y pégalo en **Webflow → Page Settings → Custom Code → Before `</body>` tag** (o en el footer code del sitio si aplica a todas las páginas con formulario).

**Qué hace:**
- Lee `utm_*` y `gclid` de la URL y los guarda en `localStorage` para que persistan entre páginas (ej. landing → contacto).
- Al cargar cualquier página con formularios, crea (si no existen) campos ocultos con esos valores y los inyecta en cada `<form>`.
- Calcula `utm_source` automáticamente si no viene en la URL: `paid_media` (si hay `gclid`), `utm_manual` (si hay otros UTMs) u `organico` (si no hay ninguno) — estos son los valores que el [formato de notificación de Slack](#formato-de-notificación-de-slack) usa para etiquetar el lead.

---

## Tech stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 18+ |
| Servidor HTTP | Express |
| Integración Pipedrive | Pipedrive REST API v1 vía Axios |
| Integración Slack | Slack Incoming Webhooks vía Axios |
| Configuración | dotenv |
| Servidor de desarrollo | nodemon |

---

## Variables de entorno

Crea un archivo `.env` en la raíz (nunca lo subas al repo):

```env
# Pipedrive
PIPEDRIVE_API_TOKEN=your_pipedrive_api_token
PIPEDRIVE_PIPELINE_NAME=custodia          # Nombre del pipeline (default: custodia)
PIPEDRIVE_STAGE_NAME=prospeccion          # Nombre del stage (default: prospeccion)

# Keys de campos personalizados — obtenlas en Pipedrive Settings > Data Fields
PIPEDRIVE_GCLID_FIELD_KEY=
PIPEDRIVE_UTM_SOURCE_FIELD_KEY=
PIPEDRIVE_UTM_MEDIUM_FIELD_KEY=
PIPEDRIVE_UTM_CAMPAIGN_FIELD_KEY=
PIPEDRIVE_UTM_TERM_FIELD_KEY=
PIPEDRIVE_UTM_CONTENT_FIELD_KEY=
PIPEDRIVE_CONTACT_REASON_FIELD_KEY=
PIPEDRIVE_DUDAS_COMENTARIOS_FIELD_KEY=   # Deal: campo de mensaje/comentarios
PIPEDRIVE_UTM_SOURCE_DEAL_FIELD_KEY=     # Deal: campo de utm_source

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Opcional: poner en "true" para omitir notificaciones de Slack (ej. en staging)
DISABLE_SLACK=false
```

---

## Instalación

```bash
git clone https://github.com/goparjanette-hub/registro-form-en-pipedrive-notif-slack.git
cd registro-form-en-pipedrive-notif-slack
npm install
cp .env.example .env   # luego completa tus credenciales
npm run dev
```

---

## API

### `POST /webhook/webflow`

Recibe un envío de formulario de Webflow y procesa el flujo completo del lead.

**Body esperado** (formato Webflow API v2):

```json
{
  "payload": {
    "data": {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+52 55 1234 5678",
      "company": "Acme Corp",
      "contact_reason": "Quiero más información",
      "message": "¿Tienen disponibilidad para...?",
      "utm_source": "paid_media",
      "utm_medium": "cpc",
      "utm_campaign": "brand-2024",
      "utm_term": "keyword",
      "utm_content": "ad-variant-a",
      "gclid": "Cj0KCQiA..."
    }
  }
}
```

**Respuestas:**

| Status | Significado |
|---|---|
| `200` | Lead creado — devuelve `{ dealId, personId }` |
| `400` | Falta `name`/`email` o body mal formado |
| `500` | Error de API upstream (Pipedrive o Slack) |

### `GET /health`

Devuelve `{ "status": "ok" }`. Úsalo para monitoreo de uptime.

---

## Formato de notificación de Slack

Las notificaciones se etiquetan según `utm_source`:

| utm_source | Etiqueta |
|---|---|
| `paid_media` | Nuevo Lead Paid Media 🔵 |
| `organico` | Nuevo Lead Orgánico 🟢 |
| `utm_manual` | Nuevo Lead Manual 🟡 |
| *(cualquier otro)* | Nuevo Lead ⚪ |

---

## Deployment

Es un servidor Express sin estado — despliégalo donde corra Node.js:

- **Railway / Render / Fly.io**: conecta el repo, configura las variables de entorno y queda en vivo.
- **VPS**: corre `npm start` detrás de nginx + PM2.
- **Webflow webhook URL**: `https://your-domain.com/webhook/webflow`
