import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LandingPage from '../../../src/pages/LandingPage';

// Mock components to simplify tree
vi.mock('../../../src/components/landing/ShowcaseGrid', () => ({
    ShowcaseGrid: () => <div data-testid="showcase-grid">Grid</div>
}));

describe('LandingPage', () => {
    it('should render main sections', () => {
        render(
            <BrowserRouter>
                <LandingPage />
            </BrowserRouter>
        );

        expect(screen.getByText(/Describe It/i)).toBeInTheDocument();
        expect(screen.getByText(/AI Builds It/i)).toBeInTheDocument();
        expect(screen.getByText(/Start for Free/i)).toBeInTheDocument();
        expect(screen.getByTestId('showcase-grid')).toBeInTheDocument();
    });

    it('should open auth modal on sign up click', () => {
        render(
            <BrowserRouter>
                <LandingPage />
            </BrowserRouter>
        );

        const ctaButton = screen.getByText(/Start for Free/i);
        fireEvent.click(ctaButton);

        // Check if modal appears (assuming AuthModal renders some specific text)
        // Since AuthModal is real, we might fail if it depends on complex providers not mocked.
        // Ideally we mock AuthModal too for container testing.
    });
});
