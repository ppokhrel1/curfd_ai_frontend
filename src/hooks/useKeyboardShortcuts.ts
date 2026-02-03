import { useCallback, useEffect } from 'react';

interface ShortcutConfig {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    action: () => void;
    description: string;
}

interface UseKeyboardShortcutsOptions {
    shortcuts: ShortcutConfig[];
    enabled?: boolean;
}

export const useKeyboardShortcuts = ({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) => {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        // Don't trigger shortcuts when typing in inputs
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        for (const shortcut of shortcuts) {
            const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true;
            const altMatch = shortcut.alt ? event.altKey : !event.altKey;
            const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

            if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
                event.preventDefault();
                shortcut.action();
                return;
            }
        }
    }, [shortcuts, enabled]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return { shortcuts };
};

// Predefined shortcuts for the app
export const getDefaultShortcuts = (handlers: {
    goToChat?: () => void;
    goToViewer?: () => void;
    goToEditor?: () => void;
    goToSimulation?: () => void;
    toggleFullscreen?: () => void;
}): ShortcutConfig[] => {
    const shortcuts: ShortcutConfig[] = [];

    if (handlers.goToChat) {
        shortcuts.push({
            key: '1',
            ctrl: true,
            action: handlers.goToChat,
            description: 'Switch to Chat view',
        });
    }

    if (handlers.goToEditor) {
        shortcuts.push({
            key: '3',
            ctrl: true,
            action: handlers.goToEditor,
            description: 'Focus CAD Editor',
        });
    }

    if (handlers.goToSimulation) {
        shortcuts.push({
            key: '4',
            ctrl: true,
            action: handlers.goToSimulation,
            description: 'Switch to Simulation',
        });
    }

    if (handlers.toggleFullscreen) {
        shortcuts.push({
            key: 'f',
            ctrl: true,
            shift: true,
            action: handlers.toggleFullscreen,
            description: 'Toggle Fullscreen',
        });
    }

    return shortcuts;
};
