require('dotenv').config();
const express = require('express');
const { getPipelineId, getStageId, createPerson, createDeal, createNote } = require('./pipedrive');
const { sendDealNotification } = require('./slack');
const { buildNoteHtml } = require('./buildNote');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
console.log('[config] DISABLE_SLACK:', process.env.DISABLE_SLACK);
const PIPELINE_NAME = process.env.PIPEDRIVE_PIPELINE_NAME || 'custodia';
const STAGE_NAME = process.env.PIPEDRIVE_STAGE_NAME || 'prospeccion';

// Carga el pipeline/stage IDs al arrancar para no hacer la búsqueda en cada request
let stageId = null;

async function loadPipedriveIds() {
  const pipelineId = await getPipelineId(PIPELINE_NAME);
  stageId = await getStageId(pipelineId, STAGE_NAME);
  console.log(`Pipeline "${PIPELINE_NAME}" → stage "${STAGE_NAME}" (id: ${stageId}) cargado.`);
}

// ─── Webhook endpoint ────────────────────────────────────────────────────────

app.post('/webhook/webflow', async (req, res) => {
  try {
    // Webflow API V2 envía los campos del formulario bajo payload.data
    const formData = req.body?.payload?.data;

    if (!formData) {
      console.error('Body recibido sin payload.data:', JSON.stringify(req.body));
      return res.status(400).json({ error: 'Estructura inesperada: falta payload.data' });
    }

    const {
      name,
      email,
      phone,
      company,
      contact_reason,
      message,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      gclid,
    } = formData;

    if (!name || !email) {
      return res.status(400).json({ error: 'Faltan campos requeridos: name y email' });
    }

    // 1) Crear persona en Pipedrive
    const person = await createPerson({ name, email, phone, company, gclid, utm_source, utm_medium, utm_campaign, utm_term, utm_content, contact_reason });
    console.log(`Persona creada: ${person.id} - ${name}`);

    // 2) Crear deal en pipeline custodia / stage prospeccion
    const dealTitle = company || name;
    const deal = await createDeal({
      title: dealTitle,
      personId: person.id,
      stageId,
      message,
      utm_source,
    });
    console.log(`Deal creado: ${deal.id} - ${dealTitle}`);

    // 3) Crear nota con todos los datos (incluyendo UTMs y GCLID)
    const noteHtml = buildNoteHtml(formData);
    await createNote({ dealId: deal.id, noteHtml });
    console.log(`Nota creada en deal ${deal.id}`);

    // Construir URL del deal para Slack
    // El dominio del CRM se obtiene de la respuesta de Pipedrive (deal.id + companyDomain)
    const dealUrl = `https://app.pipedrive.com/deal/${deal.id}`;

    // 4) Enviar mensaje a Slack
    if (process.env.DISABLE_SLACK === 'true') {
      console.log('Slack desactivado (DISABLE_SLACK=true), omitiendo notificación');
    } else {
      await sendDealNotification({
        dealUrl,
        name,
        email,
        phone,
        company,
        contactReason: contact_reason,
        message,
        utmSource: utm_source,
      });
      console.log('Notificación enviada a Slack');
    }

    return res.status(200).json({ success: true, dealId: deal.id, personId: person.id });
  } catch (err) {
    console.error('Error procesando webhook:', err.message);
    if (err.response) {
      console.error('Respuesta API:', err.response.status, JSON.stringify(err.response.data));
    }
    return res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Arranque ────────────────────────────────────────────────────────────────

loadPipedriveIds()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
      console.log(`Webhook endpoint: POST http://localhost:${PORT}/webhook/webflow`);
    });
  })
  .catch((err) => {
    console.error('Error al cargar configuración de Pipedrive:', err.message);
    process.exit(1);
  });
