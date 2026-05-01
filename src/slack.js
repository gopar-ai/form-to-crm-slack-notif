const axios = require('axios');

const TITULO_POR_SOURCE = {
  paid_media: 'Nuevo Lead Paid Media 🔵',
  organico:   'Nuevo Lead Orgánico 🟢',
  utm_manual: 'Nuevo Lead Manual 🟡',
};

function getTitulo(utmSource) {
  return TITULO_POR_SOURCE[utmSource] ?? 'Nuevo Lead ⚪';
}

async function sendDealNotification({ dealUrl, name, email, phone, company, contactReason, message, utmSource }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  const titulo = getTitulo(utmSource);

  const text =
    `:detecta: *${titulo}*\n` +
    `*Nombre:* ${name}\n` +
    `*Email:* ${email}\n` +
    (phone ? `*Teléfono:* ${phone}\n` : '') +
    (company ? `*Empresa:* ${company}\n` : '') +
    (contactReason ? `*Motivo de contacto:* ${contactReason}\n` : '') +
    (message ? `*Dudas o comentarios:* ${message}\n` : '') +
    `*Deal en Pipedrive:* ${dealUrl}`;

  const response = await axios.post(webhookUrl, {
    text,
    username: 'Detector',
    icon_emoji: ':detecta:',
  });

  // Incoming Webhooks devuelven el string "ok" con status 200 si todo va bien
  if (response.status !== 200 || response.data !== 'ok') {
    throw new Error(`Slack Webhook error: ${response.data}`);
  }

  return response.data;
}

module.exports = { sendDealNotification };
