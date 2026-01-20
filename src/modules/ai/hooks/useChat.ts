import { chatService } from "@/modules/ai/services/chatService";
import { useCallback, useState } from "react";
import { GeneratedShape, Message } from "../types/chat.type";
import { generateId } from "../utils/messageUtils";

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const useChat = (
  onShapeGenerated?: (shape: GeneratedShape) => void
): UseChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setIsLoading(true);
      setError(null);
      setLastUserMessage(content.trim());

      const userMessage: Message = {
        id: generateId(),
        content: content.trim(),
        role: "user",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await chatService.sendMessage({
          content: content.trim(),
        });
        if (response.generatedShape && onShapeGenerated) {
          onShapeGenerated(response.generatedShape);
        }
        setMessages((prev) => [...prev, response.message]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);

        const errorMsg: Message = {
          id: generateId(),
          content:
            "❌ Sorry, I encountered an error processing your request. Please try again or rephrase your question.",
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [onShapeGenerated]
  );

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessage) {
      await sendMessage(lastUserMessage);
    }
  }, [lastUserMessage, sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setLastUserMessage("");
    chatService.clearHistory();
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    retryLastMessage,
    setMessages,
  };
};
