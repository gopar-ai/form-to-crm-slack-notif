# registro-form-en-pipedrive-notif-slack

> Webhook that converts a Webflow form submission into a full lead inside Pipedrive and notifies the team on Slack — in real time.

---

## How it works

```
Webflow Form Submit
       │
       ▼
POST /webhook/webflow
       │
       ├─► Pipedrive: create Person  (name, email, phone, company, UTMs, GCLID, contact reason)
       │                    │
       │                    └─► get or create Organization
       │
       ├─► Pipedrive: create Deal    (pipeline + stage resolved by name, message, utm_source)
       │
       ├─► Pipedrive: create Note    (HTML table with all form fields + tracking params)
       │
       └─► Slack: send notification  (color-coded by UTM source: paid / organic / manual)
```

Pipeline and stage IDs are resolved by name at startup and cached — no lookup overhead per request.

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| HTTP server | Express |
| Pipedrive integration | Pipedrive REST API v1 via Axios |
| Slack integration | Slack Incoming Webhooks via Axios |
| Config | dotenv |
| Dev server | nodemon |

---

## Environment variables

Create a `.env` file at the root (never commit it):

```env
# Pipedrive
PIPEDRIVE_API_TOKEN=your_pipedrive_api_token
PIPEDRIVE_PIPELINE_NAME=custodia          # Pipeline name (default: custodia)
PIPEDRIVE_STAGE_NAME=prospeccion          # Stage name (default: prospeccion)

# Custom field keys — get these from Pipedrive Settings > Data Fields
PIPEDRIVE_GCLID_FIELD_KEY=
PIPEDRIVE_UTM_SOURCE_FIELD_KEY=
PIPEDRIVE_UTM_MEDIUM_FIELD_KEY=
PIPEDRIVE_UTM_CAMPAIGN_FIELD_KEY=
PIPEDRIVE_UTM_TERM_FIELD_KEY=
PIPEDRIVE_UTM_CONTENT_FIELD_KEY=
PIPEDRIVE_CONTACT_REASON_FIELD_KEY=
PIPEDRIVE_DUDAS_COMENTARIOS_FIELD_KEY=   # Deal: message/comments field
PIPEDRIVE_UTM_SOURCE_DEAL_FIELD_KEY=     # Deal: utm_source field

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional: set to "true" to skip Slack notifications (e.g. for staging)
DISABLE_SLACK=false
```

---

## Installation

```bash
git clone https://github.com/goparjanette-hub/registro-form-en-pipedrive-notif-slack.git
cd registro-form-en-pipedrive-notif-slack
npm install
cp .env.example .env   # then fill in your keys
npm run dev
```

---

## API

### `POST /webhook/webflow`

Receives a Webflow form submission and processes the full lead pipeline.

**Expected body** (Webflow API v2 format):

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

**Responses:**

| Status | Meaning |
|---|---|
| `200` | Lead created — returns `{ dealId, personId }` |
| `400` | Missing `name`/`email` or malformed body |
| `500` | Upstream API error (Pipedrive or Slack) |

### `GET /health`

Returns `{ "status": "ok" }`. Use for uptime monitoring.

---

## Slack notification format

Notifications are labeled by `utm_source`:

| utm_source | Label |
|---|---|
| `paid_media` | Nuevo Lead Paid Media 🔵 |
| `organico` | Nuevo Lead Orgánico 🟢 |
| `utm_manual` | Nuevo Lead Manual 🟡 |
| *(anything else)* | Nuevo Lead ⚪ |

---

## Deployment

This is a stateless Express server — deploy it anywhere Node.js runs:

- **Railway / Render / Fly.io**: connect the repo, set env vars, and it's live.
- **VPS**: run `npm start` behind nginx + PM2.
- **Webflow webhook URL**: `https://your-domain.com/webhook/webflow`
