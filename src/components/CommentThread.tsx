import React, { useState } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';
import type { Comment } from '../types/dashboard';

interface CommentThreadProps {
  comments: Comment[];
  entityId: string;
  entityType: 'transaction' | 'deployment';
  onAddComment: (entityId: string, entityType: 'transaction' | 'deployment', text: string) => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  entityId,
  entityType,
  onAddComment,
}) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed) return;
    onAddComment(entityId, entityType, trimmed);
    setNewComment('');
  };

  return (
    <div
      style={{
        marginTop: '1.25rem',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <MessageSquare size={16} style={{ color: 'var(--accent-purple)' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Comments
        </span>
        {comments.length > 0 && (
          <span
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              color: 'var(--accent-purple)',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '1px 7px',
              borderRadius: '20px',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}
          >
            {comments.length}
          </span>
        )}
      </div>

      {/* Comment List */}
      {comments.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '1rem',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-color)',
          }}
        >
          <MessageSquare size={20} style={{ opacity: 0.3, marginBottom: '0.35rem' }} />
          <p>No comments yet. Be the first to add one.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            maxHeight: '200px',
            overflowY: 'auto',
            paddingRight: '2px',
          }}
        >
          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.75rem',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              {c.avatar ? (
                <img
                  src={c.avatar}
                  alt={c.author}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid var(--accent-purple)',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'rgba(139,92,246,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <User size={15} style={{ color: 'var(--accent-purple)' }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  <span
                    style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}
                  >
                    {c.author}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {c.timestamp}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Comment Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          style={{
            flex: 1,
            padding: '0.55rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            outline: 'none',
            transition: 'border-color var(--transition-fast)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent-purple)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border-color)')}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={!newComment.trim()}
          style={{ padding: '0.55rem 1rem' }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
