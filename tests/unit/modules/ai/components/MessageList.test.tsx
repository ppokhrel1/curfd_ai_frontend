import { MessageList } from "@/modules/ai/components/MessageList";
import type { Message } from "@/modules/ai/types/chat.type";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 1. Mock Utilities
vi.mock("@/utils/formatters", () => ({
  formatTime: vi.fn(() => "10:00 AM"),
}));

// 2. Mock Lucide Icons
vi.mock("lucide-react", () => ({
  Bot: () => <div data-testid="icon-bot" />,
  User: () => <div data-testid="icon-user" />,
  Code2: () => <div data-testid="icon-code2" />,
  Box: () => <div data-testid="icon-box" />,
}));

// 3. Helper to create messages
const createMessage = (role: "user" | "assistant", content: string, id = "1"): Message => ({
  id,
  role,
  content,
  timestamp: new Date(),
});

describe("MessageList Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Rendering Basics", () => {
    it("renders empty list without crashing", () => {
      const { container } = render(<MessageList messages={[]} />);
      expect(container.firstChild).toHaveClass("space-y-6");
      expect(container.firstChild).toBeEmptyDOMElement();
    });

    it("renders a list of messages", () => {
      const messages = [
        createMessage("user", "Hello"),
        createMessage("assistant", "Hi there!"),
      ];

      render(<MessageList messages={messages} />);

      // User content renders immediately
      expect(screen.getByText("Hello")).toBeInTheDocument();
      
      // Advance timers for TypewriterEffect
      act(() => {
        vi.runAllTimers();
      });
      expect(screen.getByText("Hi there!")).toBeInTheDocument();
    });
  });

  describe("MessageBubble Styling & Logic", () => {
    it("renders User message correctly (Right aligned, User Icon)", () => {
      const msg = createMessage("user", "User Message");
      render(<MessageList messages={[msg]} />);

      const mainContainer = screen.getByTestId("icon-user").closest("div.flex.gap-3");
      expect(mainContainer).toHaveClass("flex-row-reverse");
      expect(screen.getByTestId("icon-user")).toBeInTheDocument();
      expect(screen.queryByText("CURFD")).not.toBeInTheDocument();
    });

    it("renders Bot message correctly (Left aligned, Bot Icon, CURFD label)", () => {
      const msg = createMessage("assistant", "Bot Message");
      render(<MessageList messages={[msg]} />);

      act(() => {
        vi.runAllTimers();
      });

      const mainContainer = screen.getByTestId("icon-bot").closest("div.flex.gap-3");
      expect(mainContainer).toHaveClass("flex-row");
      expect(screen.getByTestId("icon-bot")).toBeInTheDocument();
      expect(screen.getByText("CURFD")).toBeInTheDocument();
    });

    it("shows a pulsing dot for the latest bot message", () => {
      const messages = [
        createMessage("assistant", "Old message", "1"),
        createMessage("assistant", "New message", "2"),
      ];

      const { container } = render(<MessageList messages={messages} />);
      act(() => { vi.runAllTimers(); });

      // Look for the specific pulsing dot element
      const pulseDots = container.querySelectorAll(".w-1.h-1.bg-green-500.rounded-full.animate-pulse");
      expect(pulseDots).toHaveLength(1);
    });
  });

  describe("Auto-Open / Component Side Effects", () => {
    it("auto-opens large code blocks if it is the latest message", () => {
      const onOpenMock = vi.fn();
      // Create a payload > 150 characters
      const largeCode = "a".repeat(160);
      const msg = createMessage("assistant", `\`\`\`javascript\n${largeCode}\n\`\`\``);
      
      render(<MessageList messages={[msg]} onOpenInEditor={onOpenMock} />);

      act(() => {
        // Advance past the 100ms setTimeout in MessageBubble
        vi.advanceTimersByTime(150);
      });

      expect(onOpenMock).toHaveBeenCalledWith(largeCode, "code");
      expect(onOpenMock).toHaveBeenCalledTimes(1);
    });

    it("does not auto-open if the message is NOT the latest", () => {
      const onOpenMock = vi.fn();
      const largeCode = "a".repeat(160);
      const messages = [
        createMessage("assistant", `\`\`\`javascript\n${largeCode}\n\`\`\``, "1"), // Old message
        createMessage("user", "Next command", "2") // Latest
      ];
      
      render(<MessageList messages={messages} onOpenInEditor={onOpenMock} />);

      act(() => {
        vi.runAllTimers();
      });

      // Should not be called because the first message is not the latest
      expect(onOpenMock).not.toHaveBeenCalled();
    });
  });

  describe("FormattedContent Rendering", () => {
    it("strips JSON data markers", () => {
      const content = "Real content|||JSON_DATA|||{ hidden: true }";
      
      const msg = createMessage("assistant", content);
      
      render(<MessageList messages={[msg]} />);
      
      act(() => { vi.runAllTimers(); });
      
      expect(screen.getByText("Real content")).toBeInTheDocument();
      expect(screen.queryByText("{ hidden: true }")).not.toBeInTheDocument();
    });

    it("renders bold headings for full lines", () => {
      const msg = createMessage("assistant", "**Section Title**\nNormal text");
      render(<MessageList messages={[msg]} />);
      act(() => { vi.runAllTimers(); });

      const headingEl = screen.getByText("Section Title");
      expect(headingEl.tagName).toBe("H3");
      expect(headingEl).toHaveClass("font-bold", "text-green-400");
    });

    it("renders inline bold and code formatting", () => {
      const msg = createMessage("assistant", "Use **bold** and `const x`");
      render(<MessageList messages={[msg]} />);
      act(() => { vi.runAllTimers(); });

      const boldEl = screen.getByText("bold");
      expect(boldEl.tagName).toBe("STRONG");
      expect(boldEl).toHaveClass("font-bold");

      const codeEl = screen.getByText("const x");
      expect(codeEl.tagName).toBe("CODE");
      expect(codeEl).toHaveClass("font-mono");
    });

    it("renders bullet points", () => {
      const msg = createMessage("assistant", "- Item 1\n* Item 2\n✓ Item 3");
      render(<MessageList messages={[msg]} />);
      act(() => { vi.runAllTimers(); });

      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
      expect(screen.getByText("Item 3")).toBeInTheDocument();
    });

    it("renders small code blocks as inline <pre> tags", () => {
      const msg = createMessage("assistant", "```js\nconsole.log('hi');\n```");
      render(<MessageList messages={[msg]} />);
      act(() => { vi.runAllTimers(); });

      const codeBlock = screen.getByText("console.log('hi');");
      expect(codeBlock.closest("pre")).toBeInTheDocument();
    });
  });

  describe("ClickablePayloadPill (Large Payloads)", () => {
    it("renders 'Model Generated' pill for extracted scadCode and calls onOpen", () => {
      const onOpenMock = vi.fn();
      // Payload > 150 chars
      const mockJson = { scadCode: "cube([10, 10, 10]); ".repeat(15) };
      const content = `\`\`\`json\n${JSON.stringify(mockJson)}\n\`\`\``;
      
      render(<MessageList messages={[createMessage("assistant", content)]} onOpenInEditor={onOpenMock} />);
      act(() => { vi.runAllTimers(); });

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(screen.getByText("Model Generated")).toBeInTheDocument();

      fireEvent.click(button);
      expect(onOpenMock).toHaveBeenCalledWith(mockJson.scadCode, "code");
    });

    it("renders 'Specification Ready' pill for raw large JSON and calls onOpen", () => {
      const onOpenMock = vi.fn();
      // Payload > 150 chars without scadCode
      const mockJson = { requirements: "Make a box ".repeat(20) };
      const content = `\`\`\`json\n${JSON.stringify(mockJson)}\n\`\`\``;
      
      render(<MessageList messages={[createMessage("assistant", content)]} onOpenInEditor={onOpenMock} />);
      act(() => { vi.runAllTimers(); });

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(screen.getByText("Specification Ready")).toBeInTheDocument();

      fireEvent.click(button);
      // Because it's raw JSON without scadCode, it passes the raw string and type "requirements"
      expect(onOpenMock).toHaveBeenCalledWith(JSON.stringify(mockJson), "requirements");
    });
  });

  describe("TypewriterEffect", () => {
    it("renders short content immediately without animation", () => {
      const shortMsg = createMessage("assistant", "Hi"); // < 5 chars
      render(<MessageList messages={[shortMsg]} />);

      // Should be there immediately without advancing timers
      expect(screen.getByText("Hi")).toBeInTheDocument();
    });

    it("skips typewriter animation for large code blocks", () => {
      const largeCode = "a".repeat(250);
      const msg = createMessage("assistant", `\`\`\`javascript\n${largeCode}\n\`\`\``);
      
      render(<MessageList messages={[msg]} />);

      // Pill should render immediately without needing to advance timers
      // Because typewriter is skipped for large code blocks
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("animates long normal text over time", () => {
      const longText = "This is a normal message that is long enough to type out.";
      const msg = createMessage("assistant", longText);
      
      render(<MessageList messages={[msg]} />);

      // Initially partial
      expect(screen.queryByText(longText)).not.toBeInTheDocument();

      // Advance to completion
      act(() => {
        vi.runAllTimers();
      });

      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });
});