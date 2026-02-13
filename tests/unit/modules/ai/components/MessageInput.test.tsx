import { MessageInput } from "@/modules/ai/components/MessageInput";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock icons to avoid rendering issues
vi.mock("lucide-react", () => ({
  Paperclip: () => <div data-testid="icon-paperclip" />,
  Send: () => <div data-testid="icon-send" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
}));

describe("MessageInput", () => {
  const mockOnSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with initial state", () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    // Check input presence
    expect(
      screen.getByPlaceholderText(/Ask about CFD simulations/i)
    ).toBeInTheDocument();

    // Check buttons
    expect(screen.getByTitle("Attach file")).toBeInTheDocument();
    expect(screen.getByText("Send")).toBeInTheDocument();

    // Send button should be disabled initially (empty input)
    expect(screen.getByText("Send").closest("button")).toBeDisabled();
  });

  it("updates input value and character count when typing", async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText(/Ask about CFD simulations/i);

    // Type into the textarea
    await user.type(textarea, "Hello world");

    // Check value
    expect(textarea).toHaveValue("Hello world");

    // Check character count
    expect(screen.getByText("11 characters")).toBeInTheDocument();

    // Check AI indicator appears
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("calls onSendMessage and clears input when Send button is clicked", async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText(/Ask about CFD simulations/i);
    await user.type(textarea, "Test message");

    const sendBtn = screen.getByText("Send").closest("button");
    expect(sendBtn).toBeEnabled();

    await user.click(sendBtn!);

    expect(mockOnSendMessage).toHaveBeenCalledWith("Test message");
    expect(mockOnSendMessage).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue(""); // Should reset
  });

  it("calls onSendMessage when Enter is pressed (without Shift)", async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText(/Ask about CFD simulations/i);
    
    // user.type handles key events automatically
    await user.type(textarea, "Enter submission{enter}");

    expect(mockOnSendMessage).toHaveBeenCalledWith("Enter submission");
    expect(textarea).toHaveValue("");
  });

  it("does not send message when Shift+Enter is pressed", async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText(/Ask about CFD simulations/i);
    
    // Simulate typing "Line 1", Shift+Enter, "Line 2"
    await user.type(textarea, "Line 1{Shift>}{Enter}{/Shift}Line 2");

    expect(mockOnSendMessage).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("Line 1\nLine 2");
  });

  it("prevents sending empty or whitespace-only messages", async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText(/Ask about CFD simulations/i);
    
    await user.type(textarea, "   ");

    const sendBtn = screen.getByText("Send").closest("button");
    expect(sendBtn).toBeDisabled();

    // Try pressing enter
    await user.type(textarea, "{enter}");
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it("handles disabled state correctly", () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} disabled={true} />);

    const textarea = screen.getByPlaceholderText(/Ask about CFD simulations/i);
    const attachBtn = screen.getByTitle("Attach file");
    const sendBtn = screen.getByText("Send").closest("button");

    expect(textarea).toBeDisabled();
    expect(attachBtn).toBeDisabled();
    expect(sendBtn).toBeDisabled();
  });

  it("auto-focuses the textarea when rendered (or re-enabled)", () => {
    const { rerender } = render(
      <MessageInput onSendMessage={mockOnSendMessage} disabled={true} />
    );
    const textarea = screen.getByPlaceholderText(/Ask about CFD simulations/i);

    expect(textarea).not.toHaveFocus();

    // Rerender enabled
    rerender(<MessageInput onSendMessage={mockOnSendMessage} disabled={false} />);
    
    expect(textarea).toHaveFocus();
  });

});