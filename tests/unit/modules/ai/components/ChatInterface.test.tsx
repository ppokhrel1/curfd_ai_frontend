import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { useChat } from '@/modules/ai/hooks/useChat';
import { useConversations } from '@/modules/ai/hooks/useConversations';
import { useChatStore } from '@/modules/ai/stores/chatStore';
import { useEditorStore } from '@/modules/editor/stores/editorStore';
import { ChatInterface } from '@/modules/ai/components/ChatInterface';

// Mock hooks using the same aliases as imports
vi.mock('@/modules/ai/hooks/useChat');
vi.mock('@/modules/ai/hooks/useConversations');
vi.mock('@/modules/ai/stores/chatStore');
vi.mock('@/modules/editor/stores/editorStore');
vi.mock('@/pages/HomePage/hooks', () => ({
  useViewState: vi.fn(),
}));

// Mock child components using aliases (same as imports in ChatInterface)
vi.mock('@/modules/ai/components/MessageInput', () => ({
  MessageInput: ({ onSendMessage, disabled }) => (
    <div data-testid="message-input">
      <input
        type="text"
        placeholder="Mock input"
        disabled={disabled}
        onChange={(e) => onSendMessage(e.target.value)}
      />
    </div>
  ),
}));

vi.mock('@/modules/ai/components/MessageList', () => ({
  MessageList: ({ messages }) => (
    <div data-testid="message-list">
      {messages.map((msg, idx) => (
        <div key={idx} data-testid={`message-${msg.role}`}>
          {msg.content}
        </div>
      ))}
    </div>
  ),
}));

// Mock lucide-react icons, including all icons used in the component tree
vi.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="icon-alertcircle" />,
  Bot: () => <div data-testid="icon-bot" />,
  History: () => <div data-testid="icon-history" />,
  Menu: () => <div data-testid="icon-menu" />,
  Plus: () => <div data-testid="icon-plus" />,
  RefreshCcw: () => <div data-testid="icon-refresh" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  X: (props) => <div data-testid="icon-x" {...props} />,
  Box: () => <div data-testid="icon-box" />,
  Paperclip: () => <div data-testid="icon-paperclip" />,
  User: () => <div data-testid="icon-user" />,
}));

