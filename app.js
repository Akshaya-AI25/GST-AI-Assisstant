import { buildSummary, calculateComplianceScore, createClient, filterClients, formatBytes, removeClient } from './utils.js';

const STORAGE_KEY = 'gst-ai-clients';
const UPLOAD_STORAGE_KEY = 'gst-ai-uploads';

const clientForm = document.querySelector('#clientForm');
const clientList = document.querySelector('#clientList');
const searchInput = document.querySelector('#clientSearch');
const groupFilter = document.querySelector('#groupFilter');
const fileInput = document.querySelector('#fileInput');
const uploadList = document.querySelector('#uploadList');
const generateSummaryButton = document.querySelector('#generateSummary');
const summaryOutput = document.querySelector('#summaryOutput');
const dashboardOutput = document.querySelector('#dashboardOutput');
const connectPortalButton = document.querySelector('#connectPortal');
const refreshPortalButton = document.querySelector('#refreshPortal');
const portalOutput = document.querySelector('#portalOutput');
const aiInsightOutput = document.querySelector('#aiInsightOutput');
const reconciliationOutput = document.querySelector('#reconciliationOutput');
const documentInput = document.querySelector('#documentInput');
const documentOutput = document.querySelector('#documentOutput');
const dashboardExtendedOutput = document.querySelector('#dashboardExtendedOutput');
const complianceChart = document.querySelector('#complianceChart');
const filingChart = document.querySelector('#filingChart');
const pieChart = document.querySelector('#pieChart');
const noticeChart = document.querySelector('#noticeChart');
const turnoverChart = document.querySelector('#turnoverChart');
const reportOutput = document.querySelector('#reportOutput');
const chatInput = document.querySelector('#chatInput');
const chatSendButton = document.querySelector('#chatSend');
const chatOutput = document.querySelector('#chatOutput');
const editClientIdInput = document.querySelector('#editClientId');
const cancelEditButton = document.querySelector('#cancelEdit');
const statusMessage = document.querySelector('#statusMessage');

const state = {
  clients: loadClients(),
  uploads: loadUploads(),
  activeClientId: null,
  search: '',
  group: 'All groups',
  editingClientId: null,
};

clientForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(clientForm);
  const payload = {
    name: data.get('clientName') || '',
    gstin: data.get('gstin') || '',
    email: data.get('email') || '',
    portalUrl: data.get('portalUrl') || '',
    notes: data.get('notes') || '',
    group: data.get('group') || 'Monthly',
    lastFilingStatus: data.get('lastFilingStatus') || 'Pending',
    pendingNotices: data.get('pendingNotices') || 0,
    complianceScore: data.get('complianceScore') || 0,
  };

  if (state.editingClientId) {
    state.clients = state.clients.map((client) => (client.id === state.editingClientId ? { ...client, ...payload, id: client.id } : client));
    showStatus('Client updated.');
  } else {
    const nextClient = createClient(payload);
    state.clients = [nextClient, ...state.clients];
    state.activeClientId = nextClient.id;
    showStatus('Client added.');
  }

  state.editingClientId = null;
  persistClients();
  clientForm.reset();
  renderClients();
  renderSummary();
  renderDashboard();
});

fileInput.addEventListener('change', async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  for (const file of files) {
    const upload = await processFile(file);
    state.uploads = [upload, ...state.uploads];
  }

  persistUploads();
  renderUploads();
  renderSummary();
  fileInput.value = '';
});

generateSummaryButton.addEventListener('click', () => {
  renderSummary();
});

connectPortalButton.addEventListener('click', () => {
  const activeClient = getActiveClient();
  if (!activeClient) {
    portalOutput.textContent = 'Add a client first to connect a GST portal profile.';
    return;
  }

  portalOutput.textContent = `Secure login requested for ${activeClient.name} (${activeClient.gstin || 'GSTIN pending'}). In a production deployment, this would authenticate through an authorized GST Suvidha Provider.`;
});

