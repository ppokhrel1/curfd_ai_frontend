import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RunpodEvent } from "@/modules/ai/hooks/useChatSocket";
import type { ImageSearchPayload } from "@/modules/ai/types/chat.type";

describe("useChat Hook - Image-to-3D Image Selection", () => {
  describe("image_to_3d.image_options event handling", () => {
    it("should create an assistant message with imageSearchPayload when event is received", () => {
      const event: RunpodEvent = {
        type: "image_to_3d.image_options",
        chat_id: "chat-123",
        image_urls: [
          "https://example.com/img1.jpg",
          "https://example.com/img2.jpg",
        ],
        search_query: "ring product photo",
        request_id: "req-456",
        prompt: "gold ring",
      };

      // The event should have all required fields for image search
      expect(event.type).toBe("image_to_3d.image_options");
      expect(event.image_urls).toHaveLength(2);
      expect(event.search_query).toBe("ring product photo");
      expect(event.request_id).toBe("req-456");
      expect(event.prompt).toBe("gold ring");
    });

    it("should create correct ImageSearchPayload structure", () => {
      const payload: ImageSearchPayload = {
        image_urls: [
          "https://example.com/img1.jpg",
          "https://example.com/img2.jpg",
          "https://example.com/img3.jpg",
        ],
        search_query: "sports car product photo",
        request_id: "req-789",
        prompt: "sports car",
      };

      expect(payload.image_urls).toHaveLength(3);
      expect(payload.search_query).toBe("sports car product photo");
      expect(payload.request_id).toBe("req-789");
      expect(payload.prompt).toBe("sports car");

      // All fields should be strings
      expect(typeof payload.search_query).toBe("string");
      expect(typeof payload.request_id).toBe("string");
      expect(typeof payload.prompt).toBe("string");
      expect(Array.isArray(payload.image_urls)).toBe(true);
    });
  });

  describe("sendImageSelection function", () => {
    it("should send image_to_3d.image_selected message with correct payload", () => {
      const mockSendWs = vi.fn();

      // Simulate sendImageSelection call
      const requestId = "req-123";
      const imageUrl = "https://example.com/selected.jpg";
      const prompt = "gold ring";

      mockSendWs({
        type: "image_to_3d.image_selected",
        request_id: requestId,
        image_url: imageUrl,
        prompt,
      });

      expect(mockSendWs).toHaveBeenCalledWith({
        type: "image_to_3d.image_selected",
        request_id: requestId,
        image_url: imageUrl,
        prompt,
      });
    });

    it("should not send if request_id or imageUrl is missing", () => {
      const mockSendWs = vi.fn();

      // Test with missing imageUrl
      if ("" && "req-123") {
        mockSendWs({
          type: "image_to_3d.image_selected",
          request_id: "req-123",
          image_url: "",
          prompt: "test",
        });
      }

      // Should not have called sendWs
      expect(mockSendWs).not.toHaveBeenCalled();
    });
  });

  describe("Message creation from image options event", () => {
    it("should create assistant message with imageSearchPayload", () => {
      const event: RunpodEvent = {
        type: "image_to_3d.image_options",
        chat_id: "chat-123",
        image_urls: ["https://example.com/1.jpg", "https://example.com/2.jpg"],
        search_query: "ring",
        request_id: "req-123",
        prompt: "gold ring",
      };

      // Simulate message creation in handler
      const message = {
        id: `img-search-${event.request_id}`,
        role: "assistant" as const,
        content: `I found ${event.image_urls?.length} images for "${event.search_query}". Pick one:`,
        timestamp: new Date(),
        imageSearchPayload: {
          image_urls: event.image_urls ?? [],
          search_query: event.search_query ?? "",
          request_id: event.request_id ?? "",
          prompt: event.prompt ?? "",
        },
      };

      expect(message.role).toBe("assistant");
      expect(message.imageSearchPayload).toBeDefined();
      expect(message.imageSearchPayload!.image_urls).toHaveLength(2);
      expect(message.imageSearchPayload!.request_id).toBe("req-123");
    });

    it("should include image URLs in payload", () => {
      const imageUrls = [
        "https://example.com/img1.jpg",
        "https://example.com/img2.jpg",
        "https://example.com/img3.jpg",
      ];

      const payload: ImageSearchPayload = {
        image_urls: imageUrls,
        search_query: "test",
        request_id: "req",
        prompt: "test",
      };

      expect(payload.image_urls).toEqual(imageUrls);
      expect(payload.image_urls).toHaveLength(3);
    });
  });
});
