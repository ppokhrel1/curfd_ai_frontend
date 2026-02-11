import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ResizablePanels } from "../../../../src/components/common/ResizablePanels";

describe("ResizablePanels", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("should render both panels", () => {
    render(
      <ResizablePanels
        leftPanel={<div>Left Content</div>}
        rightPanel={<div>Right Content</div>}
      />
    );

    expect(screen.getByText("Left Content")).toBeInTheDocument();
    expect(screen.getByText("Right Content")).toBeInTheDocument();
  });

  it("should render a resizer handle", () => {
    render(
      <ResizablePanels
        leftPanel={<div>Left</div>}
        rightPanel={<div>Right</div>}
      />
    );

    const resizer = screen.getByRole("separator", { hidden: true });
    expect(resizer).toBeInTheDocument();
  });

  it("should allow initial width to be set", () => {
    const { container } = render(
      <ResizablePanels
        leftPanel={<div>Left</div>}
        rightPanel={<div>Right</div>}
        defaultLeftWidth={30}
      />
    );

    const leftPanel = container.firstChild?.firstChild as HTMLElement;
    expect(leftPanel.style.width).toBe("30%");
  });

  it("should hide left panel when collapsed", () => {
    render(
      <ResizablePanels
        leftPanel={<div>Left</div>}
        rightPanel={<div>Right</div>}
        leftVisible={false}
      />
    );

    expect(screen.queryByText("Left")).not.toBeInTheDocument();
    expect(screen.getByText("Right")).toBeInTheDocument();
  });
});
