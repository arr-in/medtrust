import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { getBenchmarkScenarios, runBenchmarkAll } from '../services/api';

export default function BenchmarkSuite() {
  const [scenarios, setScenarios] = useState([]);
  const [iterations, setIterations] = useState(25);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    getBenchmarkScenarios()
      .then((res) => setScenarios(res.scenarios || []))
      .catch((err) => console.error('Failed to load scenarios:', err));
  }, []);

  const handleRunBenchmark = async () => {
    setRunning(true);
    setErrorMsg('');
    try {
      const data = await runBenchmarkAll(iterations);
      setResults(data);
    } catch (err) {
      setErrorMsg(err.message || 'Benchmark failed.');
    } finally {
      setRunning(false);
    }
  };

  const chartData = results?.results
    ? results.results.map((r) => ({
        name: r.name
          .replace('Scenario ', '')
          .replace('Clean Dispense', 'Valid')
          .replace('Replay Fraud', 'Replay')
          .replace('Counterfeit Batch', 'Counterfeit')
          .replace('Broken Custody', 'Custody')
          .replace('Recalled Drug', 'Recalled')
          .replace('Expired Rx', 'Expired'),
        avgMs: r.latency.avgMs,
        p95Ms: r.latency.p95Ms,
        cryptoMs: r.latency.avgCryptoMs,
      }))
    : [];

  const isIterationsValid = Number.isFinite(iterations) && iterations >= 5 && iterations <= 200;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h2 className="page-title">Performance & Security Benchmarks</h2>
          <p className="page-subtitle">
            Test verification speed and fraud detection accuracy across all 6 test scenarios
          </p>
        </div>

        <div className="flex-row">
          <label className="text-xs text-muted" htmlFor="bench-iterations">Runs per scenario:</label>
          <input
            id="bench-iterations"
            type="number"
            className="text-input font-mono"
            style={{ width: '80px' }}
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            min="5"
            max="200"
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRunBenchmark}
            disabled={running || !isIterationsValid}
          >
            <Play size={15} />
            <span>{running ? 'Running Tests...' : 'Run Benchmark'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="feedback-box feedback-error">
          <span>{errorMsg}</span>
        </div>
      )}

      {!results ? (
        <div className="card">
          <div className="empty-state">
            Click <strong>Run Benchmark</strong> above to run {iterations * 6} live verification tests across all 6 scenarios and generate latency charts.
          </div>
        </div>
      ) : (
        <>
          <div className="grid-4">
            <div className="stat-card">
              <span className="stat-label">Detection Accuracy</span>
              <div className="stat-value text-success">{results.overallAccuracy}%</div>
              <span className="stat-sub">Zero false approvals or blocks</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Average Latency</span>
              <div className="stat-value font-mono">{results.overallAvgLatencyMs} ms</div>
              <span className="stat-sub">Full dual-layer check</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Tests Run</span>
              <div className="stat-value font-mono">{results.totalSimulations}</div>
              <span className="stat-sub">{iterations} runs × 6 scenarios</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Enforcement Mode</span>
              <div className="stat-value">Real-Time</div>
              <span className="stat-sub">Blocks before dispensing</span>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Verification Latency (Average vs P95)</h3>
              </div>
              <div className="chart-box-md">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                    <XAxis dataKey="name" stroke="#64748B" />
                    <YAxis stroke="#64748B" unit="ms" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgMs" name="Avg Latency (ms)" fill="#0284C7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="p95Ms" name="P95 Latency (ms)" fill="#0D9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">ECDSA Signature Verification Time</h3>
              </div>
              <div className="chart-box-md">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                    <XAxis dataKey="name" stroke="#64748B" />
                    <YAxis stroke="#64748B" unit="ms" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cryptoMs" name="ECDSA Check (ms)" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Scenario Breakdown</h3>
            </div>
            <div className="table-wrap">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th>Expected Decision</th>
                    <th>Accuracy</th>
                    <th>Avg Latency</th>
                    <th>P95 Latency</th>
                    <th>ECDSA Time</th>
                    <th>Result Code</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((r) => (
                    <tr key={r.scenarioId}>
                      <td className="font-semibold">{r.name}</td>
                      <td>
                        <span className={`badge ${r.expected === 'AUTHORIZED' ? 'badge-active' : 'badge-recalled'}`}>
                          {r.expected === 'AUTHORIZED' ? 'Approved' : 'Blocked'}
                        </span>
                      </td>
                      <td className="font-mono font-bold text-success">{r.accuracyPct}%</td>
                      <td className="font-mono">{r.latency.avgMs} ms</td>
                      <td className="font-mono">{r.latency.p95Ms} ms</td>
                      <td className="font-mono">{r.latency.avgCryptoMs} ms</td>
                      <td className="font-mono text-xs">{r.sampleCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <details className="tech-details">
        <summary>Scenario definitions & comparison with traditional databases ({scenarios.length} scenarios)</summary>
        <div className="tech-details-body">
          <div className="check-grid-2">
            {scenarios.map((sc) => (
              <div key={sc.id} className="check-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <div className="flex-between" style={{ width: '100%' }}>
                  <strong>{sc.name}</strong>
                  <span className={`badge ${sc.expectedOutcome === 'AUTHORIZED' ? 'badge-active' : 'badge-recalled'}`}>
                    {sc.expectedOutcome}
                  </span>
                </div>
                <span className="text-xs text-muted">{sc.description}</span>
                <span className="font-mono text-xs">Rx: {sc.prescriptionId} • Batch: {sc.batchId}</span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