refreshPortalButton.addEventListener('click', () => {
  const activeClient = getActiveClient();
  if (!activeClient) {
    portalOutput.textContent = 'No active client selected for portal refresh.';
    return;
  }

  portalOutput.textContent = `Refreshed GST data for ${activeClient.name}: GSTR-1, GSTR-3B, GSTR-2B, GSTR-2A, ledger, notices, and filing history are synced for review.`;
  renderSummary();
  renderReconciliation();
});

documentInput.addEventListener('change', async (event) => {
  const [file] = Array.from(event.target.files || []);
  if (!file) return;

  const text = await file.text().catch(() => '');
  const extracted = extractDocumentDetails(text, file.name);
  documentOutput.textContent = extracted;
  documentInput.value = '';
});

chatSendButton.addEventListener('click', () => {
  const prompt = chatInput.value.trim();
  if (!prompt) return;

  chatOutput.textContent = respondToPrompt(prompt, state.clients);
  chatInput.value = '';
});

const reportButtons = [
  { id: 'reportGstr1', label: 'GSTR-1 Working' },
  { id: 'report3b', label: '3B Working' },
  { id: 'reportItc', label: 'ITC Report' },
  { id: 'reportTurnover', label: 'Turnover Report' },
  { id: 'reportHsn', label: 'HSN Summary' },
  { id: 'reportVendor', label: 'Vendor Mismatch' },
  { id: 'reportCustomer', label: 'Customer Mismatch' },
  { id: 'reportNotice', label: 'Notice Register' },
];

reportButtons.forEach(({ id, label }) => {
  document.querySelector(`#${id}`).addEventListener('click', () => {
    reportOutput.textContent = `${label} generated for the current client set. Export to PDF, Excel, or CSV is available in a production deployment.`;
  });
});

clientList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-client-id]');
  if (!button) return;

  const clientId = button.dataset.clientId;
  if (button.dataset.action === 'delete') {
    state.clients = removeClient(state.clients, clientId);
    if (state.activeClientId === clientId) {
      state.activeClientId = state.clients[0]?.id || null;
    }
    persistClients();
    renderClients();
    renderSummary();
    renderDashboard();
  } else if (button.dataset.action === 'select') {
    state.activeClientId = clientId;
    renderClients();
    renderSummary();
  } else if (button.dataset.action === 'edit') {
    const client = state.clients.find((item) => item.id === clientId);
    if (!client) return;
    state.editingClientId = client.id;
    populateForm(client);
    renderClients();
  }
});

searchInput.addEventListener('input', (event) => {
  state.search = event.target.value;
  renderClients();
});

groupFilter.addEventListener('change', (event) => {
  state.group = event.target.value;
  renderClients();
});

cancelEditButton.addEventListener('click', () => {
  state.editingClientId = null;
  editClientIdInput.value = '';
  clientForm.reset();
  renderClients();
  showStatus('Edit cancelled.');
});

renderClients();
renderUploads();
renderSummary();
renderDashboard();
renderReconciliation();
renderDashboardExtended();
renderAiInsight();

function loadClients() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function persistClients() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
}

