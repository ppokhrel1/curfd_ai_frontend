import { STORAGE_KEYS } from "@/lib/constants";
import { useCallback, useEffect, useRef, useState } from "react";

export type RunpodEventType =
  | "runpod.started"
  | "runpod.status"
  | "runpod.completed"
  | "runpod.failed"
  | "runpod.timeout"
  | "error";

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
  sessionId: string | number | null; 
  onEvent?: (event: RunpodEvent) => void;
}

export const useChatSocket = ({ chatId, sessionId, onEvent }: UseChatSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const onEventRef = useRef(onEvent);
  const MAX_RETRIES = 5;

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connectingRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (!chatId) return;

    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.CONNECTING ||
        socketRef.current.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    if (connectingRef.current) {
      console.log(
        "[WebSocket] Connection attempt already in progress, skipping..."
      );
      return;
    }

    connectingRef.current = true;

    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) {
      console.warn("[WebSocket] No auth token found, cannot connect");
      setError("Authentication required");
      connectingRef.current = false;
      return;
    }

    if (typeof token !== "string" || token.length < 10) {
      console.error("[WebSocket] Invalid token format");
      setError("Invalid authentication token");
      connectingRef.current = false;
      return;
    }

    const wsBase =
      import.meta.env.VITE_WS_URL ||
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "/ws/v1";

    const resolveWsBase = (base: string): string => {
      const pageWsProtocol =
        window.location.protocol === "https:" ? "wss:" : "ws:";

      // Relative path (e.g., /ws/v1)
      if (base.startsWith("/")) {
        return `${pageWsProtocol}//${window.location.host}${base}`;
      }

      // Absolute URL (ws://, wss://, http://, https://)
      const parsed = new URL(base);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
      }
      return parsed.toString().replace(/\/$/, "");
    };

    let wsUrlBase: string;
    try {
      wsUrlBase = resolveWsBase(wsBase);
    } catch (e) {
      console.error("[WebSocket] Invalid websocket base URL:", wsBase, e);
      setError("Invalid websocket URL configuration");
      connectingRef.current = false;
      return;
    }

    // 👉 FIX 2: Safely convert sessionId to a string for the URL
    const safeSessionId = sessionId ? String(sessionId) : '';
    
    try {
      const wsUrl = `${wsUrlBase}/chat-socket/${encodeURIComponent(
        chatId
      )}?token=${encodeURIComponent(token)}&session_id=${encodeURIComponent(safeSessionId)}`;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
    
    socket.onopen = () => {      
      // 👉 FIX 3: Ensure session payload is stringified properly
      const initPayload = {
        session_id: safeSessionId 
      };
      socket.send(JSON.stringify(initPayload));

      setIsConnected(true);
      setError(null);
      retryCountRef.current = 0;
      connectingRef.current = false;
    };

    socket.onmessage = (event) => {
      try {
        const data: RunpodEvent = JSON.parse(event.data);

        if (!data || !data.type) {
          console.warn("[WebSocket] Received invalid event data");
          return;
        }

        onEventRef.current?.(data);
      } catch (err) {
        console.error("[WebSocket] Failed to parse message:", err);
      }
    };

    socket.onerror = (err) => {
      if (retryCountRef.current === 0) {
        console.warn("[WebSocket] Connection issue (will retry)", err);
      }
      setError("WebSocket connection error");
      connectingRef.current = false;
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      socketRef.current = null;
      connectingRef.current = false;

      // Auto-reconnect if not a graceful close (1000) and we have retries left
      if (
        chatId &&
        retryCountRef.current < MAX_RETRIES &&
        event.code !== 1000 &&
        event.code !== 1001
      ) {
        // Exponential backoff with jitter
        const baseDelay = 1000 * Math.pow(2, retryCountRef.current);
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay + jitter, 10000);

        console.log(
          `[WebSocket] Reconnecting in ${Math.round(delay)}ms... (Attempt ${
            retryCountRef.current + 1
          }/${MAX_RETRIES})`
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          retryCountRef.current++;
          connectRef.current();
        }, delay);
      } else if (retryCountRef.current >= MAX_RETRIES) {
        console.error("[WebSocket] Max reconnection attempts reached");
        setError("Connection failed after multiple attempts");
      }
    };
    } catch (e) {
        console.error("[WebSocket] Setup error:", e);
        connectingRef.current = false; // Add this!
        setError("Failed to initialize connection");
        return;
      }
  }, [chatId]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (socketRef.current) {
      socketRef.current.onclose = null;
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