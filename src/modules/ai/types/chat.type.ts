import type { GeneratedShape } from './shape.type';
export type { GeneratedShape, ShapeType } from './shape.type';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'error' | 'streaming';

export interface Message {
  id: string;
  content: string | null;
  role: MessageRole;
  timestamp: Date;
  isLoading?: boolean;
  status?: MessageStatus;
  error?: string;
  metadata?: MessageMetadata;
  shapeData?: GeneratedShape;
}

export interface MessageMetadata {
  tokens?: number;
  model?: string;
  temperature?: number;
  responseTime?: number;
  citations?: string[];
}

export interface SendMessageParams {
  content: string;
  conversationId?: string;
  role?: MessageRole;
  parentMessageId?: string;
  metadata?: Partial<MessageMetadata>;
}

export interface ChatResponse {
  message: Message;
  conversationId: string;
  suggestions?: string[];
  error?: string;
  generatedShape?: GeneratedShape;
}

export interface ChatConfig {
  apiUrl: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streamResponse?: boolean;
  systemPrompt?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  generatedShape?: GeneratedShape;
  createdAt: Date;
  updatedAt: Date;
}
