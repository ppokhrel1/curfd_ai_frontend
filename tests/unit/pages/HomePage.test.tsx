import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import toast from 'react-hot-toast';

// 1. Import Component
import HomePage from '@/pages/HomePage'; 

// 2. Import ALL stores and hooks at the top level to avoid require() alias failures
import { useAuthStore } from '@/lib/auth';
import { useChatStore } from '@/modules/ai/stores/chatStore';
import { useEditorStore } from '@/modules/editor/stores/editorStore';
import { useChatSocket } from '@/modules/ai/hooks/useChatSocket';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

import { 
  useModelCache, 
  useModelImport, 
  useModelFetch, 
  useActiveConversationSync, 
  useEditorSync, 
  usePendingMessage, 
  usePartSwap, 
  useViewState 
} from '@/pages/HomePage/hooks';

// --- MOCKS ---

// Third-party mocks
vi.mock('react-hot-toast', () => ({
  default: vi.fn(),
}));

// Global Store Mocks
vi.mock('@/lib/auth', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/modules/ai/stores/chatStore', () => ({
  useChatStore: vi.fn(),
}));

vi.mock('@/modules/editor/stores/editorStore', () => ({
  useEditorStore: {
    getState: vi.fn(),
  },
}));

vi.mock('@/modules/ai/hooks/useChatSocket', () => ({
  useChatSocket: vi.fn(),
}));

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
  getDefaultShortcuts: vi.fn(),
}));

// Capture the callback function explicitly for testing
let capturedOnShapeLoaded: any;

vi.mock('@/pages/HomePage/hooks', () => ({
  useModelCache: vi.fn(),
  useModelImport: vi.fn(),
  useModelFetch: vi.fn(),
  useActiveConversationSync: vi.fn((args) => {
    // Capture the internal handleShapeGenerated function
    capturedOnShapeLoaded = args.onShapeLoaded;
  }),
  useEditorSync: vi.fn(),
  usePendingMessage: vi.fn(),
  usePartSwap: vi.fn(),
  useViewState: vi.fn(),
}));

// Mock Child UI Components
vi.mock('@/modules/viewer/components/ModelImportOverlay', () => ({
  ModelImportOverlay: () => <div data-testid="model-import-overlay" />,
}));

vi.mock('@/components/common/StatusBar', () => ({
  StatusBar: () => <div data-testid="status-bar" />,
}));

vi.mock('@/pages/HomePage/components', () => ({
  HomePageHeader: () => <div data-testid="home-page-header" />,
  DesktopLayout: (props: any) => (
    <div data-testid="desktop-layout">
      <button data-testid="btn-sim" onClick={props.onOpenSimulation}>Sim</button>
      <button data-testid="btn-panel-switch" onClick={() => props.onMobilePanelSwitch('viewer')}>Switch Panel</button>
    </div>
  ),
  MobileLayout: (props: any) => (
    <div data-testid="mobile-layout">
      <button data-testid="btn-mobile-sim" onClick={props.onOpenSimulation}>Sim</button>
      <button data-testid="btn-mobile-switch" onClick={() => props.onMobilePanelSwitch('viewer')}>Switch Panel</button>
    </div>
  ),
  MobileNav: () => <div data-testid="mobile-nav" />,
}));

