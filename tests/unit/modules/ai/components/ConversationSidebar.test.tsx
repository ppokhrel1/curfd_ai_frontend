import { ConversationSidebar } from "@/modules/ai/components/ConversationSidebar";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Mock the specific util dependency
vi.mock("@/utils/formatters", () => ({
  formatDistanceToNow: vi.fn(() => "5 mins ago"),
}));

// 2. Mock Lucide icons to keep DOM clean
vi.mock("lucide-react", () => ({
  MessageSquare: () => <div data-testid="icon-message-square" />,
  Plus: () => <div data-testid="icon-plus" />,
  Trash2: () => <div data-testid="icon-trash" />,
  X: () => <div data-testid="icon-x" />,
}));

// 3. Helper to generate dates relative to "now"
const getRelativeDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

// 4. Mock Data with fixed type assertions
const mockConversations = [
  {
    id: "1",
    title: "Project Alpha",
    messages: [
      { id: "m1", role: "user" as const, content: "Hello", timestamp: new Date() },
      { id: "m2", role: "assistant" as const, content: "Hi", timestamp: new Date() }
    ],
    createdAt: getRelativeDate(0), // Today
    updatedAt: getRelativeDate(0),
  },
  {
    id: "2",
    title: "Legacy Code",
    messages: [
      { id: "m3", role: "user" as const, content: "Fix bug", timestamp: new Date() }
    ],
    createdAt: getRelativeDate(1), // Yesterday
    updatedAt: getRelativeDate(1),
  },
  {
    id: "3",
    title: "Old Ideas",
    messages: [], // Empty array is valid
    createdAt: getRelativeDate(10), // Older
    updatedAt: getRelativeDate(10),
  },
];

describe("ConversationSidebar", () => {
  // We use 'any' cast here only if strict type checking of the mock against the 
  // imported prop type fails due to missing optional properties in the mock.
  // However, 'as const' above resolves the primary 'role' mismatch.
  const defaultProps = {
    conversations: mockConversations as any, 
    activeConversationId: null,
    onSelectConversation: vi.fn(),
    onNewConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    onClose: vi.fn(),
    isOpen: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <ConversationSidebar {...defaultProps} isOpen={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders correctly when open", () => {
    render(<ConversationSidebar {...defaultProps} />);
    expect(screen.getByText("Conversations")).toBeInTheDocument();
  });

  it("displays empty state when there are no conversations", () => {
    render(<ConversationSidebar {...defaultProps} conversations={[]} />);
    
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
    expect(screen.getByText("Start a new chat to begin")).toBeInTheDocument();
    expect(screen.getByTestId("icon-message-square")).toBeInTheDocument();
  });

  it("renders conversation list grouped by date", () => {
    render(<ConversationSidebar {...defaultProps} />);

    // Check Headers (grouping logic)
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
    expect(screen.getByText("Older")).toBeInTheDocument();

    // Check Conversation Titles
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Legacy Code")).toBeInTheDocument();
    expect(screen.getByText("Old Ideas")).toBeInTheDocument();
  });

  it("highlights the active conversation", () => {
    render(
      <ConversationSidebar 
        {...defaultProps} 
        activeConversationId="1" 
      />
    );

    const activeItemText = screen.getByText("Project Alpha");
    const activeBtn = activeItemText.closest("button");
    
    const inactiveItemText = screen.getByText("Legacy Code");
    const inactiveBtn = inactiveItemText.closest("button");

    // Check active styling (bg-green-500/10)
    expect(activeBtn).toHaveClass("bg-green-500/10");
    expect(activeItemText).toHaveClass("text-green-400");

    // Check inactive styling
    expect(inactiveBtn).toHaveClass("hover:bg-neutral-900");
    expect(inactiveItemText).toHaveClass("text-white");
  });

  it("calls onNewConversation when header button is clicked", () => {
    render(<ConversationSidebar {...defaultProps} />);
    
    // Header icon button has title="New Chat"
    const headerBtn = screen.getByTitle("New Chat");
    fireEvent.click(headerBtn);
    
    expect(defaultProps.onNewConversation).toHaveBeenCalledTimes(1);
  });

  it("calls onNewConversation when main button is clicked", () => {
    render(<ConversationSidebar {...defaultProps} />);
    
    // Find the big button by text specifically
    const mainBtnText = screen.getByText("New Chat");
    fireEvent.click(mainBtnText);

    expect(defaultProps.onNewConversation).toHaveBeenCalledTimes(1);
  });

  it("calls onSelectConversation when an item is clicked", () => {
    render(<ConversationSidebar {...defaultProps} />);
    
    fireEvent.click(screen.getByText("Project Alpha"));
    expect(defaultProps.onSelectConversation).toHaveBeenCalledWith("1");
  });

  it("calls onDeleteConversation when delete icon is clicked and stops propagation", () => {
    render(<ConversationSidebar {...defaultProps} />);
    
    // Find delete buttons (title="Delete" is set in component)
    const deleteBtns = screen.getAllByTitle("Delete");
    
    // Click the first one (corresponding to ID 1)
    fireEvent.click(deleteBtns[0]);

    // Check delete was called
    expect(defaultProps.onDeleteConversation).toHaveBeenCalledWith("1");
    
    // Verify stopPropagation worked (select should NOT be called)
    expect(defaultProps.onSelectConversation).not.toHaveBeenCalled();
  });

  it("calls onClose when close icon is clicked", () => {
    render(<ConversationSidebar {...defaultProps} />);
    
    // The close button wraps the X icon. Find by test id of mock icon.
    const closeIcon = screen.getByTestId("icon-x");
    const closeBtn = closeIcon.closest("button");
    
    fireEvent.click(closeBtn!);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const { container } = render(<ConversationSidebar {...defaultProps} />);
    
    // Query backdrop by class since it has no role/text
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const backdrop = container.querySelector(".fixed.inset-0.bg-black\\/50");
    
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});