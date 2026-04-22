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
  ArrowRight: () => <div data-testid="icon-arrowright" />,
  FileCode2: () => <div data-testid="icon-filecode2" />,
  RefreshCw: () => <div data-testid="icon-refreshcw" />,
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
      expect(container.firstChild).toHaveClass("space-y-4");
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

      expect(screen.getByText(/Hi there/)).toBeInTheDocument();
    });
  });

  describe("MessageBubble Styling & Logic", () => {
    it("renders User message correctly (Right aligned, User Icon)", () => {
      const msg = createMessage("user", "User Message");
      render(<MessageList messages={[msg]} />);

      const mainContainer = screen.getByTestId("icon-user").closest("div.flex.gap-2\\.5");
      expect(mainContainer).toHaveClass("flex-row-reverse");
      expect(screen.getByTestId("icon-user")).toBeInTheDocument();
    });

    it("renders Bot message correctly (Left aligned, Bot Icon)", () => {
      const msg = createMessage("assistant", "Bot Message");
      render(<MessageList messages={[msg]} />);

      act(() => {
        vi.runAllTimers();
      });

      const mainContainer = screen.getByTestId("icon-bot").closest("div.flex.gap-2\\.5");
      expect(mainContainer).toHaveClass("flex-row");
      expect(screen.getByTestId("icon-bot")).toBeInTheDocument();
    });
  });

  describe("Auto-Open / Component Side Effects", () => {
    it("renders ModelCard for large code blocks (auto-open is now handled by ChatInterface)", () => {
      const onOpenMock = vi.fn();
      // Create a payload > 150 characters
      const largeCode = "a".repeat(160);
      const msg = createMessage("assistant", `\`\`\`javascript\n${largeCode}\n\`\`\``);

      render(<MessageList messages={[msg]} onOpenInEditor={onOpenMock} />);

      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Auto-open is now handled by ChatInterface's AUTO-LOAD EFFECT,
      // not by MessageList. MessageList just renders the ModelCard.
      expect(screen.getByText("Open in Editor")).toBeInTheDocument();
    });

    it("does not auto-open if the message is NOT the latest", () => {
      const onOpenMock = vi.fn();
      const largeCode = "a".repeat(160);
      const messages = [
        createMessage("assistant", `\`\`\`javascript\n${largeCode}\n\`\`\``, "1"),
        createMessage("user", "Next command", "2")
      ];

      Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });

      render(<MessageList messages={messages} onOpenInEditor={onOpenMock} />);

      act(() => {
        vi.runAllTimers();
      });

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
      expect(headingEl.tagName).toBe("STRONG");
      expect(headingEl).toHaveClass("font-semibold", "text-neutral-900");
    });

    it("renders inline bold and code formatting", () => {
      const msg = createMessage("assistant", "Use **bold** and `const x`");
      render(<MessageList messages={[msg]} />);
      act(() => { vi.runAllTimers(); });

      const boldEl = screen.getByText("bold");
      expect(boldEl.tagName).toBe("STRONG");
      expect(boldEl).toHaveClass("font-semibold");

      const codeEl = screen.getByText("const x");
      expect(codeEl.tagName).toBe("CODE");
      expect(codeEl).toHaveClass("font-mono");
    });

    it("renders bullet points", () => {
      const msg = createMessage("assistant", "- Item 1\n* Item 2");
      render(<MessageList messages={[msg]} />);
      act(() => { vi.runAllTimers(); });

      expect(screen.getByText(/- Item 1/)).toBeInTheDocument();
      expect(screen.getByText(/Item 2/)).toBeInTheDocument();
    });

    it("renders small code blocks as inline <pre> tags", () => {
      const msg = createMessage("assistant", "```js\nconsole.log('hi');\n```");
      render(<MessageList messages={[msg]} />);
      act(() => { vi.runAllTimers(); });

      const codeBlock = screen.getByText("console.log('hi');");
      expect(codeBlock.closest("pre")).toBeInTheDocument();
    });
  });

  describe("ModelCard (Large Code Blocks)", () => {
    it("renders ModelCard with 'Open in Editor' button for large code blocks", () => {
      const onOpenMock = vi.fn();
      const mockJson = { scadCode: "cube([10, 10, 10]); ".repeat(15) };
      const content = `\`\`\`json\n${JSON.stringify(mockJson)}\n\`\`\``;

      render(<MessageList messages={[createMessage("assistant", content)]} onOpenInEditor={onOpenMock} />);
      act(() => { vi.runAllTimers(); });

      const button = screen.getByText("Open in Editor");
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(onOpenMock).toHaveBeenCalledWith(JSON.stringify(mockJson), "code");
    });

    it("renders ModelCard for large raw content and calls onOpen", () => {
      const onOpenMock = vi.fn();
      const mockJson = { requirements: "Make a box ".repeat(20) };
      const content = `\`\`\`json\n${JSON.stringify(mockJson)}\n\`\`\``;

      render(<MessageList messages={[createMessage("assistant", content)]} onOpenInEditor={onOpenMock} />);
      act(() => { vi.runAllTimers(); });

      const button = screen.getByText("Open in Editor");
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(onOpenMock).toHaveBeenCalledWith(JSON.stringify(mockJson), "code");
    });
  });

  describe("TypewriterEffect", () => {
    it("animates content over time", () => {
      const shortMsg = createMessage("assistant", "Hello world");
      render(<MessageList messages={[shortMsg]} />);

      act(() => {
        vi.runAllTimers();
      });

      expect(screen.getByText(/Hello world/)).toBeInTheDocument();
    });

    it("skips typewriter animation for large code blocks", () => {
      const largeCode = "a".repeat(250);
      const msg = createMessage("assistant", `\`\`\`javascript\n${largeCode}\n\`\`\``);

      render(<MessageList messages={[msg]} />);

      // ModelCard should render immediately without needing to advance timers
      expect(screen.getByText("Open in Editor")).toBeInTheDocument();
    });

    it("animates long normal text over time", () => {
      const longText = "This is a normal message that is long enough to type out.";
      const msg = createMessage("assistant", longText);

      render(<MessageList messages={[msg]} />);

      // Initially partial
      expect(screen.queryByText(/This is a normal message/)).not.toBeInTheDocument();

      // Advance to completion
      act(() => {
        vi.runAllTimers();
      });

      expect(screen.getByText(/This is a normal message that is long enough to type out/)).toBeInTheDocument();
    });
  });
});