describe('HomePage Component', () => {
  const mockSetCode = vi.fn();
  const mockSetOriginalCode = vi.fn();
  const mockClearEditor = vi.fn();
  
  const mockSetActiveView = vi.fn();
  const mockSetMobilePanel = vi.fn();
  const mockSetIsTransitioning = vi.fn();
  
  const mockFetchModelFiles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup Auth Store
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: '1', name: 'Test User' },
      signOut: vi.fn(),
    } as any);

    // Setup Chat Store
    vi.mocked(useChatStore).mockImplementation((selector: any) => {
      const state = {
        activeConversationId: 'chat-1',
        updateConversation: vi.fn(),
        conversations: [{ id: 'chat-1', messages: [] }],
      };
      return selector(state);
    });

    // Setup Global Hooks
    vi.mocked(useChatSocket).mockReturnValue({ isConnected: true } as any);

    // Setup Local Hooks
    vi.mocked(useViewState).mockReturnValue({
      activeView: 'chat-viewer',
      setActiveView: mockSetActiveView,
      mobilePanel: 'chat',
      setMobilePanel: mockSetMobilePanel,
      isTransitioning: false,
      setIsTransitioning: mockSetIsTransitioning,
    } as any);

    vi.mocked(useModelCache).mockReturnValue({
      getFromCache: vi.fn(),
      addToCache: vi.fn(),
    } as any);

    vi.mocked(useModelImport).mockReturnValue({
      fileInputRef: { current: null },
      handleFileImport: vi.fn(),
      isImporting: false,
      importStage: 'idle',
      importFileName: '',
      handleImportModel: vi.fn(),
    } as any);

    vi.mocked(useModelFetch).mockReturnValue({
      fetchModelFiles: mockFetchModelFiles,
      recoverModel: vi.fn(),
    } as any);

    // Setup Editor Store (Zustand getState mock)
    // TypeScript bypass needed to mock the un-mockable getState property
    (useEditorStore.getState as any) = vi.fn().mockReturnValue({
      isCompiling: false,
      setCode: mockSetCode,
      setOriginalCode: mockSetOriginalCode,
      clear: mockClearEditor,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders all main layout components', () => {
      render(<HomePage />);
      
      expect(screen.getByTestId('model-import-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('home-page-header')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
      expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    });
  });

  describe('Interactions & Callbacks', () => {
    it('shows a toast when handleOpenSimulation is called', () => {
      render(<HomePage />);
      
      const simButton = screen.getByTestId('btn-sim');
      fireEvent.click(simButton);
      
      expect(toast).toHaveBeenCalledWith('Simulation module is Coming Soon!', { icon: '🚀' });
    });

    it('handles mobile panel switching with a transition delay', () => {
      render(<HomePage />);
      
      const switchButton = screen.getByTestId('btn-mobile-switch');
      
      act(() => {
        fireEvent.click(switchButton);
      });

      expect(mockSetIsTransitioning).toHaveBeenCalledWith(true);
      expect(mockSetMobilePanel).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(350); 
      });

      expect(mockSetMobilePanel).toHaveBeenCalledWith('viewer');
      expect(mockSetIsTransitioning).toHaveBeenCalledWith(false);
    });
  });

  describe('handleShapeGenerated Logic', () => {
    it('clears editor and state if shape is null and not compiling', () => {
      render(<HomePage />);
      
      act(() => {
        capturedOnShapeLoaded(null);
      });

      expect(mockClearEditor).toHaveBeenCalled();
    });

    it('ignores null shape if editor is currently compiling', () => {
      (useEditorStore.getState as any) = vi.fn().mockReturnValue({
        isCompiling: true, 
        clear: mockClearEditor,
      });

      render(<HomePage />);
      
      act(() => {
        capturedOnShapeLoaded(null);
      });

      expect(mockClearEditor).not.toHaveBeenCalled();
    });

    it('extracts scadCode directly and updates editor store', () => {
      render(<HomePage />);
      
      const mockShape = {
        id: 'shape-1',
        scadCode: 'cube([10, 10, 10]);',
      };

      act(() => {
        capturedOnShapeLoaded(mockShape);
      });

      expect(mockSetOriginalCode).toHaveBeenCalledWith('cube([10, 10, 10]);');
      expect(mockSetCode).toHaveBeenCalledWith('cube([10, 10, 10]);');
      expect(mockSetActiveView).toHaveBeenCalledWith('editor');
    });

    it('extracts scadCode from stringified metadata_json', () => {
      render(<HomePage />);
      
      const mockShape = {
        id: 'shape-2',
        metadata_json: JSON.stringify({ scad_code: 'sphere(r=5);' }),
      };

      act(() => {
        capturedOnShapeLoaded(mockShape);
      });

      expect(mockSetOriginalCode).toHaveBeenCalledWith('sphere(r=5);');
      expect(mockSetCode).toHaveBeenCalledWith('sphere(r=5);');
    });

    it('fetches model files if sdfUrl is present', () => {
      render(<HomePage />);
      
      const mockShape = {
        id: 'shape-3',
        sdfUrl: 'https://example.com/model.sdf',
      };

      act(() => {
        capturedOnShapeLoaded(mockShape);
      });

      expect(mockFetchModelFiles).toHaveBeenCalledWith(expect.objectContaining({ id: 'shape-3' }));
    });
  });
});