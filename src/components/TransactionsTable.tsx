import React, { useState } from 'react';
import {
  Search,
  ArrowUpDown,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Download
} from 'lucide-react';
import type { Transaction } from '../types/dashboard';

interface TransactionsTableProps {
  transactions: Transaction[];
  onSelectTransaction: (txn: Transaction) => void;
  onExportCsv: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  onSelectTransaction,
  onExportCsv,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sortField, setSortField] = useState<'amount' | 'date'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const filtered = transactions.filter((t) => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch =
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.type.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'amount') {
      return sortAsc ? a.amount - b.amount : b.amount - a.amount;
    } else {
      return sortAsc
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  const toggleSort = (field: 'amount' | 'date') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case 'pending':
        return (
          <span className="badge badge-pending">
            <Clock size={12} /> Pending
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="badge badge-failed">
            <XCircle size={12} /> Failed
          </span>
        );
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Table Header & Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Recent Transactions
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Latest payments, subscription renewals, and invoice logs
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            {['all', 'completed', 'pending', 'failed'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  border: 'none',
                  padding: '0.35rem 0.7rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  background: filterStatus === st ? 'var(--bg-secondary)' : 'transparent',
                  color: filterStatus === st ? 'var(--accent-purple)' : 'var(--text-secondary)',
                }}
              >
                {st}
              </button>
            ))}
          </div>

          <button className="btn-secondary" onClick={onExportCsv} style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Local Filter Bar */}
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Filter by customer name, email, or order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 1rem 0.5rem 2.2rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '0.825rem',
            outline: 'none',
          }}
        />
      </div>

      {/* Table Element */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Customer</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Transaction Type</th>
              <th
                style={{ padding: '0.75rem 0.5rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => toggleSort('amount')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Amount <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Status</th>
              <th
                style={{ padding: '0.75rem 0.5rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => toggleSort('date')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  Date & Time <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No transactions match your query filter.
                </td>
              </tr>
            ) : (
              sorted.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => onSelectTransaction(t)}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Customer Info */}
                  <td style={{ padding: '0.85rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <img
                        src={t.customerAvatar}
                        alt={t.customerName}
                        style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                          {t.customerName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: 500 }}>{t.type}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                      Via {t.method}
                    </span>
                  </td>

                  {/* Amount */}
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: '0.85rem 0.5rem' }}>{getStatusBadge(t.status)}</td>

                  {/* Date */}
                  <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {t.date}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                    <button
                      className="btn-icon"
                      style={{ width: '28px', height: '28px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTransaction(t);
                      }}
                    >
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