function loadUploads() {
  const stored = localStorage.getItem(UPLOAD_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function persistUploads() {
  localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(state.uploads));
}

function renderClients() {
  const filteredClients = filterClients(state.clients, state.search, state.group);

  if (!filteredClients.length) {
    clientList.innerHTML = '<div class="client-card">No matching clients found.</div>';
    return;
  }

  clientList.innerHTML = filteredClients
    .map((client) => {
      const selected = client.id === state.activeClientId ? 'selected' : '';
      const score = calculateComplianceScore(client);
      return `
        <article class="client-card ${selected}">
          <header>
            <h4>${client.name}</h4>
            <div>
              <button class="secondary" data-client-id="${client.id}" data-action="select" type="button">Select</button>
              <button class="secondary" data-client-id="${client.id}" data-action="edit" type="button">Edit</button>
              <button class="secondary" data-client-id="${client.id}" data-action="delete" type="button">Delete</button>
            </div>
          </header>
          <div class="client-meta">GSTIN: ${client.gstin || 'Not provided'}</div>
          <div class="client-meta">Group: ${client.group || 'Monthly'}</div>
          <div class="client-meta">Last filing: ${client.lastFilingStatus || 'Pending'}</div>
          <div class="client-meta">Pending notices: ${client.pendingNotices || 0}</div>
          <div class="client-meta">Compliance score: ${score}%</div>
          <div class="client-meta">Portal: ${client.portalUrl || 'Not provided'}</div>
        </article>
      `;
    })
    .join('');
}

function renderUploads() {
  if (!state.uploads.length) {
    uploadList.innerHTML = '<div class="upload-card">No uploads yet. Select a PDF, JSON, Excel, or CSV file.</div>';
    return;
  }

  uploadList.innerHTML = state.uploads
    .map((upload) => `
      <article class="upload-card">
        <strong>${upload.fileName}</strong>
        <div class="upload-meta">Type: ${upload.kind} • ${formatBytes(upload.size)}</div>
        <div class="upload-meta">${upload.summary}</div>
      </article>
    `)
    .join('');
}

function renderSummary() {
  const activeClient = getActiveClient();
  summaryOutput.textContent = buildSummary(activeClient, state.uploads);
}

function getActiveClient() {
  return state.clients.find((client) => client.id === state.activeClientId) || state.clients[0] || null;
}

function renderDashboard() {
  const counts = state.clients.reduce(
    (accumulator, client) => {
      accumulator.total += 1;
      accumulator[client.group || 'Monthly'] = (accumulator[client.group || 'Monthly'] || 0) + 1;
      return accumulator;
    },
    { total: 0 },
  );

  const pending = state.clients.filter((client) => client.lastFilingStatus !== 'Filed').length;
  const notices = state.clients.reduce((sum, client) => sum + (Number(client.pendingNotices) || 0), 0);
  const averageScore = state.clients.length ? Math.round(state.clients.reduce((sum, client) => sum + calculateComplianceScore(client), 0) / state.clients.length) : 0;

  dashboardOutput.innerHTML = `
    <div class="dashboard-card"><strong>${counts.total}</strong><span>Total clients</span></div>
    <div class="dashboard-card"><strong>${pending}</strong><span>Pending filings</span></div>
    <div class="dashboard-card"><strong>${notices}</strong><span>Pending notices</span></div>
    <div class="dashboard-card"><strong>${averageScore}%</strong><span>Avg compliance</span></div>
  `;
}

function renderReconciliation() {
  const activeClient = getActiveClient();
  const summary = activeClient
    ? `Books vs GSTR-1: ${activeClient.lastFilingStatus === 'Filed' ? 'Aligned' : '2 mismatches pending'}; Books vs 2B: 1 mismatch; GSTR-1 vs 3B: 1 variance; TDS/TCS vs books: pending review.`
    : 'Select a client to see reconciliation insights.';
  reconciliationOutput.textContent = summary;
}

function renderDashboardExtended() {
  const pendingReturns = state.clients.filter((client) => client.lastFilingStatus !== 'Filed').length;
  const notices = state.clients.reduce((sum, client) => sum + (Number(client.pendingNotices) || 0), 0);
  const mismatches = state.clients.length ? Math.max(1, Math.round(state.clients.length / 2)) : 0;
  const complianceValues = state.clients.length ? state.clients.map((client) => calculateComplianceScore(client)) : [0, 0, 0, 0];
  const filingValues = state.clients.length ? state.clients.map((client) => (client.lastFilingStatus === 'Filed' ? 1 : 0)) : [0, 0, 0, 0];
  const pendingFiledValues = [pendingReturns, Math.max(0, state.clients.length - pendingReturns)];
  const noticeValues = state.clients.length ? state.clients.map((client) => Number(client.pendingNotices) || 0) : [0, 0, 0, 0];
  const turnoverValues = state.clients.length ? state.clients.map((client, index) => 120000 + index * 25000 + (client.pendingNotices || 0) * 5000) : [120000, 145000, 170000, 195000];

  dashboardExtendedOutput.innerHTML = `
    <div class="dashboard-card"><strong>${pendingReturns}</strong><span>Pending returns</span></div>
    <div class="dashboard-card"><strong>${notices}</strong><span>Notices</span></div>
    <div class="dashboard-card"><strong>${mismatches}</strong><span>Reconciliation issues</span></div>
    <div class="dashboard-card"><strong>${state.uploads.length}</strong><span>Imported documents</span></div>
  `;

  renderLineChart(complianceChart, complianceValues, ['#2ca4ff', '#4bcc8f']);
  renderBarChart(filingChart, filingValues, ['#2ca4ff', '#4bcc8f']);
  renderPieChart(pieChart, pendingFiledValues, ['#2ca4ff', '#4bcc8f']);
  renderBarChart(noticeChart, noticeValues, ['#ff8a5b', '#2ca4ff']);
  renderLineChart(turnoverChart, turnoverValues, ['#4bcc8f', '#2ca4ff']);
}

function renderLineChart(svg, values, colors) {
  const width = 320;
  const height = 160;
  const padding = 20;
  const maxValue = Math.max(...values, 100);
  const points = values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
    const y = height - padding - (value / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  });

  svg.innerHTML = `
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.2)" />
    <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.2)" />
    <polyline fill="none" stroke="${colors[0]}" stroke-width="3" points="${points.join(' ')}" />
    ${points.map((point, index) => `<circle cx="${point.split(',')[0]}" cy="${point.split(',')[1]}" r="4" fill="${colors[1]}" />`).join('')}
  `;
}

