import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const BENCHMARK_FILE = path.join(DATA_DIR, 'benchmark_runs.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadRuns() {
  ensureDataDir();
  if (!fs.existsSync(BENCHMARK_FILE)) return [];
  try {
    const raw = fs.readFileSync(BENCHMARK_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function saveRuns(runs) {
  ensureDataDir();
  try {
    // Keep max 5000 run records for history
    const trimmed = runs.slice(-5000);
    fs.writeFileSync(BENCHMARK_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save benchmark runs:', err.message);
  }
}

export function recordBenchmarkRun({ scenarioId, scenarioName, isAuthorized, breachCode, expectedOutcome, latency, timestamp = Date.now() }) {
  const runs = loadRuns();
  const run = {
    id: `RUN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    scenarioId,
    scenarioName: scenarioName || scenarioId,
    isAuthorized,
    breachCode: breachCode || 'SUCCESS',
    expectedOutcome: expectedOutcome || (isAuthorized ? 'AUTHORIZED' : 'BLOCKED'),
    isPassed: (expectedOutcome === 'AUTHORIZED' && isAuthorized) || (expectedOutcome === 'BLOCKED' && !isAuthorized),
    latency: {
      totalMs: Number(latency.totalMs.toFixed(3)),
      queryMs: Number((latency.queryMs || 0).toFixed(3)),
      cryptoMs: Number((latency.cryptoMs || 0).toFixed(3)),
      evaluationMs: Number((latency.evaluationMs || 0).toFixed(3)),
    },
    timestamp,
  };
  runs.push(run);
  saveRuns(runs);
  return run;
}

export function getAggregateBenchmarkStats() {
  const runs = loadRuns();
  if (runs.length === 0) {
    return {
      totalRuns: 0,
      overallAccuracyPct: 100,
      overallAvgLatencyMs: 0,
      scenarioStats: [],
      recentRuns: [],
    };
  }

  const scenarioGroups = {};
  let totalPassed = 0;
  let totalLatencySum = 0;

  for (const r of runs) {
    if (r.isPassed) totalPassed++;
    totalLatencySum += r.latency.totalMs;

    if (!scenarioGroups[r.scenarioId]) {
      scenarioGroups[r.scenarioId] = {
        scenarioId: r.scenarioId,
        scenarioName: r.scenarioName,
        total: 0,
        passed: 0,
        latencies: [],
        cryptoLatencies: [],
        breachCodes: {},
      };
    }
    const group = scenarioGroups[r.scenarioId];
    group.total++;
    if (r.isPassed) group.passed++;
    group.latencies.push(r.latency.totalMs);
    group.cryptoLatencies.push(r.latency.cryptoMs);
    group.breachCodes[r.breachCode] = (group.breachCodes[r.breachCode] || 0) + 1;
  }

  const scenarioStats = Object.values(scenarioGroups).map(g => {
    g.latencies.sort((a, b) => a - b);
    const count = g.total;
    const avgMs = g.latencies.reduce((sum, v) => sum + v, 0) / count;
    const p95Ms = g.latencies[Math.floor(count * 0.95)] || g.latencies[count - 1];
    const minMs = g.latencies[0];
    const maxMs = g.latencies[count - 1];
    const avgCryptoMs = g.cryptoLatencies.reduce((sum, v) => sum + v, 0) / count;

    return {
      scenarioId: g.scenarioId,
      scenarioName: g.scenarioName,
      totalRuns: count,
      accuracyPct: Number(((g.passed / count) * 100).toFixed(1)),
      latency: {
        minMs: Number(minMs.toFixed(3)),
        avgMs: Number(avgMs.toFixed(3)),
        p95Ms: Number(p95Ms.toFixed(3)),
        maxMs: Number(maxMs.toFixed(3)),
        avgCryptoMs: Number(avgCryptoMs.toFixed(3)),
      },
      mostCommonBreach: Object.entries(g.breachCodes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'SUCCESS',
    };
  });

  return {
    totalRuns: runs.length,
    overallAccuracyPct: Number(((totalPassed / runs.length) * 100).toFixed(1)),
    overallAvgLatencyMs: Number((totalLatencySum / runs.length).toFixed(3)),
    scenarioStats,
    recentRuns: runs.slice(-20).reverse(),
  };
}
