import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSummary, calculateComplianceScore, createClient, filterClients, removeClient } from '../utils.js';

test('createClient builds a client object with defaults', () => {
  const client = createClient({
    name: 'Alpha Traders',
    gstin: '22AAAAA0000A1Z5',
    email: 'ops@example.com',
    portalUrl: 'https://gst.gov.in',
    notes: 'Priority filing',
    group: 'Quarterly',
  });

  assert.equal(client.name, 'Alpha Traders');
  assert.equal(client.gstin, '22AAAAA0000A1Z5');
  assert.equal(client.email, 'ops@example.com');
  assert.equal(client.group, 'Quarterly');
  assert.match(client.id, /.+/);
});

test('removeClient removes the target client', () => {
  const clients = [
    { id: '1', name: 'One' },
    { id: '2', name: 'Two' },
  ];

  const remaining = removeClient(clients, '2');

  assert.deepEqual(remaining, [{ id: '1', name: 'One' }]);
});

test('buildSummary creates a readable workflow summary', () => {
  const summary = buildSummary({ name: 'Beta Enterprises' }, [{ kind: 'csv' }, { kind: 'pdf' }]);

  assert.match(summary, /Client: Beta Enterprises/);
  assert.match(summary, /Imported files: 2/);
  assert.match(summary, /Document types: csv, pdf/);
});

test('filterClients narrows the list by search and group', () => {
  const clients = [
    { id: '1', name: 'Alpha Traders', gstin: '22AAAA0000A1Z5', group: 'Monthly' },
    { id: '2', name: 'Beta Enterprises', gstin: '33BBBB0000A1Z5', group: 'Quarterly' },
  ];

  const filtered = filterClients(clients, 'beta', 'All groups');

  assert.deepEqual(filtered, [{ id: '2', name: 'Beta Enterprises', gstin: '33BBBB0000A1Z5', group: 'Quarterly' }]);
});

test('calculateComplianceScore reflects filing and notice health', () => {
  const score = calculateComplianceScore({ lastFilingStatus: 'Filed', pendingNotices: 1 });

  assert.equal(score, 85);
});