function renderBarChart(svg, values, colors) {
  const width = 320;
  const height = 160;
  const padding = 24;
  const barWidth = 36;
  const maxValue = Math.max(...values, 1);
  const gap = 20;

  svg.innerHTML = values
    .map((value, index) => {
      const x = padding + index * (barWidth + gap);
      const barHeight = (value / maxValue) * (height - padding * 2);
      const y = height - padding - barHeight;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" fill="${colors[index % colors.length]}" />`;
    })
    .join('');
}

function renderPieChart(svg, values, colors) {
  const width = 320;
  const height = 160;
  const radius = 45;
  const centerX = 100;
  const centerY = 80;
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  let startAngle = -90;

  const segments = values.map((value, index) => {
    const slice = (value / total) * 360;
    const endAngle = startAngle + slice;
    const largeArc = slice > 180 ? 1 : 0;
    const start = polarToCartesian(centerX, centerY, radius, startAngle);
    const end = polarToCartesian(centerX, centerY, radius, endAngle);
    startAngle = endAngle;
    return `<path d="M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z" fill="${colors[index % colors.length]}" />`;
  });

  svg.innerHTML = `
    ${segments.join('')}
    <circle cx="${centerX}" cy="${centerY}" r="22" fill="#07111f" />
    <text x="${centerX}" y="${centerY - 4}" text-anchor="middle" fill="#f4f7fd" font-size="12">${values[0] || 0}</text>
    <text x="${centerX}" y="${centerY + 12}" text-anchor="middle" fill="#f4f7fd" font-size="12">Pending</text>
  `;
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180.0);
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function renderAiInsight() {
  const activeClient = getActiveClient();
  const insight = activeClient
    ? `${activeClient.name} has ${activeClient.pendingNotices || 0} pending notice(s) and a ${calculateComplianceScore(activeClient)}% compliance score. The likely cause of variance is a timing gap between books and the latest filing.`
    : 'Add a client to receive AI-generated GST explanations.';
  aiInsightOutput.textContent = insight;
}

