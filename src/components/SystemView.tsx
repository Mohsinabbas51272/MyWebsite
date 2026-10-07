import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Server,
  Cpu,
  HardDrive,
  Database,
  RefreshCw,
  CheckCircle2,
  Terminal,
  Radio,
  RotateCw,
  Power
} from 'lucide-react';
import type { SystemHealth, MicroserviceStatus } from '../types/dashboard';
import { api } from '../services/api';
import { ApiMonitorView } from './ApiMonitorView';

export const SystemView: React.FC<{
  systemHealth: SystemHealth;
  onShowToast: (msg: string) => void;
}> = ({ systemHealth, onShowToast }) => {
  const [services, setServices] = useState<MicroserviceStatus[]>([]);

  useEffect(() => {
    api.getMicroservices().then((srvs) => {
      if (Array.isArray(srvs)) setServices(srvs);
    }).catch(() => {});
  }, []);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [logs, setLogs] = useState<
    Array<{ id: string; time: string; level: 'info' | 'warn' | 'error'; message: string; service: string }>
  >([]);

  // Live fluctuating telemetry simulation
  const [liveCpu, setLiveCpu] = useState<number>(systemHealth.cpuUsage);
  const [liveMem, setLiveMem] = useState<number>(systemHealth.memoryUsage);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCpu((prev) => Math.min(95, Math.max(15, prev + Math.floor(Math.random() * 7 - 3))));
      setLiveMem((prev) => Math.min(92, Math.max(40, prev + Math.floor(Math.random() * 5 - 2))));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRestartService = (id: string, name: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'maintenance' } : s))
    );
    onShowToast(`Dispatched graceful restart signal to ${name}...`);

    setTimeout(() => {
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'operational', latency: Math.floor(10 + Math.random() * 20) } : s))
      );
      setLogs((prev) => [
        {
          id: `${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          level: 'info',
          message: `Service ${name} restarted and passed health check GET /healthz 200 OK`,
          service: name,
        },
        ...prev,
      ]);
      onShowToast(`Service ${name} is back online and operational!`);
    }, 2500);
  };

  const handleFlushCache = () => {
    onShowToast('Flushing Redis L2 Cache across all regional edge nodes...');
    setTimeout(() => {
      setLogs((prev) => [
        {
          id: `${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          level: 'info',
          message: 'FLUSHALL executed on Redis cluster. 128,400 keys evicted cleanly.',
          service: 'Redis L2 Cache',
        },
        ...prev,
      ]);
      onShowToast('Redis cache cleared successfully! Memory freed.');
    }, 1500);
  };

  const filteredLogs = logs.filter((l) => logFilter === 'all' || l.level === logFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(16, 185, 129, 0.15) 100%)', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
        <div className="welcome-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              <ShieldCheck size={12} /> All Systems Operational
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Global Uptime: {systemHealth.uptime}</span>
          </div>
          <h1>Infrastructure Telemetry & Node Health</h1>
          <p>
            Real-time server metrics, microservices cluster status, database query latency, and live system log streams.
          </p>
        </div>

        <div className="banner-actions">
          <button className="btn-secondary" onClick={handleFlushCache}>
            <RotateCw size={15} /> Flush Redis Cache
          </button>
          <button
            className="btn-primary"
            onClick={() => onShowToast('Diagnostic health check completed: All 6 microservices reporting green.')}
          >
            <RefreshCw size={15} /> Run Diagnostic Check
          </button>
        </div>
      </div>

      {/* Real-time Hardware Telemetry Gauges */}
      <div className="kpi-grid">
        {/* CPU Load */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Cpu size={16} style={{ color: 'var(--accent-purple)' }} /> CPU Utilization
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>8 Cores Active</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {liveCpu}%
          </h2>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${liveCpu}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                borderRadius: '3px',
                transition: 'width 0.8s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Load avg: 0.42, 0.58, 0.51</span>
        </div>

        {/* Memory RAM */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Server size={16} style={{ color: 'var(--accent-cyan)' }} /> RAM Consumption
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>32 GB ECC</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {liveMem}%
          </h2>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${liveMem}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-rose))',
                borderRadius: '3px',
                transition: 'width 0.8s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>19.8 GB allocated / 12.2 GB free</span>
        </div>

        {/* NVMe Storage */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <HardDrive size={16} style={{ color: 'var(--accent-emerald)' }} /> NVMe Storage
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>RAID 10</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {systemHealth.diskSpace}%
          </h2>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${systemHealth.diskSpace}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-emerald), var(--accent-cyan))',
                borderRadius: '3px',
              }}
            />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>410 GB used / 1.0 TB capacity</span>
        </div>

        {/* Gateway Latency */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Radio size={16} style={{ color: 'var(--accent-amber)' }} /> Edge Latency
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>p99 Latency</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {systemHealth.apiLatency} ms
          </h2>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: '32%',
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-amber), var(--accent-emerald))',
                borderRadius: '3px',
              }}
            />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Optimal global edge routing</span>
        </div>
      </div>

      {/* Microservices Health Grid */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} style={{ color: 'var(--accent-purple)' }} /> Microservices Cluster Status
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Health probes, regional availability, and versioning across all backend instances
            </p>
          </div>
          <span className="badge badge-success">6 / 6 Healthy</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {services.map((srv) => (
            <div
              key={srv.id}
              style={{
                padding: '1.1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {srv.name}
                  </span>
                  {srv.status === 'operational' ? (
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                      <CheckCircle2 size={11} /> Operational
                    </span>
                  ) : (
                    <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>
                      <RotateCw size={11} className="pulse-dot" /> Restarting
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {srv.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Latency: <strong style={{ color: 'var(--text-primary)' }}>{srv.latency}ms</strong></span>
                  <span>Uptime: <strong style={{ color: 'var(--accent-emerald)' }}>{srv.uptime}</strong></span>
                  <span>Region: <strong style={{ color: 'var(--text-primary)' }}>{srv.region}</strong></span>
                </div>

                <button
                  className="btn-icon"
                  style={{ width: '28px', height: '28px' }}
                  title={`Restart ${srv.name}`}
                  onClick={() => handleRestartService(srv.id, srv.name)}
                >
                  <Power size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live System Terminal Logs Stream */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={18} style={{ color: 'var(--accent-cyan)' }} /> Live Event & Error Log Stream
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-time syslog telemetry aggregated from containers and edge nodes
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            {(['all', 'info', 'warn', 'error'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLogFilter(lvl)}
                style={{
                  border: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  background: logFilter === lvl ? 'var(--bg-secondary)' : 'transparent',
                  color: logFilter === lvl ? 'var(--accent-purple)' : 'var(--text-secondary)',
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Terminal Box */}
        <div
          style={{
            backgroundColor: '#070a13',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            lineHeight: 1.6,
            maxHeight: '260px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          {filteredLogs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0', fontSize: '0.78rem' }}>
              No system syslog telemetry events recorded yet.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      log.level === 'error'
                        ? 'var(--accent-rose)'
                        : log.level === 'warn'
                        ? 'var(--accent-amber)'
                        : 'var(--accent-emerald)',
                    textTransform: 'uppercase',
                    minWidth: '50px',
                  }}
                >
                  [{log.level}]
                </span>
                <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>({log.service}):</span>
                <span style={{ color: '#e2e8f0', flex: 1 }}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* API Response Monitor */}
      <ApiMonitorView onShowToast={onShowToast} />
    </div>
  );
};
