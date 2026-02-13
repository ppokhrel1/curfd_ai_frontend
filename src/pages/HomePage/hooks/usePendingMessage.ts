import { useEffect } from 'react';
import type { ChatInterfaceRef } from '@/modules/ai/components/ChatInterface';

export const usePendingMessage = (chatRef: React.RefObject<ChatInterfaceRef | null>) => {
  useEffect(() => {
    const pendingMessage = sessionStorage.getItem('pending_chat_message');
    if (pendingMessage && chatRef.current) {
      setTimeout(() => {
        chatRef.current?.sendUserMessage(pendingMessage);
        sessionStorage.removeItem('pending_chat_message');
      }, 500);
    }
  }, [chatRef]);
};