import { STORAGE_KEYS } from '@/lib/constants';
import { useCallback, useEffect, useRef, useState } from 'react';

export type RunpodEventType = 'runpod.started' | 'runpod.status' | 'runpod.completed' | 'runpod.failed' | 'runpod.timeout' | 'error';

export interface RunpodEvent {
    type: RunpodEventType;
    chat_id: string;
    runpod_id?: string;
    job_id?: string;
    status?: string;
    action?: string;
    message?: {
        id: string;
        role: string;
        content: string;
    };
    output?: any;
    error?: string;
}

interface UseChatSocketProps {
    chatId: string | null;
    onEvent?: (event: RunpodEvent) => void;
}

export const useChatSocket = ({ chatId, onEvent }: UseChatSocketProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef(0);
    const onEventRef = useRef(onEvent);
    const MAX_RETRIES = 5;

    // Update handler ref when it changes
    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    const connectingRef = useRef(false);
    const connect = useCallback(() => {
        if (!chatId) return;

        // Don't connect if already connecting/connected
        if (socketRef.current && (socketRef.current.readyState === WebSocket.CONNECTING || socketRef.current.readyState === WebSocket.OPEN)) {
            console.log('[WebSocket] Already connected or connecting, skipping...');
            return;
        }

        // Prevent duplicate connection attempts
        if (connectingRef.current) {
            console.log('[WebSocket] Connection attempt already in progress, skipping...');
            return;
        }

        connectingRef.current = true;

        // Security: Ensure token is available before connecting
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (!token) {
            console.warn("[WebSocket] No auth token found, cannot connect");
            setError('Authentication required');
            return;
        }

        // Security: Validate token format (basic check)
        if (typeof token !== 'string' || token.length < 10) {
            console.error("[WebSocket] Invalid token format");
            setError('Invalid authentication token');
            return;
        }

        let apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;

        // If it's a relative path, resolve it against current location
        let wsUrlBase = apiBase.startsWith('/')
            ? `${protocol}//${host}${apiBase}`
            : apiBase.replace(/^https?/, protocol);

        // Ensure the path ends with /api/v1 (adjust if backend uses a different base)
        if (!wsUrlBase.includes('/api/v1')) {
            wsUrlBase = wsUrlBase.endsWith('/') ? `${wsUrlBase}api/v1` : `${wsUrlBase}/api/v1`;
        }

        // Security: Properly encode token in URL
        const wsUrl = `${wsUrlBase}/chat-socket/${encodeURIComponent(chatId)}?token=${encodeURIComponent(token)}`;

        console.log(`[WebSocket] Connecting to chat: ${chatId} at ${wsUrlBase}`);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('[WebSocket] Connected successfully');
            setIsConnected(true);
            setError(null);
            retryCountRef.current = 0;
            connectingRef.current = false;
        };

        socket.onmessage = (event) => {
            try {
                const data: RunpodEvent = JSON.parse(event.data);
                console.log(`[WebSocket] Received event: ${data.type}`, data);

                // Security: Validate event data
                if (!data || !data.type) {
                    console.warn('[WebSocket] Received invalid event data');
                    return;
                }

                onEventRef.current?.(data);
            } catch (err) {
                console.error('[WebSocket] Failed to parse message:', err);
            }
        };

        socket.onerror = (err) => {
            // Only log error if not in retry mode or if it's a hard failure
            if (retryCountRef.current === 0) {
                console.warn('[WebSocket] Connection issue (will retry)', err);
            }
            setError('WebSocket connection error');
            connectingRef.current = false;
        };

        socket.onclose = (event) => {
            console.log('[WebSocket] Closed', event.code, event.reason);
            setIsConnected(false);
            socketRef.current = null;
            connectingRef.current = false;

            // Auto-reconnect if not a graceful close (1000) and we have retries left
            if (chatId && retryCountRef.current < MAX_RETRIES && event.code !== 1000 && event.code !== 1001) {
                // Exponential backoff with jitter
                const baseDelay = 1000 * Math.pow(2, retryCountRef.current);
                const jitter = Math.random() * 1000;
                const delay = Math.min(baseDelay + jitter, 10000);

                console.log(`[WebSocket] Reconnecting in ${Math.round(delay)}ms... (Attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`);

                reconnectTimeoutRef.current = setTimeout(() => {
                    retryCountRef.current++;
                    connect();
                }, delay);
            } else if (retryCountRef.current >= MAX_RETRIES) {
                console.error('[WebSocket] Max reconnection attempts reached');
                setError('Connection failed after multiple attempts');
            }
        };
    }, [chatId]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (socketRef.current) {
            socketRef.current.onclose = null; // Prevent reconnect on manual close
            socketRef.current.close(1000);
            socketRef.current = null;
        }
        setIsConnected(false);
    }, []);

    useEffect(() => {
        if (chatId) {
            connect();
        }
        return () => disconnect();
    }, [chatId, connect, disconnect]);

    return { isConnected, error, connect, disconnect };
};
