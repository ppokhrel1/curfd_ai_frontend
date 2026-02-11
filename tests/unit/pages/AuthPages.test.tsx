import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignInPage from '../../../src/pages/SignInPage';
import SignUpPage from '../../../src/pages/SignUpPage';


// Mock Auth Store
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();

vi.mock('../../../src/lib/auth', () => ({
    useAuthStore: () => ({
        signIn: mockSignIn,
        signUp: mockSignUp,
        error: null,
    })
}));

describe('Auth Pages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('SignInPage', () => {
        it('renders sign in form', () => {
            render(<BrowserRouter><SignInPage /></BrowserRouter>);
            expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
        });

        it('validates input and calls sign in', async () => {
            render(<BrowserRouter><SignInPage /></BrowserRouter>);
            
            fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'test@test.com' } });
            fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password123' } });
            
            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledWith('test@test.com', 'password123');
            });
        });
    });

    describe('SignUpPage', () => {
        it('renders sign up form', () => {
            render(<BrowserRouter><SignUpPage /></BrowserRouter>);
            expect(screen.getByRole('heading', { name: /Create Your Account/i })).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/John Doe/i)).toBeInTheDocument();
        });

        it('validates password match', async () => {
            render(<BrowserRouter><SignUpPage /></BrowserRouter>);
            
            fireEvent.change(screen.getByPlaceholderText(/John Doe/i), { target: { value: 'John' } });
            fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'test@test.com' } });
            
            // Mismatched passwords
            const passwords = screen.getAllByPlaceholderText(/••••••••/i);
            fireEvent.change(passwords[0], { target: { value: '123456' } });
            fireEvent.change(passwords[1], { target: { value: '654321' } });
            
            fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

            expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
            expect(mockSignUp).not.toHaveBeenCalled();
        });
    });
});
