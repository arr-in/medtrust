import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getDRALedger } from '../services/api';

const FRIENDLY_TX_TYPES = {
  GENESIS_INITIALIZE: 'Genesis Block Initialized',
  BATCH_GENESIS_REGISTRATION: 'Drug Batch Registered',
  PRESCRIPTION_ISSUED: 'Prescription Issued',
  CUSTODY_TRANSFER_RECORDED: 'Custody Transferred',
  ATOMIC_GATEWAY_DISPENSE: 'Medication Dispensed (Atomic)',
  DRA_BATCH_RECALL_BROADCAST: 'Drug Batch Recalled',
};

export default function LedgerExplorer() {
  const [ledgerData, setLedgerData] = useState(null);
  const [expandedHeight, setExpandedHeight] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);

  const fetchLedger = async () => {
    try {
      const data = await getDRALedger();
      setLedgerData(data);
    } catch (err) {
      console.error('Failed to load ledger blocks:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchLedger, 0);
    const interval = setInterval(fetchLedger, 4000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const toggleExpand = (height) => {
    setExpandedHeight(expandedHeight === height ? null : height);
  };

  const handleCopy = (e, hash) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1800);
  };

  const chartData = ledgerData?.blocks
    ? [...ledgerData.blocks].reverse().map((b) => ({
        block: `#${b.height}`,
        type: FRIENDLY_TX_TYPES[b.transactions[0]?.type] || b.transactions[0]?.type || 'TX',
        txCount: b.txCount || 1,
      }))
    : [];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h2 className="page-title">Blockchain Ledger</h2>
          <p className="page-subtitle">
            Immutable chain of blocks linking every prescription, batch registration, custody transfer, and dispense
          </p>
        </div>
        {ledgerData && (
          <span className="badge badge-fulfilled font-mono">
            Total Blocks: {ledgerData.blockHeight}
          </span>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Block Timeline</h3>
          </div>
          <div className="chart-box-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                <XAxis dataKey="block" stroke="#64748B" />
                <YAxis stroke="#64748B" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="txCount" name="Transactions" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Blocks (Newest First)</h3>
          <span className="text-xs text-muted">Click any block to inspect its hashes and data payload</span>
        </div>

        {!ledgerData ? (
          <div className="empty-state">Loading blockchain blocks...</div>
        ) : (
          <div className="step-timeline">
            {ledgerData.blocks.map((block) => {
              const isExpanded = expandedHeight === block.height;
              const tx = block.transactions[0];

              return (
                <div key={block.height} className="block-row-card">
                  <div className="block-row-header" onClick={() => toggleExpand(block.height)}>
                    <div className="flex-row">
                      <span className="badge badge-neutral font-mono">Block #{block.height}</span>
                      <strong className="text-sm">
                        {FRIENDLY_TX_TYPES[tx.type] || tx.type}
                      </strong>
                      <span className="text-xs text-muted">
                        • {new Date(block.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex-row">
                      <span className="short-hash-pill" title={block.blockHash}>
                        <span>{block.blockHash.slice(0, 8)}...</span>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '2px' }}
                          onClick={(e) => handleCopy(e, block.blockHash)}
                          title="Copy block hash"
                        >
                          {copiedHash === block.blockHash ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </span>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="tech-details-body">
                      <div>
                        <strong>Transaction ID:</strong>{' '}
                        <span className="font-mono">{tx.txId}</span> ({tx.type})
                      </div>
                      <div>
                        <strong>Current Block Hash:</strong>{' '}
                        <span className="font-mono" style={{ wordBreak: 'break-all' }}>{block.blockHash}</span>
                      </div>
                      <div>
                        <strong>Previous Block Hash:</strong>{' '}
                        <span className="font-mono" style={{ wordBreak: 'break-all' }}>{block.prevHash}</span>
                      </div>
                      <div>
                        <strong>Recorded Data:</strong>
                        <pre className="json-pre font-mono" style={{ marginTop: '4px' }}>
                          {JSON.stringify(tx.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
