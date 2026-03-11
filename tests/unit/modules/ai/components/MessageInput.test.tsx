import { MessageInput } from "@/modules/ai/components/MessageInput";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock icons
vi.mock("lucide-react", () => ({
  Send: () => <div data-testid="icon-send" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  ImagePlus: () => <div data-testid="icon-imageplus" />,
  X: () => <div data-testid="icon-x" />,
}));

// Mock ModelSelector
vi.mock("@/modules/ai/components/ModelSelector", () => ({
  ModelSelector: () => <div data-testid="model-selector" />,
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
      screen.getByPlaceholderText(/Describe a shape/i)
    ).toBeInTheDocument();

    // Check buttons
    expect(screen.getByTitle("Attach image")).toBeInTheDocument();
    expect(screen.getByTitle("Send (Enter)")).toBeInTheDocument();

    // Send button should be disabled initially (empty input)
    expect(screen.getByTitle("Send (Enter)")).toBeDisabled();
  });


  it("calls onSendMessage and clears input when Send button is clicked", async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText(/Describe a shape/i);
    await user.type(textarea, "Test message");

    const sendBtn = screen.getByTitle("Send (Enter)");
    expect(sendBtn).toBeEnabled();

    await user.click(sendBtn);

    expect(mockOnSendMessage).toHaveBeenCalledWith("Test message", undefined);
    expect(mockOnSendMessage).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue(""); // Should reset
  });

  it("calls onSendMessage when Enter is pressed (without Shift)", async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText(/Describe a shape/i);

    await user.type(textarea, "Enter submission{enter}");

    expect(mockOnSendMessage).toHaveBeenCalledWith("Enter submission", undefined);
    expect(textarea).toHaveValue("");
  });

  it("does not send message when Shift+Enter is pressed", async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText(/Describe a shape/i);

    await user.type(textarea, "Line 1{Shift>}{Enter}{/Shift}Line 2");

    expect(mockOnSendMessage).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("Line 1\nLine 2");
  });

  it("prevents sending empty or whitespace-only messages", async () => {
    const user = userEvent.setup();
    render(<MessageInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByPlaceholderText(/Describe a shape/i);

    await user.type(textarea, "   ");

    const sendBtn = screen.getByTitle("Send (Enter)");
    expect(sendBtn).toBeDisabled();

    // Try pressing enter
    await user.type(textarea, "{enter}");
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it("handles disabled state correctly", () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} disabled={true} />);

    const textarea = screen.getByPlaceholderText(/Describe a shape/i);
    const attachBtn = screen.getByTitle("Attach image");
    const sendBtn = screen.getByTitle("Send (Enter)");

    expect(textarea).toBeDisabled();
    expect(attachBtn).toBeDisabled();
    expect(sendBtn).toBeDisabled();
  });

  it("auto-focuses the textarea when rendered (or re-enabled)", () => {
    const { rerender } = render(
      <MessageInput onSendMessage={mockOnSendMessage} disabled={true} />
    );
    const textarea = screen.getByPlaceholderText(/Describe a shape/i);

    expect(textarea).not.toHaveFocus();

    // Rerender enabled
    rerender(<MessageInput onSendMessage={mockOnSendMessage} disabled={false} />);

    expect(textarea).toHaveFocus();
  });

});
