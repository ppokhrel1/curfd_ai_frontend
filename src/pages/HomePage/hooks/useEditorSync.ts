import { useEffect } from "react";
import { EDITOR_DEBOUNCE_MS } from "../constants";
import { useEditorStore } from "@/modules/editor/stores/editorStore";
import type { GeneratedShape } from "@/modules/ai/types/shape.type";

export const useEditorSync = (
  activeConversationId: string | null,
  currentShape: GeneratedShape | null,
  onShapeUpdate: (updatedShape: GeneratedShape) => void
) => {
  const editorCode = useEditorStore(state => state.code);

  useEffect(() => {
    // Only update if the code actually differs and we have an active shape
    if (!activeConversationId || !currentShape || !currentShape.id || editorCode === currentShape.scadCode) {
      return;
    }
    
    const timer = setTimeout(() => {
      onShapeUpdate({ ...currentShape, scadCode: editorCode });
    }, EDITOR_DEBOUNCE_MS);
    
    return () => clearTimeout(timer);
  }, [editorCode, activeConversationId, currentShape?.id, currentShape?.scadCode, onShapeUpdate]);
};