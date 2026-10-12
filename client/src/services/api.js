const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function fetchApi(endpoint, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
  } catch {
    throw new Error('Backend gateway is offline or unreachable');
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Backend gateway is offline or unreachable');
  }

  if (!res.ok && !data.evaluation) {
    throw new Error(data.error || 'API Request Failed');
  }
  return data;
}

// Health & System
export const getHealth = () => fetchApi('/health');
export const getStakeholders = () => fetchApi('/stakeholders');

// Prescriptions (Module 1)
export const getPrescriptions = () => fetchApi('/prescriptions');
export const getPrescription = (id) => fetchApi(`/prescriptions/${id}`);
export const issuePrescription = (payload) =>
  fetchApi('/prescriptions/issue', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const verifyPrescriptionSalt = (payload) =>
  fetchApi('/prescriptions/verify-salt', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// Drugs & Custody (Module 2)
export const getBatches = () => fetchApi('/drugs/batches');
export const getBatch = (id) => fetchApi(`/drugs/batches/${id}`);
export const registerBatch = (payload) =>
  fetchApi('/drugs/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const transferCustody = (payload) =>
  fetchApi('/drugs/transfer-custody', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// Point-of-Sale Coordinating Gateway
export const previewGatewayCheck = (prescriptionId, batchId, pharmacyId) =>
  fetchApi('/gateway/preview-check', {
    method: 'POST',
    body: JSON.stringify({ prescriptionId, batchId, pharmacyId }),
  });

export const dispenseGateway = (prescriptionId, batchId, pharmacyId) =>
  fetchApi('/gateway/dispense', {
    method: 'POST',
    body: JSON.stringify({ prescriptionId, batchId, pharmacyId }),
  });

// DRA & Auditor
export const getDRAIncidents = () => fetchApi('/dra/incidents');
export const getDRALedger = () => fetchApi('/dra/ledger');
export const getDRAStats = () => fetchApi('/dra/stats');
export const issueDRARecall = (payload) =>
  fetchApi('/dra/recall', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// Benchmark
export const getBenchmarkScenarios = () => fetchApi('/benchmark/scenarios');
export const runBenchmarkAll = (iterations = 20) =>
  fetchApi('/benchmark/run-all', {
    method: 'POST',
    body: JSON.stringify({ iterations }),
  });
