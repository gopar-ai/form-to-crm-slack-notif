/**
 * Construye el contenido HTML de la nota para Pipedrive
 * con todos los datos del formulario + UTMs + GCLID.
 */
function buildNoteHtml(fields) {
  const {
    name,
    email,
    phone,
    company,
    contact_reason,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    gclid,
    ...rest
  } = fields;

  const row = (label, value) =>
    value ? `<tr><td><strong>${label}</strong></td><td>${value}</td></tr>` : '';

  const extraRows = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => row(k, v))
    .join('');

  return `
<h3>Datos del formulario</h3>
<table>
  ${row('Nombre', name)}
  ${row('Email', email)}
  ${row('Teléfono', phone)}
  ${row('Empresa', company)}
  ${row('Motivo de contacto', contact_reason)}
</table>

<h3>Tracking</h3>
<table>
  ${row('UTM Source', utm_source)}
  ${row('UTM Medium', utm_medium)}
  ${row('UTM Campaign', utm_campaign)}
  ${row('UTM Term', utm_term)}
  ${row('UTM Content', utm_content)}
  ${row('GCLID', gclid)}
</table>

${
  extraRows
    ? `<h3>Campos adicionales</h3><table>${extraRows}</table>`
    : ''
}
`.trim();
}

module.exports = { buildNoteHtml };
