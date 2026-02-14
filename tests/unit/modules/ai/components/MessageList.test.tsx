import { MessageList } from "@/modules/ai/components/MessageList";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";


// 1. Mock Utilities
vi.mock("@/utils/formatters", () => ({
  formatTime: vi.fn(() => "10:00 AM"),
}));

// 2. Mock Icons
vi.mock("lucide-react", () => ({
  Bot: () => <div data-testid="icon-bot" />,
  User: () => <div data-testid="icon-user" />,
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
    it("renders a list of messages", () => {
      const messages = [
        createMessage("user", "Hello"),
        createMessage("assistant", "Hi there"),
      ];

      render(<MessageList messages={messages} />);

      // User content renders immediately
      expect(screen.getByText("Hello")).toBeInTheDocument();
      
      // Assistant content might need time (Typewriter), but "Hi there" is > 5 chars
      // Wait for typewriter
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByText("Hi there")).toBeInTheDocument();
    });

    it("renders empty list without crashing", () => {
      const { container } = render(<MessageList messages={[]} />);
      // Should find the wrapper div
      expect(container.firstChild).toHaveClass("space-y-6");
      expect(container.firstChild).toBeEmptyDOMElement();
    });
  });

  describe("MessageBubble Styling & Logic", () => {
    it("renders User message correctly (Right aligned, User Icon)", () => {
      const msg = createMessage("user", "User Message");
      render(<MessageList messages={[msg]} />);

      // Check alignment class (flex-row-reverse)
      const bubbleContainer = screen.getByText("User Message").closest(".flex");
      // Note: We look for parent of parent usually, but dependent on DOM structure
      // Let's look for the container wrapping avatar and content
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
      
      act(() => {
        vi.runAllTimers();
      });

      // Find all pulse dots
      // Since specific classes are used: w-1 h-1 bg-green-500 rounded-full animate-pulse
      // We can query by selector
      const dots = container.querySelectorAll(".animate-pulse");
      
      // Should only have 1 dot (for the latest message)
      // Note: The outer bubble also has 'animate-in', so specifically look for the dot
      const pulseDots = Array.from(dots).filter(el => el.classList.contains("w-1") && el.classList.contains("bg-green-500"));
      
      expect(pulseDots).toHaveLength(1);
    });
  });

  describe("FormattedContent Rendering", () => {
    it("renders bold text correctly", () => {
      const msg = createMessage("user", "This is **bold** text");
      render(<MessageList messages={[msg]} />);

      const boldEl = screen.getByText("bold");
      expect(boldEl.tagName).toBe("STRONG");
      expect(boldEl).toHaveClass("font-bold");
    });

    it("renders inline code correctly", () => {
      const msg = createMessage("user", "Use `const x = 1` here");
      render(<MessageList messages={[msg]} />);

      const codeEl = screen.getByText("const x = 1");
      expect(codeEl.tagName).toBe("CODE");
      expect(codeEl).toHaveClass("font-mono");
    });

    it("renders bullet points", () => {
      const msg = createMessage("user", "- Item 1\n* Item 2");
      render(<MessageList messages={[msg]} />);

      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
      
      // Check for the visual dot
      const dots = screen.getAllByText((content, element) => {
        return element?.classList.contains("rounded-full") && element.classList.contains("w-1.5");
      });
      expect(dots.length).toBeGreaterThanOrEqual(2);
    });

    it("renders numbered lists", () => {
      const msg = createMessage("user", "1. First step");
      render(<MessageList messages={[msg]} />);

      expect(screen.getByText("1.")).toBeInTheDocument();
      expect(screen.getByText("First step")).toBeInTheDocument();
    });

    it("strips JSON data markers", () => {
      const content = "Real content|||JSON_DATA|||{ hidden: true }";
      const msg = createMessage("user", content);
      
      render(<MessageList messages={[msg]} />);
      
      expect(screen.getByText("Real content")).toBeInTheDocument();
      expect(screen.queryByText("{ hidden: true }")).not.toBeInTheDocument();
    });
  });

  describe("TypewriterEffect", () => {
    it("renders short content immediately without animation", () => {
      const shortMsg = createMessage("assistant", "Hi"); // < 5 chars
      render(<MessageList messages={[shortMsg]} />);

      // Should be there immediately without advancing timers
      expect(screen.getByText("Hi")).toBeInTheDocument();
    });

    it("animates long content over time", () => {
      const longText = "This is a long message that should type out.";
      const msg = createMessage("assistant", longText);
      
      render(<MessageList messages={[msg]} />);

      // Initially empty or partial
      expect(screen.queryByText(longText)).not.toBeInTheDocument();

      // Advance time partially
      act(() => {
        vi.advanceTimersByTime(50); // 5ms per 2 chars approx
      });
      
      // Advance to completion
      act(() => {
        vi.runAllTimers();
      });

      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it("skips animation if complete state is forced (re-render scenario)", () => {
      // This tests the logic: if (complete) setDisplayedContent(cleanContent)
      // Hard to strictly test internal state without hook access, 
      // but we can verify final state consistency.
      const msg = createMessage("assistant", "Finished message");
      const { rerender } = render(<MessageList messages={[msg]} />);

      act(() => {
        vi.runAllTimers();
      });
      
      expect(screen.getByText("Finished message")).toBeInTheDocument();

      // Re-render
      rerender(<MessageList messages={[msg]} />);
      expect(screen.getByText("Finished message")).toBeInTheDocument();
    });
  });
});