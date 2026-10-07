import React from 'react';
import { X, Printer, Building2, Phone, Mail, Globe } from 'lucide-react';
import type { Transaction } from '../types/dashboard';

interface InvoiceModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ transaction, onClose }) => {
  if (!transaction) return null;

  const invoiceNumber = `INV-${transaction.id.replace('TXN-', '')}`;
  const issueDate = transaction.date;
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const subtotal = transaction.amount;
  const taxRate = 0.08;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(.invoice-print-root) { display: none !important; }
          .invoice-print-root { display: block !important; }
          .invoice-overlay { position: static !important; background: white !important; }
          .invoice-modal { box-shadow: none !important; max-height: none !important; }
          .invoice-no-print { display: none !important; }
          .invoice-modal { background: white !important; color: black !important; }
        }
      `}</style>

      <div
        className="invoice-print-root"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          zIndex: 150,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '2rem 1rem',
          overflowY: 'auto',
        }}
        onClick={onClose}
      >
        <div
          className="invoice-modal glass-panel"
          style={{
            width: '100%',
            maxWidth: '680px',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-md), var(--shadow-glow)',
            border: '1px solid var(--border-highlight)',
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            className="btn-icon invoice-no-print"
            onClick={onClose}
            style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', width: '32px', height: '32px' }}
          >
            <X size={16} />
          </button>

          {/* Invoice Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <div
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em',
                  marginBottom: '0.15rem',
                }}
              >
                APEX PRO
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Enterprise Operations Platform
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Building2 size={12} /> Block 4, Clifton, Karachi, PK 75500
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={12} /> +92 321 555 0100
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={12} /> billing@apex.io
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Globe size={12} /> www.apex.io
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Invoice</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {invoiceNumber}
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Issue Date:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{issueDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Due Date:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dueDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: transaction.status === 'completed' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                      textTransform: 'uppercase',
                      fontSize: '0.72rem',
                    }}
                  >
                    {transaction.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border-color)', marginBottom: '1.5rem' }} />

          {/* Bill To Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
              Bill To
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{transaction.customerName}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--accent-purple)', marginTop: '0.15rem' }}>{transaction.email}</div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: '0.5rem 1.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.6rem',
                marginBottom: '0.75rem',
              }}
            >
              <span>Description</span>
              <span style={{ textAlign: 'center' }}>Qty</span>
              <span style={{ textAlign: 'right' }}>Unit Price</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
            </div>

            {/* Single Line Item */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: '0.5rem 1.5rem',
                fontSize: '0.875rem',
                padding: '0.75rem 0',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{transaction.type}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Payment via {transaction.method}
                </div>
              </div>
              <span style={{ textAlign: 'center', color: 'var(--text-secondary)', alignSelf: 'center' }}>1</span>
              <span style={{ textAlign: 'right', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', alignSelf: 'center' }}>
                ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tax (8%)</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '2px solid var(--accent-purple)',
                  paddingTop: '0.5rem',
                  marginTop: '0.25rem',
                  fontWeight: 800,
                }}
              >
                <span style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Total Due</span>
                <span
                  style={{
                    fontSize: '1.15rem',
                    background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div
            style={{
              marginTop: '2rem',
              padding: '1rem',
              background: 'rgba(139, 92, 246, 0.08)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            Thank you for your business! Payment is due within 30 days. For queries, contact{' '}
            <strong style={{ color: 'var(--accent-purple)' }}>billing@apex.io</strong>
          </div>

          {/* Action Buttons */}
          <div className="invoice-no-print" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handlePrint} style={{ flex: 2 }}>
              <Printer size={15} /> Download / Print PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
