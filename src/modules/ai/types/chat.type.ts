import type { GeneratedShape } from './shape.type';
export type { GeneratedShape, ShapeType } from './shape.type';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'error' | 'streaming';

/** Where the candidate image came from. Drives the badge + the
 *  small editorial copy in the picker's REVIEW step. */
export type ImageCandidateSource =
  | 'search'        // user picked from the Brave / DDG grid
  | 'ai_generated'  // user wrote a prompt → nano banana made it
  | 'ai_edited'     // user iterated on a previous candidate
  | 'uploaded';     // (future) user dropped in their own file

export interface ImageCandidate {
  /** URL to display in the browser. Goes through proxifyUrl on render. */
  url: string;
  /** URL the worker should ingest. Always a data: URL when the candidate
   *  came from R2 — keeps RunPod out of our private bucket. */
  runpod_url?: string;
  source: ImageCandidateSource;
  /** The prompt that produced this candidate (if applicable). */
  prompt?: string;
}

export interface ImageSearchPayload {
  image_urls: string[];
  search_query: string;
  request_id: string;
  prompt: string;
  /** Picker workflow state — set once the user has chosen / generated /
   *  edited an image. While present, the picker shows the REVIEW step
   *  (preview + edit + confirm) instead of the search grid. */
  candidate?: ImageCandidate;
  /** "generate" while a new candidate is being made, "edit" while a
   *  refinement is in flight. Drives the spinner and disables buttons. */
  candidatePending?: 'generate' | 'edit';
  /** Last error from the candidate flow — surfaces inline in the picker. */
  candidateError?: string;
}

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
  imageUrls?: string[];
  imageSearchPayload?: ImageSearchPayload;
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
  // Server-side total count (from /init). When set, sidebars should
  // prefer this over messages.length — the loaded `messages` array is
  // empty for non-active chats until they get clicked and synced.
  // Falls back to messages.length when undefined.
  messageCount?: number;
}
