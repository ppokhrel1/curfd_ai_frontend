import { ImageSearchPicker } from "@/modules/ai/components/ImageSearchPicker";
import type { ImageSearchPayload } from "@/modules/ai/types/chat.type";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

describe("ImageSearchPicker Component", () => {
  const mockPayload: ImageSearchPayload = {
    image_urls: [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg",
    ],
    search_query: "ring product photo",
    request_id: "test-123",
    prompt: "gold ring",
  };

  it("renders image grid with correct number of images", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ImageSearchPicker payload={mockPayload} onSelect={onSelect} />
    );

    // Check that 3 image buttons are rendered (plus 1 confirm button)
    const imageButtons = Array.from(
      container.querySelectorAll("button")
    ).filter((btn) => btn.querySelector("img"));
    expect(imageButtons.length).toBe(3);
  });

  it("renders confirm button in disabled state initially", () => {
    const onSelect = vi.fn();
    render(<ImageSearchPicker payload={mockPayload} onSelect={onSelect} />);

    const confirmBtn = screen.getByRole("button", { name: /Generate 3D/i });
    expect(confirmBtn).toBeDisabled();
  });

  it("enables confirm button when an image is selected", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ImageSearchPicker payload={mockPayload} onSelect={onSelect} />
    );

    // Click first image button
    const imageButtons = Array.from(
      container.querySelectorAll("button")
    ).filter((btn) => btn.querySelector("img"));
    fireEvent.click(imageButtons[0]);

    // Confirm button should now be enabled
    const confirmBtn = screen.getByRole("button", { name: /Generate 3D/i });
    expect(confirmBtn).not.toBeDisabled();
  });

  it("calls onSelect with correct image URL when confirmed", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ImageSearchPicker payload={mockPayload} onSelect={onSelect} />
    );

    // Click second image
    const imageButtons = Array.from(
      container.querySelectorAll("button")
    ).filter((btn) => btn.querySelector("img"));
    fireEvent.click(imageButtons[1]);

    // Click confirm
    const confirmBtn = screen.getByRole("button", { name: /Generate 3D/i });
    fireEvent.click(confirmBtn);

    expect(onSelect).toHaveBeenCalledWith(mockPayload.image_urls[1]);
  });

  it("shows selection indicator on selected image", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ImageSearchPicker payload={mockPayload} onSelect={onSelect} />
    );

    const imageButtons = Array.from(
      container.querySelectorAll("button")
    ).filter((btn) => btn.querySelector("img"));

    // Click first image
    fireEvent.click(imageButtons[0]);

    // Check that first button has violet ring styling
    const firstButton = imageButtons[0];
    expect(firstButton.className).toContain("border-primary-500");
  });

  it("disables buttons while generating", () => {
    const onSelect = vi.fn();
    const { container, rerender } = render(
      <ImageSearchPicker payload={mockPayload} onSelect={onSelect} />
    );

    // Select an image and click confirm
    const imageButtons = Array.from(
      container.querySelectorAll("button")
    ).filter((btn) => btn.querySelector("img"));
    fireEvent.click(imageButtons[0]);

    const confirmBtn = screen.getByRole("button", { name: /Generate 3D/i });
    fireEvent.click(confirmBtn);

    // After clicking confirm, button text should change
    expect(confirmBtn.textContent).toContain("Generating");
  });

  it("handles image load errors gracefully", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ImageSearchPicker payload={mockPayload} onSelect={onSelect} />
    );

    const images = container.querySelectorAll("img");
    expect(images.length).toBe(3);

    // Simulate image load error
    const firstImage = images[0] as HTMLImageElement;
    fireEvent.error(firstImage);

    // Image should fall back to placeholder SVG
    expect(firstImage.src).toContain("data:image/svg+xml");
  });

  it("allows changing selection", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ImageSearchPicker payload={mockPayload} onSelect={onSelect} />
    );

    const imageButtons = Array.from(
      container.querySelectorAll("button")
    ).filter((btn) => btn.querySelector("img"));

    // Select first image
    fireEvent.click(imageButtons[0]);
    let firstButton = imageButtons[0];
    expect(firstButton.className).toContain("border-primary-500");

    // Change to second image
    fireEvent.click(imageButtons[1]);
    firstButton = imageButtons[0];
    const secondButton = imageButtons[1];

    // Second should be selected, first should not
    expect(firstButton.className).not.toContain("border-primary-500");
    expect(secondButton.className).toContain("border-primary-500");
  });
});
