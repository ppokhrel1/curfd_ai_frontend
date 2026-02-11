import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '../../../src/pages/HomePage';

// --- Mocks ---

// Stores
vi.mock('../../../src/lib/auth', () => ({
    useAuthStore: () => ({ user: { name: 'Test User' }, signOut: vi.fn() })
}));
vi.mock('../../../src/modules/ai/stores/chatStore', () => {
    const useChatStore = () => ({
        activeConversationId: 'chat-1',
        conversations: [],
        jobHistory: {},
        updateConversation: vi.fn()
    });
    useChatStore.getState = () => ({ addJobToHistory: vi.fn() });
    return { useChatStore };
});
vi.mock('../../../src/modules/editor/stores/editorStore', () => {
    const useEditorStore = () => ({ setOriginalCode: vi.fn(), setCode: vi.fn(), code: '' });
    useEditorStore.getState = () => ({ clear: vi.fn() });
    return { useEditorStore };
});

// Hooks
vi.mock('../../../src/hooks/useKeyboardShortcuts', () => ({
    useKeyboardShortcuts: vi.fn(),
    getDefaultShortcuts: vi.fn(() => ({}))
}));
vi.mock('../../../src/modules/ai/hooks/useChatSocket', () => ({
    useChatSocket: () => ({ isConnected: true })
}));

// Services
vi.mock('../../../src/modules/ai/services/chatService', () => ({
    chatService: { getCurrentSessionId: vi.fn(), startRunpodRequest: vi.fn() }
}));
vi.mock('../../../src/modules/ai/services/jobService', () => ({
    jobService: { createJob: vi.fn() }
}));

// Components that might have side effects or be heavy
vi.mock('../../../src/modules/ai/components/ChatInterface', () => ({
    ChatInterface: () => <div data-testid="chat-interface">Chat</div>
}));
vi.mock('../../../src/modules/viewer/components/Viewer3D', () => ({
    Viewer3D: () => <div data-testid="viewer-3d">Viewer</div>
}));
vi.mock('../../../src/modules/editor/components/CADEditor', () => ({
    CADEditor: () => <div data-testid="cad-editor">Editor</div>
}));
vi.mock('../../../src/components/common/ResizablePanels', () => ({
    ResizablePanels: ({ left, right }: any) => <div>{left}{right}</div>
}));
vi.mock('../../../src/modules/viewer/components/ModelImportOverlay', () => ({
    ModelImportOverlay: () => null
}));

describe('HomePage', () => {
    it('renders without crashing', () => {
        // Smoke test
        render(<HomePage />);
        expect(screen.getByText('CURFD AI')).toBeInTheDocument();
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    });
});
