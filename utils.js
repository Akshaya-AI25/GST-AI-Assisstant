export function createClient(values) {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    name: values.name.trim(),
    gstin: values.gstin.trim(),
    email: values.email.trim(),
    portalUrl: values.portalUrl.trim(),
    notes: values.notes.trim(),
    group: values.group?.trim() || 'Monthly',
    lastFilingStatus: values.lastFilingStatus?.trim() || 'Pending',
    pendingNotices: Number(values.pendingNotices) || 0,
    complianceScore: Number(values.complianceScore) || 0,
    createdAt: new Date().toISOString(),
  };
}

export function removeClient(clients, clientId) {
  return clients.filter((client) => client.id !== clientId);
}

export function filterClients(clients, search = '', group = 'All groups') {
  const normalizedSearch = search.trim().toLowerCase();
  return clients.filter((client) => {
    const matchesSearch = !normalizedSearch || [client.name, client.gstin, client.email].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    const matchesGroup = group === 'All groups' || client.group === group;
    return matchesSearch && matchesGroup;
  });
}

export function calculateComplianceScore(client) {
  const base = client.lastFilingStatus === 'Filed' ? 90 : 60;
  const noticePenalty = client.pendingNotices ? client.pendingNotices * 5 : 0;
  const score = Math.max(0, Math.min(100, base - noticePenalty));
  return score;
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** index;
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function buildSummary(client, uploads) {
  const clientLabel = client ? client.name : 'No client selected';
  const importCount = uploads.length;
  const fileTypes = uploads.map((upload) => upload.kind).join(', ') || 'none';
  const compliance = client ? calculateComplianceScore(client) : 0;

  return [
    `Client: ${clientLabel}`,
    `Imported files: ${importCount}`,
    `Document types: ${fileTypes}`,
    `Compliance score: ${compliance}%`,
    'Next step: review extracted records, validate GSTIN details, and prepare filing notes for the GST portal.',
  ].join('\n');
}