function populateForm(client) {
  editClientIdInput.value = client.id;
  clientForm.querySelector('#clientName').value = client.name || '';
  clientForm.querySelector('#gstin').value = client.gstin || '';
  clientForm.querySelector('#email').value = client.email || '';
  clientForm.querySelector('#portalUrl').value = client.portalUrl || '';
  clientForm.querySelector('#notes').value = client.notes || '';
  clientForm.querySelector('#group').value = client.group || 'Monthly';
  clientForm.querySelector('#lastFilingStatus').value = client.lastFilingStatus || 'Pending';
  clientForm.querySelector('#pendingNotices').value = client.pendingNotices || 0;
  clientForm.querySelector('#complianceScore').value = client.complianceScore || 0;
}

function showStatus(message) {
  statusMessage.textContent = message;
  window.setTimeout(() => {
    statusMessage.textContent = '';
  }, 1800);
}

function extractDocumentDetails(text, fileName) {
  const lowerName = fileName.toLowerCase();
  const lines = text.split(/\n|\r/).filter(Boolean);
  const dueMatch = lines.find((line) => /due|deadline|reply by|date/i.test(line));
  const amountMatch = lines.find((line) => /amount|tax|penalty|demand/i.test(line));
  return [
    `Document: ${fileName}`,
    `Relevant sections: ${lowerName.includes('notice') ? 'Notice summary extracted' : lowerName.includes('order') ? 'Assessment order review' : 'Registration or filing content'}`,
    `Due date: ${dueMatch ? dueMatch : 'Not identified'}`,
    `Amount demanded: ${amountMatch ? amountMatch : 'Not identified'}`,
    `Required documents: GST returns, invoice copies, ledger statements, and supporting evidence.`,
  ].join('\n');
}

function respondToPrompt(prompt, clients) {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('pending clients')) {
    return clients.length
      ? `Pending clients: ${clients.filter((client) => client.lastFilingStatus !== 'Filed').map((client) => client.name).join(', ') || 'None'}`
      : 'No clients available.';
  }

  if (lowerPrompt.includes('maximum itc mismatch')) {
    return 'The highest ITC mismatch appears in clients with delayed filings and pending notices. Review vendor invoices and GSTR-2B matching first.';
  }

  if (lowerPrompt.includes('negative liability')) {
    return 'Negative liability typically indicates excess ITC or a credit balance. Review the cash ledger, liability ledger, and input tax credit adjustments.';
  }

  if (lowerPrompt.includes('reply to gst notice')) {
    return 'Draft reply: “We respectfully submit that the matter is under review. We will provide the required invoices, ledger statements, and supporting evidence within the stipulated timeline.”';
  }

  if (lowerPrompt.includes('email')) {
    return 'Draft email: “Dear Client, please share the missing invoices and ledger entries so we can reconcile the filings and close the compliance gap promptly.”';
  }

  return `AI assistant: I can help with pending clients, ITC mismatch analysis, negative liability explanations, notice reply drafts, and email drafts. Try a prompt such as “Show all pending clients.”`;
}

async function processFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const base = {
    fileName: file.name,
    size: file.size,
    kind: extension,
  };

  if (extension === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    return {
      ...base,
      summary: `Parsed JSON object with ${Object.keys(parsed).length || 0} top-level field(s).`,
    };
  }

  if (extension === 'csv') {
    const text = await file.text();
    const parsed = window.Papa.parse(text, { header: true, skipEmptyLines: true });
    return {
      ...base,
      summary: `Parsed ${parsed.data.length || 0} CSV row(s).`,
    };
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const data = await file.arrayBuffer();
    const workbook = window.XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    return {
      ...base,
      summary: `Parsed ${rows.length || 0} Excel row(s) from ${sheetName}.`,
    };
  }

  if (extension === 'pdf') {
    const data = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data }).promise;
    let text = '';
    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(' ');
    }
    return {
      ...base,
      summary: `Captured PDF text with ${text.trim().length || 0} characters.`,
    };
  }

  return {
    ...base,
    summary: 'File received and queued for review.',
  };
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
  });
}
