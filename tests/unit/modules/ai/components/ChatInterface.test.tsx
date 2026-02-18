import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';


import { useChat } from '@/modules/ai/hooks/useChat';
import { useConversations } from '@/modules/ai/hooks/useConversations';
import { ChatInterface } from '@/modules/ai/components/ChatInterface';
import { useEditorStore } from '@/modules/editor/stores/editorStore';
import { useChatStore } from '@/modules/ai/stores/chatStore';

// --- MOCKS ---

vi.mock('@/modules/ai/hooks/useChat');
vi.mock('@/modules/ai/hooks/useConversations');
vi.mock('@/modules/ai/stores/chatStore');
vi.mock('@/modules/editor/stores/editorStore');

// Mock MessageInput
vi.mock('@/modules/ai/components/MessageInput', () => ({
  MessageInput: ({ onSendMessage, disabled }: any) => (
    <div data-testid="message-input">
      <input
        type="text"
        placeholder="Mock input"
        disabled={disabled}
        onChange={(e) => onSendMessage(e.target.value)}
      />
      <button onClick={() => onSendMessage('Test Message')}>Send</button>
    </div>
  ),
}));

// Mock MessageList to test the onOpenInEditor callback easily
vi.mock('@/modules/ai/components/MessageList', () => ({
  MessageList: ({ messages, onOpenInEditor }: any) => (
    <div data-testid="message-list">
      {messages.map((msg: any, idx: number) => (
        <div key={idx} data-testid={`message-${msg.role}`}>
          {msg.content}
        </div>
      ))}
      <button 
        data-testid="mock-open-editor" 
        onClick={() => onOpenInEditor('mocked code', 'code')}
      >
        Open Editor
      </button>
    </div>
  ),
}));

// Mock Icons
vi.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="icon-alertcircle" />,
  Bot: () => <div data-testid="icon-bot" />,
  History: () => <div data-testid="icon-history" />,
  Menu: () => <div data-testid="icon-menu" />,
  Plus: () => <div data-testid="icon-plus" />,
  RefreshCcw: () => <div data-testid="icon-refresh" />,
  X: (props: any) => <div data-testid="icon-x" {...props} />,
  ChevronLeft: () => <div data-testid="icon-chevronleft" />,
  ChevronRight: () => <div data-testid="icon-chevronright" />,
}));

