import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  Video,
  Music,
  Sparkles,
  Loader2,
  AlertCircle,
  Clock,
  Eye,
  User,
  Zap,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Trash2,
  Search,
  Play,
  RotateCcw,
  Copy,
  Check,
  HardDrive,
  Gauge,
  Timer,
  Layers,
  X,
  Radio,
  FileVideo,
  FileAudio,
} from 'lucide-react';
import type { VideoMetadata, PresetFormat, DownloadedMediaRecord } from '../types/dashboard';
import { api } from '../services/api';

interface ActiveJobState {
  jobId: string;
  status: 'starting' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: number;
  speed: string;
  eta: string;
  downloadedSize: string;
  totalSize: string;
  stage: string;
  error: string | null;
  filename: string;
  type: 'video' | 'audio';
  downloadUrl: string;
  previewUrl: string;
}

export const MediaDownloader: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoMetadata | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<PresetFormat | null>(null);

  // Active Download & Progress State
  const [activeJob, setActiveJob] = useState<ActiveJobState | null>(null);
  const pollTimerRef = useRef<any>(null);

  // History & Filter State
  const [downloadHistory, setDownloadHistory] = useState<DownloadedMediaRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'video' | 'audio'>('all');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Preview Modal State
  const [previewMedia, setPreviewMedia] = useState<{ url: string; title: string; type: 'video' | 'audio' } | null>(null);

  // ─── Load Download History from PostgreSQL ─────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      const records = await api.getMediaHistory();
      if (Array.isArray(records)) {
        setDownloadHistory(records);
      }
    } catch (err) {
      console.warn('Media history load note:', err);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Clean up polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // ─── Fetch Video Metadata ──────────────────────────────────────────────────
  const handleFetchInfo = async (targetUrl?: string) => {
    const inputUrl = targetUrl || url;
    if (!inputUrl.trim()) {
      setError('Please enter a valid video or audio URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setVideoInfo(null);
    setActiveJob(null);

    try {
      const data = await api.fetchVideoInfo(inputUrl.trim());
      setVideoInfo(data);
      if (data.presets && data.presets.length > 0) {
        setSelectedFormat(data.presets[0]);
      }
    } catch (err: any) {
      console.error('Fetch video info error:', err);
      setError(err.message || 'Could not connect to yt-dlp backend. Please verify your URL.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Start Download Job with Real-Time Progress ─────────────────────────────
  const handleStartDownload = async () => {
    if (!videoInfo || !selectedFormat) return;

    setError(null);
    const formatType = selectedFormat.isAudioOnly ? 'audio' : 'video';

    try {
      const startRes = await api.startMediaDownload({
        url: videoInfo.webpageUrl,
        formatId: selectedFormat.formatId,
        type: formatType,
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        resolution: selectedFormat.resolution,
      });

      if (!startRes || !startRes.jobId) {
        throw new Error('Failed to create download job');
      }

      const jobId = startRes.jobId;

      setActiveJob({
        jobId,
        status: 'starting',
        progress: 5,
        speed: 'Connecting...',
        eta: 'Calculating...',
        downloadedSize: '0 MB',
        totalSize: selectedFormat.filesizeFormatted || 'Calculating...',
        stage: 'Establishing stream connection...',
        error: null,
        filename: startRes.filename,
        type: formatType,
        downloadUrl: `/api/download/file/${jobId}`,
        previewUrl: `/api/download/file/${jobId}?inline=1`,
      });

      // Clear any existing poll
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      // Start Real-Time Progress Polling
      pollTimerRef.current = setInterval(async () => {
        try {
          const progressData = await api.getMediaDownloadProgress(jobId);

          setActiveJob((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              status: progressData.status,
              progress: progressData.progress,
              speed: progressData.speed || prev.speed,
              eta: progressData.eta || prev.eta,
              downloadedSize: progressData.downloadedSize || prev.downloadedSize,
              totalSize: progressData.totalSize || prev.totalSize,
              stage: progressData.stage || prev.stage,
              error: progressData.error,
              filename: progressData.filename || prev.filename,
              type: progressData.type || prev.type,
              downloadUrl: progressData.downloadUrl || prev.downloadUrl,
              previewUrl: progressData.previewUrl || prev.previewUrl,
            };
          });

          // Check if finished or failed
          if (progressData.status === 'completed') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            // Trigger automatic browser native download
            triggerBrowserDownload(progressData.downloadUrl, progressData.filename);
            // Reload history to reflect newly downloaded item
            loadHistory();
          } else if (progressData.status === 'error' || progressData.status === 'cancelled') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          }
        } catch (pollErr: any) {
          console.warn('Poll error:', pollErr);
        }
      }, 500);
    } catch (err: any) {
      console.error('Start download error:', err);
      setError(err.message || 'Failed to start media download');
    }
  };

  const triggerBrowserDownload = (downloadUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Cancel Download ───────────────────────────────────────────────────────
  const handleCancelDownload = async () => {
    if (!activeJob) return;
    try {
      await api.cancelMediaDownload(activeJob.jobId);
    } catch (err) {
      console.warn('Cancel error:', err);
    } finally {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setActiveJob((prev) => (prev ? { ...prev, status: 'cancelled', stage: 'Download cancelled by user' } : null));
    }
  };

  // ─── History Actions ───────────────────────────────────────────────────────
  const handleDeleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteMediaHistory(id);
      setDownloadHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete history record:', err);
    }
  };

  const handleClearAllHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all download history records?')) return;
    try {
      await api.deleteMediaHistory();
      setDownloadHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const copyUrl = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered History Records
  const filteredHistory = downloadHistory.filter((item) => {
    const matchesFilter =
      historyFilter === 'all' ||
      (historyFilter === 'video' && (!item.type || item.type.includes('video') || item.type === 'mp4')) ||
      (historyFilter === 'audio' && (item.type?.includes('audio') || item.type?.includes('mp3')));

    const matchesSearch =
      !historySearch.trim() ||
      item.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.url.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.resolution.toLowerCase().includes(historySearch.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Top Banner ────────────────────────────────────────────────────── */}
      <div
        className="welcome-banner"
        style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.22) 0%, rgba(139, 92, 246, 0.18) 100%)',
          borderColor: 'rgba(6, 182, 212, 0.35)',
        }}
      >
        <div className="welcome-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Zap size={13} /> yt-dlp & FFmpeg Transcoder Active
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Real-Time Progress &bull; 1080p Full HD &bull; MP3 320kbps
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0' }}>
            Universal Media Downloader & Transcoder
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Extract lossless MP4 video and 320kbps MP3 audio with live download stream telemetry, bandwidth speed tracking, and playback verification.
          </p>
        </div>
      </div>

      {/* ── Main Input Box & URL Analyzer ─────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Video size={20} style={{ color: 'var(--accent-purple)' }} /> Enter Media URL
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              Supports YouTube, TikTok, Instagram Reels, Twitter/X, Vimeo, Facebook, and 100+ platforms
            </p>
          </div>
        </div>

        {/* URL Input Form */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Paste media URL (e.g. https://www.youtube.com/watch?v=...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchInfo()}
              style={{
                width: '100%',
                padding: '0.8rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-highlight)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {url && (
              <button
                onClick={() => setUrl('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                }}
                title="Clear input"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className="btn-primary"
            onClick={() => handleFetchInfo()}
            disabled={loading}
            style={{ padding: '0.8rem 1.6rem', fontWeight: 700 }}
          >
            {loading ? <Loader2 size={18} className="pulse-dot" /> : <Sparkles size={18} />}
            <span>{loading ? 'Analyzing Streams...' : 'Analyze Media'}</span>
          </button>
        </div>

        {/* Quick Sample Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Test URLs:</span>
          <button
            onClick={() => {
              const testUrl = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
              setUrl(testUrl);
              handleFetchInfo(testUrl);
            }}
            style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '20px',
              padding: '2px 10px',
              fontSize: '0.72rem',
              color: '#c084fc',
              cursor: 'pointer',
            }}
          >
            Big Buck Bunny (4K Sample)
          </button>
          <button
            onClick={() => {
              const testUrl = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
              setUrl(testUrl);
              handleFetchInfo(testUrl);
            }}
            style={{
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '20px',
              padding: '2px 10px',
              fontSize: '0.72rem',
              color: '#22d3ee',
              cursor: 'pointer',
            }}
          >
            Lofi Girl Hip Hop (Audio Sample)
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent-rose)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ── Active Download Progress HUD (Visible during or right after download) ─ */}
      {activeJob && (
        <div
          className="glass-panel"
          style={{
            padding: '1.75rem',
            background:
              activeJob.status === 'completed'
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)'
                : activeJob.status === 'error'
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)'
                : 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
            border:
              activeJob.status === 'completed'
                ? '1px solid rgba(16, 185, 129, 0.4)'
                : activeJob.status === 'error'
                ? '1px solid rgba(239, 68, 68, 0.4)'
                : '1px solid rgba(139, 92, 246, 0.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {activeJob.status === 'completed' ? (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <CheckCircle2 size={22} />
                </div>
              ) : activeJob.status === 'error' ? (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                  <XCircle size={22} />
                </div>
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                  <Loader2 size={22} className="pulse-dot" />
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {activeJob.status === 'completed'
                    ? 'Download Complete & Ready!'
                    : activeJob.status === 'error'
                    ? 'Download Interrupted'
                    : activeJob.status === 'processing'
                    ? 'Transcoding with FFmpeg...'
                    : 'Downloading Media Stream...'}
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {activeJob.filename}
                </span>
              </div>
            </div>

            {/* Right: Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {activeJob.status === 'completed' && (
                <>
                  <button
                    onClick={() => setPreviewMedia({ url: activeJob.previewUrl, title: activeJob.filename, type: activeJob.type })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.9rem',
                      borderRadius: '8px',
                      background: 'rgba(6, 182, 212, 0.2)',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      color: '#22d3ee',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Play size={14} /> Preview
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => triggerBrowserDownload(activeJob.downloadUrl, activeJob.filename)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    <Download size={14} /> Save File (.
                    {activeJob.type === 'audio' ? 'mp3' : 'mp4'})
                  </button>
                </>
              )}

              {activeJob.status !== 'completed' && activeJob.status !== 'error' && activeJob.status !== 'cancelled' && (
                <button
                  onClick={handleCancelDownload}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} /> Cancel
                </button>
              )}
            </div>
          </div>

          {/* Glowing Animated Progress Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', fontWeight: 700 }}>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Radio size={14} style={{ color: activeJob.status === 'completed' ? '#10b981' : '#06b6d4' }} />
                {activeJob.stage}
              </span>
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 900,
                  color: activeJob.status === 'completed' ? '#10b981' : '#a855f7',
                }}
              >
                {activeJob.progress}%
              </span>
            </div>

            <div
              style={{
                width: '100%',
                height: '10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${activeJob.progress}%`,
                  height: '100%',
                  borderRadius: '6px',
                  background:
                    activeJob.status === 'completed'
                      ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                      : activeJob.status === 'error'
                      ? '#ef4444'
                      : 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
                  transition: 'width 0.3s ease',
                  boxShadow:
                    activeJob.status === 'completed'
                      ? '0 0 12px rgba(16, 185, 129, 0.6)'
                      : '0 0 12px rgba(139, 92, 246, 0.6)',
                }}
              />
            </div>
          </div>

          {/* 4-Metric Real-Time Telemetry HUD */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <div style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                <Gauge size={13} color="var(--accent-cyan)" /> Download Speed
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {activeJob.speed || 'N/A'}
              </div>
            </div>

            <div style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                <Timer size={13} color="var(--accent-purple)" /> Estimated Time
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {activeJob.eta || 'N/A'}
              </div>
            </div>

            <div style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                <HardDrive size={13} color="var(--accent-emerald)" /> Size Transferred
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {activeJob.downloadedSize} / {activeJob.totalSize}
              </div>
            </div>

            <div style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                <Layers size={13} color="var(--accent-amber)" /> Format & Codec
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                {activeJob.type === 'audio' ? 'MP3 Audio' : 'MP4 Video'}
              </div>
            </div>
          </div>

          {activeJob.error && (
            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.8rem' }}>
              <strong>Error Details:</strong> {activeJob.error}
            </div>
          )}
        </div>
      )}

      {/* ── Video Metadata & Format Picker ───────────────────────────────── */}
      {videoInfo && (
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(320px, 1.2fr)', gap: '2rem' }}>
          {/* Left: Thumbnail & Video Overview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)', aspectRatio: '16/9', background: '#000' }}>
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={12} /> {videoInfo.duration}
              </div>
              <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'var(--accent-purple)', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                {videoInfo.extractor}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4, margin: '0 0 0.5rem 0' }}>
                {videoInfo.title}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <User size={14} style={{ color: 'var(--accent-purple)' }} /> {videoInfo.uploader}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Eye size={14} style={{ color: 'var(--accent-cyan)' }} /> {videoInfo.viewCount} Views
                </span>
              </div>
            </div>
          </div>

          {/* Right: Resolution & Format Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.85rem 0' }}>
                Select Output Format & Quality
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {videoInfo.presets.map((preset, idx) => {
                  const isSelected = selectedFormat?.formatId === preset.formatId;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedFormat(preset)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(139, 92, 246, 0.18)' : 'var(--bg-input)',
                        border: isSelected ? '2px solid var(--accent-purple)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {preset.isAudioOnly ? (
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Music size={18} style={{ color: 'var(--accent-rose)' }} />
                          </div>
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Video size={18} style={{ color: 'var(--accent-cyan)' }} />
                          </div>
                        )}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                              {preset.resolution}
                            </span>
                            {preset.resolution.includes('4K') && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff' }}>
                                4K UHD
                              </span>
                            )}
                            {preset.resolution.includes('2K') && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: '#fff' }}>
                                2K QHD
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{preset.note}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {preset.filesizeFormatted}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>
                          .{preset.ext}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Start Download Button */}
            <button
              className="btn-primary"
              onClick={handleStartDownload}
              disabled={activeJob?.status === 'downloading' || activeJob?.status === 'processing'}
              style={{
                width: '100%',
                padding: '0.9rem 1.5rem',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 800,
                borderRadius: 'var(--radius-md)',
              }}
            >
              {activeJob?.status === 'downloading' || activeJob?.status === 'processing' ? (
                <>
                  <Loader2 size={20} className="pulse-dot" />
                  <span>Downloading in background ({activeJob.progress}%)...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>Start Download: {selectedFormat?.resolution} (.{selectedFormat?.ext})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── PostgreSQL Download History Section ───────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Clock size={18} style={{ color: 'var(--accent-cyan)' }} /> Download History & Saved Records
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {filteredHistory.length} recorded items saved in PostgreSQL
            </span>
          </div>

          {/* Search & Filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{
                  padding: '0.45rem 0.8rem 0.45rem 2rem',
                  fontSize: '0.8rem',
                  borderRadius: '20px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: '150px',
                }}
              />
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '2px', border: '1px solid var(--border-color)' }}>
              {(['all', 'video', 'audio'] as const).map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setHistoryFilter(filterType)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '16px',
                    border: 'none',
                    background: historyFilter === filterType ? 'var(--accent-purple)' : 'none',
                    color: historyFilter === filterType ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {filterType}
                </button>
              ))}
            </div>

            {downloadHistory.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '20px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Clear all download history"
              >
                <Trash2 size={13} /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* History Table */}
        <div style={{ overflowX: 'auto' }}>
          {filteredHistory.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <HardDrive size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <div>No downloaded media records found.</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Paste a video URL above and start a download to create history.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Media</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Format & Quality</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Downloaded At</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => {
                  const isAudio = item.type?.includes('audio') || item.type?.includes('mp3');

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ position: 'relative', width: '54px', height: '36px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#000' }}>
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                {isAudio ? <FileAudio size={18} /> : <FileVideo size={18} />}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.title}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.url}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span
                          className={`badge ${isAudio ? 'badge-warning' : 'badge-success'}`}
                          style={{ fontSize: '0.72rem', fontWeight: 700 }}
                        >
                          {item.resolution || (isAudio ? 'MP3 Audio' : '1080p')}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {item.date}
                      </td>

                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {/* Re-analyze / Load URL */}
                          <button
                            onClick={() => {
                              setUrl(item.url);
                              handleFetchInfo(item.url);
                            }}
                            className="btn-icon"
                            style={{ width: '30px', height: '30px' }}
                            title="Re-download / Fetch Info"
                          >
                            <RotateCcw size={14} />
                          </button>

                          {/* Copy URL */}
                          <button
                            onClick={() => copyUrl(item.url, item.id)}
                            className="btn-icon"
                            style={{ width: '30px', height: '30px' }}
                            title="Copy Media URL"
                          >
                            {copiedId === item.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                          </button>

                          {/* External link */}
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-icon"
                            style={{ width: '30px', height: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Open Original Page"
                          >
                            <ExternalLink size={14} />
                          </a>

                          {/* Delete Item */}
                          <button
                            onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                            className="btn-icon"
                            style={{ width: '30px', height: '30px', color: '#f87171' }}
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Built-in Media Player Preview Modal ────────────────────────────── */}
      {previewMedia && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setPreviewMedia(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              background: '#0f172a',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.15)',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Play size={18} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewMedia.title}
                </span>
              </div>
              <button
                onClick={() => setPreviewMedia(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Player */}
            <div style={{ padding: '1.25rem', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewMedia.type === 'audio' ? (
                <div style={{ width: '100%', padding: '2rem 1rem', textAlign: 'center' }}>
                  <Music size={48} style={{ color: 'var(--accent-rose)', margin: '0 auto 1rem' }} />
                  <audio controls autoPlay style={{ width: '100%' }}>
                    <source src={previewMedia.url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ) : (
                <video controls autoPlay style={{ width: '100%', maxHeight: '420px', borderRadius: '8px' }}>
                  <source src={previewMedia.url} type="video/mp4" />
                  Your browser does not support the video element.
                </video>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
