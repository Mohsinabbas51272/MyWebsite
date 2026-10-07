import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  ArrowUpDown,
  Download,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { Transaction } from '../types/dashboard';

interface TransactionsViewProps {
  transactions: Transaction[];
  onSelectTransaction: (txn: Transaction) => void;
  onOpenQuickModal: () => void;
  onExportCsv: () => void;
  onShowToast?: (msg: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onSelectTransaction,
  onOpenQuickModal,
  onExportCsv,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sortField, setSortField] = useState<'amount' | 'date'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Filter logic
  const filtered = transactions.filter((t) => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesMethod =
      filterMethod === 'all' ||
      t.method.toLowerCase().includes(filterMethod.toLowerCase());
    const matchesSearch =
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.type.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesMethod && matchesSearch;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'amount') {
      return sortAsc ? a.amount - b.amount : b.amount - a.amount;
    } else {
      return sortAsc
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1;
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Financial Stats Calculation
  const totalVolume = transactions.reduce((acc, curr) => acc + curr.amount, 0);
  const completedVolume = transactions
    .filter((t) => t.status === 'completed')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const successRate = (
    (transactions.filter((t) => t.status === 'completed').length / (transactions.length || 1)) *
    100
  ).toFixed(1);
  const avgOrderValue = (totalVolume / (transactions.length || 1)).toFixed(2);
  const pendingCount = transactions.filter((t) => t.status === 'pending').length;

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
      case 'refunded':
        return (
          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <RotateCcw size={12} /> Refunded
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
        <div className="welcome-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              <CreditCard size={12} /> Payment Ledger Live
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stripe, PayPal & Wire Gateway</span>
          </div>
          <h1>Transaction Ledger & Financial Settlement</h1>
          <p>
            Audit real-time subscription billings, one-time charges, recurring invoices, and dispute settlements.
          </p>
        </div>

        <div className="banner-actions">
          <button className="btn-secondary" onClick={onExportCsv}>
            <Download size={15} /> Export Ledger CSV
          </button>
          <button className="btn-primary" onClick={onOpenQuickModal}>
            <Plus size={15} /> Record Transaction
          </button>
        </div>
      </div>

      {/* Financial Stat Cards */}
      <div className="kpi-grid">
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Processed</span>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-primary)' }}>
            ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
            ${completedVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })} settled
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Success Clearance Rate</span>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-primary)' }}>
            {successRate}%
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across all integrated payment rails</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Average Transaction Size</span>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-primary)' }}>
            ${avgOrderValue}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blended SaaS & Enterprise license</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pending Wire Transfers</span>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-amber)' }}>
            {pendingCount} Pending
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting bank clearance confirmation</span>
        </div>
      </div>

      {/* Main Ledger Table Container */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Controls Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            {['all', 'completed', 'pending', 'failed', 'refunded'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setFilterStatus(st);
                  setCurrentPage(1);
                }}
                style={{
                  border: 'none',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  background: filterStatus === st ? 'var(--bg-secondary)' : 'transparent',
                  color: filterStatus === st ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  boxShadow: filterStatus === st ? 'var(--shadow-sm)' : 'none',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Payment Method Filter Dropdown & Search */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={filterMethod}
              onChange={(e) => {
                setFilterMethod(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Payment Rails</option>
              <option value="stripe">Stripe Credit Card</option>
              <option value="paypal">PayPal</option>
              <option value="wire">Bank Wire Transfer</option>
              <option value="apple">Apple Pay</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by customer name, email address, transaction reference ID, or plan type..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.4rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Table View */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Reference</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Customer</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Description / Tier</th>
                <th
                  style={{ padding: '0.75rem 0.5rem', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => toggleSort('amount')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Amount <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Method</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Status</th>
                <th
                  style={{ padding: '0.75rem 0.5rem', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => toggleSort('date')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Date <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No transactions match your current search or filter criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((t) => (
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
                    {/* Reference ID */}
                    <td style={{ padding: '0.85rem 0.5rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-purple)' }}>
                      {t.id}
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <img
                          src={t.customerAvatar}
                          alt={t.customerName}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                            {t.customerName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                      {t.type}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      ${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Method */}
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {t.method}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.85rem 0.5rem' }}>{getStatusBadge(t.status)}</td>

                    {/* Date */}
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {t.date}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                      <button
                        className="btn-icon"
                        style={{ width: '30px', height: '30px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTransaction(t);
                        }}
                        title="View Transaction Breakdown"
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

        {/* Pagination Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {paginated.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
            {Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length} entries
          </span>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn-icon"
              style={{ width: '32px', height: '32px' }}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', padding: '0 0.5rem' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn-icon"
              style={{ width: '32px', height: '32px' }}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