describe('ChatInterface', () => {
  const mockSetCode = vi.fn();
  const mockSetOriginalCode = vi.fn();
  const mockSetMode = vi.fn();
  
  const mockUseChat = {
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
    generateModel: vi.fn(),
    sendSystemMessage: vi.fn(),
    clearMessages: vi.fn(),
    retryLastMessage: vi.fn(),
  };

  const mockUseConversations = {
    conversations: [],
    activeConversationId: null,
    activeConversation: null,
    isLoadingChats: false,
    loadError: null,
    setActiveConversation: vi.fn(),
    deleteConversation: vi.fn(),
    setConversationShape: vi.fn(),
    addMessageToConversation: vi.fn(),
    renameConversation: vi.fn(),
  };

  const mockUseChatStore = {
    generatingChatIds: new Set(),
    generatingChatStatus: {},
  };

  const mockSetActiveView = vi.fn();
  const mockSetMobilePanel = vi.fn();
  const mockOnShapeGenerated = vi.fn();
  const mockOnMinimize = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();

    vi.mocked(useChat).mockReturnValue(mockUseChat as any);
    vi.mocked(useConversations).mockReturnValue(mockUseConversations as any);
    vi.mocked(useChatStore).mockReturnValue(mockUseChatStore as any);
    
    // Mock standard return + getState for the editorStore
    vi.mocked(useEditorStore).mockReturnValue({
      setCode: mockSetCode,
      setOriginalCode: mockSetOriginalCode,
    } as any);
    useEditorStore.getState = vi.fn().mockReturnValue({ setMode: mockSetMode });
  });

  const renderComponent = (props = {}) => {
    return render(
      <ChatInterface
        setActiveView={mockSetActiveView}
        setMobilePanel={mockSetMobilePanel}
        onShapeGenerated={mockOnShapeGenerated}
        {...props}
      />
    );
  };

  describe('Rendering Basics', () => {
    test('renders empty state correctly', () => {
      renderComponent();
      expect(screen.getByText('Ready to Help')).toBeInTheDocument();
      expect(screen.getByText('Generate 3D models')).toBeInTheDocument();
    });

    test('renders messages through MessageList', () => {
      vi.mocked(useConversations).mockReturnValue({
        ...mockUseConversations,
        activeConversationId: '1',
        activeConversation: {
          id: '1',
          title: 'Test',
          messages: [{ id: 'm1', role: 'user', content: 'Hello user' }]
        },
      } as any);

      renderComponent();
      expect(screen.getByText('Hello user')).toBeInTheDocument();
      expect(screen.queryByText('Ready to Help')).not.toBeInTheDocument();
    });

    test('renders children workspace if provided', () => {
      renderComponent({ children: <div data-testid="mock-workspace">Workspace</div> });
      expect(screen.getByTestId('mock-workspace')).toBeInTheDocument();
    });
  });

  describe('Sidebar & Layout Interactions', () => {
    test('toggles sidebar on menu click', () => {
      const { container } = renderComponent();
      
      const menuBtn = screen.getByTestId('icon-menu').closest('button');
      fireEvent.click(menuBtn!);
      
      const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');
      expect(overlay).toBeInTheDocument();

      // Close by clicking overlay
      fireEvent.click(overlay!);
      expect(container.querySelector('.fixed.inset-0.bg-black\\/50')).not.toBeInTheDocument();
    });

    test('renders minimized state and allows un-minimizing', () => {
      renderComponent({ isMinimized: true, onMinimize: mockOnMinimize });
      
      // Look for the minimized vertical strip wrapper
      const menuIcon = screen.getByTestId('icon-menu');
      const minContainer = menuIcon.closest('div[class*="flex-col items-center"]');
      
      fireEvent.click(minContainer!);
      expect(mockOnMinimize).toHaveBeenCalledWith(false);
    });

    test('sending a message un-minimizes the chat', async () => {
      renderComponent({ isMinimized: true, onMinimize: mockOnMinimize });
      
      const sendBtn = screen.getByText('Send');
      await act(async () => {
        fireEvent.click(sendBtn);
      });

      expect(mockUseChat.sendMessage).toHaveBeenCalledWith('Test Message');
      expect(mockOnMinimize).toHaveBeenCalledWith(false);
    });
  });

  describe('Conversation Management', () => {
    test('handles starting a new chat', () => {
      renderComponent();
      const newChatBtn = screen.getByTitle('New Session');
      fireEvent.click(newChatBtn);
      
      expect(mockUseConversations.setActiveConversation).toHaveBeenCalledWith(null);
      expect(mockUseChat.clearMessages).toHaveBeenCalled();
      expect(mockOnShapeGenerated).toHaveBeenCalledWith(null);
    });

    test('auto-renames New Chat when user sends first message', () => {
      vi.mocked(useConversations).mockReturnValue({
        ...mockUseConversations,
        activeConversationId: '1',
        activeConversation: {
          id: '1',
          title: 'New Chat', // Important trigger
          messages: [{ id: 'm1', role: 'user', content: 'Make me a box' }]
        },
      } as any);

      renderComponent();
      expect(mockUseConversations.renameConversation).toHaveBeenCalledWith('1', 'Make me a box');
    });

    test('handles selecting and deleting chats from history', () => {
      vi.mocked(useConversations).mockReturnValue({
        ...mockUseConversations,
        conversations: [{ id: 'chat1', title: 'Old Chat', messages: [] }],
      } as any);

      renderComponent();
      // Open sidebar
      fireEvent.click(screen.getByTestId('icon-menu').closest('button')!);
      
      const chatItemText = screen.getByText('Old Chat');
      
      const chatItemWrapper = chatItemText.closest('div.cursor-pointer');
      
      // Click the wrapper to select the chat
      fireEvent.click(chatItemWrapper!);
      expect(mockUseConversations.setActiveConversation).toHaveBeenCalledWith('chat1');

      // Now query the button inside that outer wrapper
      const deleteBtn = chatItemWrapper?.querySelector('button');
      fireEvent.click(deleteBtn!);
      expect(mockUseConversations.deleteConversation).toHaveBeenCalledWith('chat1');
    });
  });

  describe('Editor & Auto-Load Logic', () => {
    test('handleViewEditor sets code and switches views when triggered manually', () => {
      vi.mocked(useConversations).mockReturnValue({
        ...mockUseConversations,
        activeConversationId: '1',
        activeConversation: {
          id: '1',
          title: 'Test',
          messages: [{ id: 'm1', role: 'assistant', content: 'Msg' }]
        },
      } as any);

      renderComponent();
      
      const openEditorBtn = screen.getByTestId('mock-open-editor');
      fireEvent.click(openEditorBtn);

      expect(mockSetOriginalCode).toHaveBeenCalledWith('mocked code');
      expect(mockSetCode).toHaveBeenCalledWith('mocked code');
      expect(mockSetMode).toHaveBeenCalledWith('code');
      expect(mockSetActiveView).toHaveBeenCalledWith('editor');
      expect(mockSetMobilePanel).toHaveBeenCalledWith('editor');
    });

    test('auto-loads valid code block from the latest assistant message', () => {
      // Must be > 50 characters to trigger the auto-load logic
      const longCode = "a".repeat(60); 
      const assistantMessage = `Here is your code:\n\`\`\`javascript\n${longCode}\n\`\`\``;

      vi.mocked(useConversations).mockReturnValue({
        ...mockUseConversations,
        activeConversationId: '1',
        activeConversation: {
          id: '1',
          title: 'Test',
          messages: [{ id: 'm1', role: 'assistant', content: assistantMessage }]
        },
      } as any);

      renderComponent();

      // Because it's a standard useEffect, it runs on mount/update
      expect(mockSetCode).toHaveBeenCalledWith(longCode);
      expect(mockSetMode).toHaveBeenCalledWith('code');
      expect(mockSetActiveView).toHaveBeenCalledWith('editor');
    });

    test('auto-loads pure JSON without markdown from latest assistant message', () => {
      // Must be > 50 characters and valid JSON
      const validJson = JSON.stringify({ scadCode: "cube([10,10,10]);".repeat(5) });

      vi.mocked(useConversations).mockReturnValue({
        ...mockUseConversations,
        activeConversationId: '1',
        activeConversation: {
          id: '1',
          title: 'Test',
          messages: [{ id: 'm1', role: 'assistant', content: validJson }]
        },
      } as any);

      renderComponent();

      // It should extract the scadCode from the JSON payload
      expect(mockSetCode).toHaveBeenCalledWith("cube([10,10,10]);".repeat(5));
      expect(mockSetMode).toHaveBeenCalledWith('code'); // Code because it found scadCode
      expect(mockSetActiveView).toHaveBeenCalledWith('editor');
    });
  });

  describe('Imperative Handle (Refs)', () => {
    test('sendUserMessage calls handleSend internally', async () => {
      const ref = React.createRef<any>();
      renderComponent({ ref });

      await act(async () => {
        ref.current.sendUserMessage('Hello via ref');
      });

      expect(mockUseChat.sendMessage).toHaveBeenCalledWith('Hello via ref');
    });

    test('generateModel calls hook generateModel', async () => {
      const ref = React.createRef<any>();
      renderComponent({ ref });

      await act(async () => {
        ref.current.generateModel({ req: true });
      });

      expect(mockUseChat.generateModel).toHaveBeenCalledWith({ req: true });
    });
  });

  describe('Error Handling', () => {
    test('displays error and retry button', () => {
      vi.mocked(useChat).mockReturnValue({
        ...mockUseChat,
        error: 'Network failure',
      } as any);
      
      // Need messages array to render the error block
      vi.mocked(useConversations).mockReturnValue({
        ...mockUseConversations,
        activeConversationId: '1',
        activeConversation: { messages: [{ id: '1', role: 'user', content: 'test' }] },
      } as any);

      renderComponent();

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Network failure')).toBeInTheDocument();
      
      const retryBtn = screen.getByText('Retry').closest('button');
      fireEvent.click(retryBtn!);
      expect(mockUseChat.retryLastMessage).toHaveBeenCalled();
    });
  });
});