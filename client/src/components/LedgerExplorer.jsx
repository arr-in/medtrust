import React, { useState, useEffect } from 'react';
import { Blocks, Hash, Clock, ShieldCheck, ChevronDown, ChevronRight, Layers, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getDRALedger } from '../services/api';

export default function LedgerExplorer() {
  const [ledgerData, setLedgerData] = useState(null);
  const [expandedHeight, setExpandedHeight] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    try {
      const data = await getDRALedger();
      setLedgerData(data);
    } catch (err) {
      console.error('Failed to load ledger blocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 3500);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (height) => {
    setExpandedHeight(expandedHeight === height ? null : height);
  };

  const chartData = ledgerData?.blocks ? [...ledgerData.blocks].reverse().map(b => ({
    block: `#${b.height}`,
    type: b.transactions[0]?.type || 'TX',
    txCount: b.txCount || 1,
  })) : [];

  return (
    <div className="portal-container">
      <div className="portal-banner">
        <div className="banner-profile">
          <div className="avatar-box avatar-ledger">
            <Blocks size={24} />
          </div>
          <div>
            <div className="banner-title-row">
              <h2 className="banner-title">Consortium Blockchain Ledger Explorer</h2>
              <span className="badge-ledger">Channel: medtrust-channel</span>
            </div>
            <p className="banner-sub">
              Immutable chain of cryptographically linked blocks verified across Hyperledger Fabric consortium peers.
            </p>
          </div>
        </div>

        <div className="crypto-assurance-pill">
          <ShieldCheck size={14} className="text-emerald" />
          <span>SHA-256 Block Hashing & Merkle Integrity</span>
        </div>
      </div>

      {/* Block Activity Recharts Section */}
      {chartData.length > 0 && (
        <div className="panel-card mb-6">
          <div className="panel-header">
            <BarChart2 size={18} className="text-emerald" />
            <h3 className="panel-title">Immutable Block Production Timeline</h3>
          </div>
          <div className="h-48 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="block" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Bar dataKey="txCount" name="Transactions Committed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {ledgerData && (
        <div className="panel-card">
          <div className="panel-header">
            <Layers size={18} className="text-cyan" />
            <h3 className="panel-title">
              Block Chain Sequence (Total Height: #{ledgerData.blockHeight})
            </h3>
          </div>

          <div className="blocks-list">
            {ledgerData.blocks.map((block) => {
              const isExpanded = expandedHeight === block.height;
              const tx = block.transactions[0];

              return (
                <div key={block.height} className="block-item-card">
                  <div className="block-item-summary" onClick={() => toggleExpand(block.height)}>
                    <div className="block-height-tag font-mono">
                      <span className="text-muted text-xs">BLOCK</span>
                      <span className="text-base font-bold text-cyan">#{block.height}</span>
                    </div>

                    <div className="block-info-body">
                      <div className="block-title-line">
                        <span className="tx-type-tag font-mono text-xs">{tx.type}</span>
                        <span className="tx-id font-mono text-xs text-muted">{tx.txId}</span>
                        <span className="block-time text-xs text-muted">
                          <Clock size={11} className="inline-icon" /> {new Date(block.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="block-hash-line font-mono text-xs text-muted">
                        <span className="hash-prefix">Hash:</span> {block.blockHash}
                      </div>
                    </div>

                    <button className="expand-chevron-btn">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="block-detail-payload">
                      <div className="hash-chain-row font-mono text-xs">
                        <div>
                          <span className="text-muted">Previous Block Hash: </span>
                          <span className="text-purple">{block.prevHash}</span>
                        </div>
                        <div>
                          <span className="text-muted">Current Block Hash: </span>
                          <span className="text-cyan">{block.blockHash}</span>
                        </div>
                      </div>

                      <div className="payload-json-wrap">
                        <div className="json-label">Transaction Payload (CouchDB State Diff):</div>
                        <pre className="json-code font-mono">
                          {JSON.stringify(tx.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