describe('ChatInterface', () => {
  // Default mock implementations with all required properties
  const mockUseChat = {
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
    generateModel: vi.fn(),
    sendSystemMessage: vi.fn(),
    clearMessages: vi.fn(),
    retryLastMessage: vi.fn(),
    isGeneratingGlobally: false,
    // Added missing properties to match UseChatReturn type
    messages: [],
    setMessages: vi.fn(),
    activeChatId: null,
  };

  const mockUseConversations = {
    conversations: [],
    activeConversationId: null,
    activeConversation: null,
    isLoadingChats: false,
    loadError: null,
    createConversation: vi.fn(),
    setActiveConversation: vi.fn(),
    deleteConversation: vi.fn(),
    setConversationShape: vi.fn(),
    addMessageToConversation: vi.fn(),
    renameConversation: vi.fn(),
    // Added missing property to match UseConversationsReturn type
    clearActiveConversation: vi.fn(),
    clearMessages: vi.fn(), 
    retryLastMessage: vi.fn(), // Added this missing function
  };

  const mockUseChatStore = {
    generatingChatIds: new Set(),
    generatingChatStatus: {},
  };

  const mockUseEditorStore = {
    setCode: vi.fn(),
    setOriginalCode: vi.fn(),
  };

  const mockSetActiveView = vi.fn();
  const mockSetMobilePanel = vi.fn();
  const mockOnShapeGenerated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock scrollIntoView since JSDOM doesn't support it
    Element.prototype.scrollIntoView = vi.fn();

    // Use vi.mocked for type-safe mocking
    vi.mocked(useChat).mockReturnValue(mockUseChat);
    vi.mocked(useConversations).mockReturnValue(mockUseConversations);
    vi.mocked(useChatStore).mockReturnValue(mockUseChatStore as any);
    vi.mocked(useEditorStore).mockReturnValue(mockUseEditorStore as any);
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

  test('renders without crashing', () => {
    renderComponent();
    expect(screen.getByText('Ready to Help')).toBeInTheDocument();
  });

  test('renders empty state when no messages', () => {
    renderComponent();
    expect(screen.getByText('Ready to Help')).toBeInTheDocument();
    expect(screen.getByText('Generate 3D models or ask questions')).toBeInTheDocument();
  });

  test('renders messages when active conversation exists', () => {
    const messages = [
      { id: '1', role: 'user', content: 'Hello' },
      { id: '2', role: 'assistant', content: 'Hi there' },
    ];
    vi.mocked(useConversations).mockReturnValue({
      ...mockUseConversations,
      activeConversationId: '123',
      activeConversation: {
        id: '123',
        title: 'Test Chat',
        messages,
        generatedShape: null,
      },
    });

    renderComponent();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('Test Chat')).toBeInTheDocument();
    expect(screen.getByText('2 msgs')).toBeInTheDocument();
  });

  test('shows loading state for chats', () => {
    vi.mocked(useConversations).mockReturnValue({
      ...mockUseConversations,
      isLoadingChats: true,
    });

    const { container } = renderComponent();
    // Check for the skeleton loader by class since it has no role/text
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  test('shows error state for chats', () => {
    vi.mocked(useConversations).mockReturnValue({
      ...mockUseConversations,
      loadError: 'Network error',
    });

    renderComponent();
    expect(screen.getByText('Failed to load chats')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  test('shows empty state for chats when no conversations', () => {
    vi.mocked(useConversations).mockReturnValue({
      ...mockUseConversations,
      conversations: [],
    });

    renderComponent();
    expect(screen.getByText('No chats yet')).toBeInTheDocument();
  });

  test('sidebar toggles when menu button and overlay clicked', () => {
    const { container } = renderComponent();
    const menuButton = screen.getByTestId('icon-menu').closest('button')!;
    fireEvent.click(menuButton);
    const sidebar = screen.getByText('History').closest('div[class*="fixed"]');
    expect(sidebar).toHaveClass('translate-x-0');

    const overlayDiv = container.querySelector('.fixed.inset-0.bg-black\\/50');
    expect(overlayDiv).toBeInTheDocument();
    fireEvent.click(overlayDiv!);
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  test('clicking new chat button calls handleNewChat', () => {
    const { setActiveConversation, clearMessages } = mockUseConversations;
    renderComponent();
    // Select the "New Chat" button from the sidebar explicitly
    const newChatButton = screen.getByRole('button', { name: 'New Chat' });
    fireEvent.click(newChatButton);
    expect(setActiveConversation).toHaveBeenCalledWith(null);
    expect(clearMessages).toHaveBeenCalled();
    expect(mockOnShapeGenerated).toHaveBeenCalledWith(null);
  });

  test('selecting a conversation calls setActiveConversation', () => {
    const conversations = [
      { id: '1', title: 'Chat 1', messages: [], generatedShape: null },
    ];
    vi.mocked(useConversations).mockReturnValue({
      ...mockUseConversations,
      conversations,
    });

    renderComponent();
    fireEvent.click(screen.getByTestId('icon-menu').closest('button')!);
    const chatItem = screen.getByText('Chat 1').closest('div[class*="cursor-pointer"]')!;
    fireEvent.click(chatItem);
    expect(mockUseConversations.setActiveConversation).toHaveBeenCalledWith('1');
  });

  test('deleting a conversation calls deleteConversation', () => {
    const conversations = [
      { id: '1', title: 'Chat 1', messages: [], generatedShape: null },
    ];
    vi.mocked(useConversations).mockReturnValue({
      ...mockUseConversations,
      conversations,
    });

    renderComponent();
    fireEvent.click(screen.getByTestId('icon-menu').closest('button')!);
    // The first 'icon-x' is the close sidebar button. The second is the delete chat button.
    const deleteButton = screen.getAllByTestId('icon-x')[1].closest('button')!;
    fireEvent.click(deleteButton);
    expect(mockUseConversations.deleteConversation).toHaveBeenCalledWith('1');
  });

  test('sending a message calls sendMessage', () => {
    const sendMessage = vi.fn();
    vi.mocked(useChat).mockReturnValue({
      ...mockUseChat,
      sendMessage,
    });

    renderComponent();
    const input = screen.getByPlaceholderText('Mock input');
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(sendMessage).toHaveBeenCalledWith('Hello');
  });

  test('retry button appears when error exists', () => {
    const retryLastMessage = vi.fn();
    const messages = [{ id: '1', role: 'user', content: 'User msg' }];
    
    vi.mocked(useConversations).mockReturnValue({
      ...mockUseConversations,
      activeConversationId: '123',
      activeConversation: {
        id: '123',
        title: 'Test',
        messages,
        generatedShape: null,
      },
      retryLastMessage, // Ensure this is returned from the hook
    });

    vi.mocked(useChat).mockReturnValue({
      ...mockUseChat,
      error: 'Something went wrong',
    });

    renderComponent();
    // The text 'Error' appears in the UI
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    const retryButton = screen.getByText('Retry').closest('button')!;
    fireEvent.click(retryButton);
    expect(retryLastMessage).toHaveBeenCalled();
  });

  describe('renderMessageExtras', () => {
    test('displays View Editor button when assistant message has scadCode', () => {
      const assistantMessage = {
        id: 'msg1',
        role: 'assistant',
        content: JSON.stringify({ scadCode: 'cube(10);' }),
      };
      const activeConversation = {
        id: '123',
        title: 'Test',
        messages: [assistantMessage],
        generatedShape: null,
      };
      vi.mocked(useConversations).mockReturnValue({
        ...mockUseConversations,
        activeConversationId: '123',
        activeConversation,
      });

      renderComponent();
      expect(screen.getByText('Model Generated')).toBeInTheDocument();
      // Use 'Editor' not 'View Editor' as per component code
      expect(screen.getByText('Editor')).toBeInTheDocument();
    });

    test('displays Generate 3D button when assistant message has detailed_geometric_instructions', () => {
      const assistantMessage = {
        id: 'msg1',
        role: 'assistant',
        content: JSON.stringify({ detailed_geometric_instructions: 'some spec' }),
      };
      const activeConversation = {
        id: '123',
        title: 'Test',
        messages: [assistantMessage],
        generatedShape: null,
      };
      vi.mocked(useConversations).mockReturnValue({
        ...mockUseConversations,
        activeConversationId: '123',
        activeConversation,
      });

      renderComponent();
      expect(screen.getByText('Specification Ready')).toBeInTheDocument();
      // Use 'Generate' not 'Generate 3D' as per component code
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });

    test('clicking Generate 3D calls generateModel', () => {
      const generateModel = vi.fn();
      vi.mocked(useChat).mockReturnValue({
        ...mockUseChat,
        generateModel,
      });

      const specContent = { detailed_geometric_instructions: 'spec' };
      const assistantMessage = {
        id: 'msg1',
        role: 'assistant',
        content: JSON.stringify(specContent),
      };
      const activeConversation = {
        id: '123',
        title: 'Test',
        messages: [assistantMessage],
        generatedShape: null,
      };
      vi.mocked(useConversations).mockReturnValue({
        ...mockUseConversations,
        activeConversationId: '123',
        activeConversation,
      });

      renderComponent();
      const generateButton = screen.getByText('Generate').closest('button')!;
      fireEvent.click(generateButton);
      expect(generateModel).toHaveBeenCalledWith(specContent);
    });

    test('clicking View Editor calls handleViewEditor which sets code and switches view', () => {
      const { setCode, setOriginalCode } = mockUseEditorStore;

      const assistantMessage = {
        id: 'msg1',
        role: 'assistant',
        content: JSON.stringify({ scadCode: 'cube(10);' }),
      };
      const activeConversation = {
        id: '123',
        title: 'Test',
        messages: [assistantMessage],
        generatedShape: null,
      };
      vi.mocked(useConversations).mockReturnValue({
        ...mockUseConversations,
        activeConversationId: '123',
        activeConversation,
      });

      renderComponent();
      const viewEditorButton = screen.getByText('Editor').closest('button')!;
      fireEvent.click(viewEditorButton);

      expect(setOriginalCode).toHaveBeenCalledWith('cube(10);');
      expect(setCode).toHaveBeenCalledWith('cube(10);');
      expect(mockSetActiveView).toHaveBeenCalledWith('editor');
      expect(mockSetMobilePanel).toHaveBeenCalledWith('editor');
    });
  });


  test('sendUserMessage via ref calls sendMessage', () => {
    const sendMessage = vi.fn();
    vi.mocked(useChat).mockReturnValue({
      ...mockUseChat,
      sendMessage,
    });

    const ref = React.createRef<any>();
    renderComponent({ ref });

    act(() => {
      ref.current.sendUserMessage('User typed message');
    });

    expect(sendMessage).toHaveBeenCalledWith('User typed message');
  });

  test('onShapeGenerated is called when active conversation changes and has shape', () => {
    const shape = { scadCode: 'cube(10);' };
    const activeConversation = {
      id: '123',
      title: 'Test',
      messages: [],
      generatedShape: shape,
    };
    vi.mocked(useConversations).mockReturnValue({
      ...mockUseConversations,
      activeConversationId: '123',
      activeConversation,
    });

    renderComponent();
    expect(mockOnShapeGenerated).toHaveBeenCalledWith(shape);
  });

  test('title is renamed after first user message', () => {
    const renameConversation = vi.fn();
    vi.mocked(useConversations).mockReturnValue({
      ...mockUseConversations,
      activeConversationId: '123',
      activeConversation: {
        id: '123',
        title: 'New Chat',
        messages: [{ role: 'user', content: 'This is a long user message with multiple words to test title generation' }],
        generatedShape: null,
      },
      renameConversation,
    });

    renderComponent();
    expect(renameConversation).toHaveBeenCalledWith('123', 'This is a long...');
  });

  test('auto-scroll on new messages', () => {
    const scrollIntoViewMock = Element.prototype.scrollIntoView;
    const messages = [{ role: 'user', content: 'Hello' }];
    vi.mocked(useConversations).mockReturnValue({
      ...mockUseConversations,
      activeConversationId: '123',
      activeConversation: {
        id: '123',
        title: 'Test',
        messages,
        generatedShape: null,
      },
    });

    renderComponent();
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  test('handleInternalShapeGenerated calls setConversationShape and onShapeGenerated if active', () => {
    const setConversationShape = vi.fn();
    vi.mocked(useConversations).mockReturnValue({
      ...mockUseConversations,
      activeConversationId: '123',
      setConversationShape,
    });

    let capturedShapeGeneratedCallback: any;
    vi.mocked(useChat).mockImplementation((id: any, onShapeGenerated: any) => {
      capturedShapeGeneratedCallback = onShapeGenerated;
      return mockUseChat;
    });

    renderComponent();
    const shape = { scadCode: 'cube(10);' };
    act(() => {
      capturedShapeGeneratedCallback(shape, '123');
    });

    expect(setConversationShape).toHaveBeenCalledWith('123', shape);
    expect(mockOnShapeGenerated).toHaveBeenCalledWith(shape);
  });

  test('handleInternalMessageReceived calls addMessageToConversation', () => {
    const addMessageToConversation = vi.fn();
    vi.mocked(useConversations).mockReturnValue({
      ...mockUseConversations,
      addMessageToConversation,
    });

    let capturedMessageReceivedCallback: any;
    vi.mocked(useChat).mockImplementation((id, onShapeGenerated, onMessageReceived) => {
      capturedMessageReceivedCallback = onMessageReceived;
      return mockUseChat;
    });

    renderComponent();
    const message = { id: 'msg1', role: 'assistant', content: 'Test' };
    act(() => {
      capturedMessageReceivedCallback(message, '123');
    });

    expect(addMessageToConversation).toHaveBeenCalledWith(message, '123');
  });
});