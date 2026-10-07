import { useEffect, useRef, useState, useCallback } from 'react';

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WsMessage {
  type: 'kpi_update' | 'new_transaction' | 'deployment_update' | 'notification' | 'ping';
  payload: any;
}

const WS_URL = 'ws://localhost:5001';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 8;

export function useWebSocket(onMessage: (msg: WsMessage) => void) {
  const [status, setStatus] = useState<WsConnectionStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);
  const isMounted = useRef(true);

  // Keep latest callback without re-triggering effect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!isMounted.current) return;
    setStatus(reconnectAttempts.current > 0 ? 'reconnecting' : 'connecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      reconnectAttempts.current = 0;
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;
      try {
        const msg: WsMessage = JSON.parse(event.data);
        onMessageRef.current(msg);
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = () => {
      if (!isMounted.current) return;
      setStatus('disconnected');
      wsRef.current = null;

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          if (isMounted.current) connect();
        }, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      isMounted.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS; // prevent re-connection
    wsRef.current?.close();
    setStatus('disconnected');
  }, []);

  return { status, disconnect };
}
