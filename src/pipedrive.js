const axios = require('axios');

const BASE_URL = 'https://api.pipedrive.com/v1';
const API_TOKEN = process.env.PIPEDRIVE_API_TOKEN;

const api = axios.create({
  baseURL: BASE_URL,
  params: { api_token: API_TOKEN },
});

// Busca el ID del pipeline por nombre
async function getPipelineId(pipelineName) {
  const { data } = await api.get('/pipelines');
  const pipeline = data.data.find(
    (p) => p.name.toLowerCase() === pipelineName.toLowerCase()
  );
  if (!pipeline) throw new Error(`Pipeline "${pipelineName}" no encontrado en Pipedrive`);
  return pipeline.id;
}

// Busca el ID del stage por nombre dentro de un pipeline
async function getStageId(pipelineId, stageName) {
  const { data } = await api.get('/stages', { params: { pipeline_id: pipelineId } });
  const stage = data.data.find(
    (s) => s.name.toLowerCase() === stageName.toLowerCase()
  );
  if (!stage) throw new Error(`Stage "${stageName}" no encontrado en el pipeline ${pipelineId}`);
  return stage.id;
}

// Busca una organización por nombre exacto; si no existe la crea. Devuelve el org_id.
async function getOrCreateOrg(name) {
  const { data } = await api.get('/organizations/search', {
    params: { term: name, exact_match: true, fields: 'name' },
  });
  const existing = data.data?.items?.[0]?.item;
  if (existing) return existing.id;

  const { data: created } = await api.post('/organizations', { name });
  return created.data.id;
}

// Crea una persona en Pipedrive
async function createPerson({ name, email, phone, company, gclid, utm_source, utm_medium, utm_campaign, utm_term, utm_content, contact_reason }) {
  const payload = {
    name,
    email: [{ value: email, primary: true }],
    phone: [{ value: phone, primary: true }],
  };

  if (company) {
    payload.org_id = await getOrCreateOrg(company);
  }

  if (gclid && process.env.PIPEDRIVE_GCLID_FIELD_KEY) {
    payload[process.env.PIPEDRIVE_GCLID_FIELD_KEY] = gclid;
  }

  if (utm_source)    payload[process.env.PIPEDRIVE_UTM_SOURCE_FIELD_KEY]      = utm_source;
  if (utm_medium)    payload[process.env.PIPEDRIVE_UTM_MEDIUM_FIELD_KEY]      = utm_medium;
  if (utm_campaign)  payload[process.env.PIPEDRIVE_UTM_CAMPAIGN_FIELD_KEY]    = utm_campaign;
  if (utm_term)      payload[process.env.PIPEDRIVE_UTM_TERM_FIELD_KEY]        = utm_term;
  if (utm_content)   payload[process.env.PIPEDRIVE_UTM_CONTENT_FIELD_KEY]     = utm_content;
  if (contact_reason) payload[process.env.PIPEDRIVE_CONTACT_REASON_FIELD_KEY] = contact_reason;

  const { data } = await api.post('/persons', payload);
  return data.data;
}

// Crea un deal asociado a una persona en el stage indicado
async function createDeal({ title, personId, stageId, message, utm_source }) {
  const payload = {
    title,
    person_id: personId,
    stage_id: stageId,
  };

  if (message && process.env.PIPEDRIVE_DUDAS_COMENTARIOS_FIELD_KEY) {
    payload[process.env.PIPEDRIVE_DUDAS_COMENTARIOS_FIELD_KEY] = message;
  }

  if (utm_source && process.env.PIPEDRIVE_UTM_SOURCE_DEAL_FIELD_KEY) {
    payload[process.env.PIPEDRIVE_UTM_SOURCE_DEAL_FIELD_KEY] = utm_source;
  }

  const { data } = await api.post('/deals', payload);
  return data.data;
}

// Crea una nota asociada al deal
async function createNote({ dealId, noteHtml }) {
  const { data } = await api.post('/notes', {
    deal_id: dealId,
    content: noteHtml,
  });
  return data.data;
}

module.exports = { getPipelineId, getStageId, createPerson, createDeal, createNote };
