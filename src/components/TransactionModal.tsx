import React, { useState } from 'react';
import { X, CheckCircle, Clock, XCircle, FileText, CreditCard, User, Mail, Calendar } from 'lucide-react';
import type { Transaction, Comment } from '../types/dashboard';
import { CommentThread } from './CommentThread';
import { InvoiceModal } from './InvoiceModal';

interface TransactionModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  comments?: Comment[];
  onAddComment?: (entityId: string, entityType: 'transaction' | 'deployment', text: string) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  transaction,
  onClose,
  comments = [],
  onAddComment,
}) => {
  const [showInvoice, setShowInvoice] = useState(false);

  if (!transaction) return null;

  const txnComments = comments.filter((c) => c.entityId === transaction.id);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={onClose}
      >
        <div
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-md), var(--shadow-glow)',
            border: '1px solid var(--border-highlight)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Transaction Receipt
              </span>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {transaction.id}
              </h3>
            </div>
            <button className="btn-icon" onClick={onClose} style={{ width: '32px', height: '32px' }}>
              <X size={16} />
            </button>
          </div>

          {/* Amount Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              textAlign: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Billed Amount</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
              ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
            <div style={{ display: 'inline-flex', marginTop: '0.35rem' }}>
              {transaction.status === 'completed' && (
                <span className="badge badge-success">
                  <CheckCircle size={12} /> Payment Verified &amp; Settled
                </span>
              )}
              {transaction.status === 'pending' && (
                <span className="badge badge-pending">
                  <Clock size={12} /> Processing Wire Transfer
                </span>
              )}
              {transaction.status === 'failed' && (
                <span className="badge badge-failed">
                  <XCircle size={12} /> Payment Failed
                </span>
              )}
            </div>
          </div>

          {/* Detail List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={14} /> Customer Name
              </span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{transaction.customerName}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} /> Contact Email
              </span>
              <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>{transaction.email}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CreditCard size={14} /> Product Tier
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{transaction.type}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CreditCard size={14} /> Payment Method
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{transaction.method}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={14} /> Timestamp
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{transaction.date}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            <button
              className="btn-secondary"
              onClick={() => setShowInvoice(true)}
              style={{ flex: 1 }}
            >
              <FileText size={15} /> Generate Invoice
            </button>
            <button className="btn-primary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
              Close Detail
            </button>
          </div>

          {/* Comment Thread */}
          {onAddComment && (
            <CommentThread
              comments={txnComments}
              entityId={transaction.id}
              entityType="transaction"
              onAddComment={onAddComment}
            />
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && (
        <InvoiceModal transaction={transaction} onClose={() => setShowInvoice(false)} />
      )}
    </>
  );
};
