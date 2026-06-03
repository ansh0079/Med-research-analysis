import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthPage } from './AuthPage';
import * as authContext from '@contexts/AuthContext';
import * as searchContext from '@contexts/SearchContext';

jest.mock('@contexts/AuthContext');
jest.mock('@contexts/SearchContext');

const mockedAuthContext = authContext as jest.Mocked<typeof authContext>;
const mockedSearchContext = searchContext as jest.Mocked<typeof searchContext>;

describe('AuthPage Integration', () => {
  const mockLogin = jest.fn();
  const mockRegister = jest.fn();
  const mockForgotPassword = jest.fn();
  const mockNavigatePage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogin.mockResolvedValue(undefined);
    mockRegister.mockResolvedValue({ message: undefined });
    mockForgotPassword.mockResolvedValue(undefined);

    mockedAuthContext.useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      register: mockRegister,
      logout: jest.fn(),
      forgotPassword: mockForgotPassword,
      resendVerification: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      setUser: jest.fn(),
    });

    mockedSearchContext.useNavigatePage.mockReturnValue(mockNavigatePage);
  });

  const renderAuthPage = () => {
    return render(
      <MemoryRouter
        initialEntries={['/']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthPage />
      </MemoryRouter>
    );
  };

  describe('Login mode (default)', () => {
    it('renders Sign In and Create Account tab buttons', () => {
      renderAuthPage();

      // Both "Sign In" tab and submit button exist — just verify the tab toggle area renders
      expect(screen.getAllByRole('button', { name: /^sign in$/i }).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /^create account$/i })).toBeInTheDocument();
    });

    it('renders email and password inputs', () => {
      renderAuthPage();

      expect(screen.getByPlaceholderText('you@institution.edu')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('renders Forgot password? link', () => {
      renderAuthPage();

      expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
    });

    it('shows email validation error after blur on invalid email', async () => {
      renderAuthPage();

      const emailInput = screen.getByPlaceholderText('you@institution.edu');
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
      fireEvent.blur(emailInput);

      expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    });

    it('calls login with correct credentials on submit', async () => {
      renderAuthPage();

      fireEvent.change(screen.getByPlaceholderText('you@institution.edu'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'mypassword' },
      });

      await act(async () => {
        // Submit via the form element directly
        fireEvent.submit(screen.getByPlaceholderText('you@institution.edu').closest('form')!);
      });

      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'mypassword');
    });

    it('shows error message when login fails', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      renderAuthPage();

      fireEvent.change(screen.getByPlaceholderText('you@institution.edu'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'wrongpass' },
      });

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('you@institution.edu').closest('form')!);
      });

      expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    });

    it('shows validation error for invalid email on submit', async () => {
      renderAuthPage();

      fireEvent.change(screen.getByPlaceholderText('you@institution.edu'), {
        target: { value: 'bademail' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'password' },
      });

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('you@institution.edu').closest('form')!);
      });

      expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('navigates via setCurrentPage when clicking Continue without signing in', () => {
      renderAuthPage();

      const continueBtn = screen.getByRole('button', { name: /continue without signing in/i });
      fireEvent.click(continueBtn);

      expect(mockNavigatePage).toHaveBeenCalledWith('search');
    });
  });

  describe('Register mode', () => {
    it('switches to register mode when Create Account tab clicked', () => {
      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      // In register mode, password placeholder changes
      expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeInTheDocument();
    });

    it('shows optional Name field in register mode', () => {
      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByPlaceholderText('Dr. Jane Smith')).toBeInTheDocument();
    });

    it('shows password strength indicator when password typed in register mode', () => {
      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
        target: { value: 'weakpassword123' },
      });

      // Strength label should appear (Weak / Fair / Good / Strong)
      expect(
        screen.queryByText(/weak|fair|good|strong/i)
      ).toBeInTheDocument();
    });

    it('shows error when register password is too short', async () => {
      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      fireEvent.change(screen.getByPlaceholderText('you@institution.edu'), {
        target: { value: 'new@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
        target: { value: 'short' },
      });

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('you@institution.edu').closest('form')!);
      });

      expect(
        await screen.findByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('calls register with email, password, and name', async () => {
      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      fireEvent.change(screen.getByPlaceholderText('Dr. Jane Smith'), {
        target: { value: 'Dr. Test' },
      });
      fireEvent.change(screen.getByPlaceholderText('you@institution.edu'), {
        target: { value: 'new@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
        target: { value: 'securepassword123' },
      });

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('you@institution.edu').closest('form')!);
      });

      expect(mockRegister).toHaveBeenCalledWith(
        'new@example.com',
        'securepassword123',
        'Dr. Test'
      );
    });

    it('shows success message when register returns a message', async () => {
      mockRegister.mockResolvedValue({ message: 'Please check your email to verify your account.' });

      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      fireEvent.change(screen.getByPlaceholderText('you@institution.edu'), {
        target: { value: 'new@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
        target: { value: 'securepassword123' },
      });

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('you@institution.edu').closest('form')!);
      });

      expect(
        await screen.findByText(/please check your email/i)
      ).toBeInTheDocument();
    });

    it('shows error message when register fails', async () => {
      mockRegister.mockRejectedValue(new Error('Email already in use'));

      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      fireEvent.change(screen.getByPlaceholderText('you@institution.edu'), {
        target: { value: 'existing@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
        target: { value: 'securepassword123' },
      });

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('you@institution.edu').closest('form')!);
      });

      expect(await screen.findByText('Email already in use')).toBeInTheDocument();
    });

    it('switches back to login mode when Sign In tab clicked', () => {
      renderAuthPage();

      // Switch to register
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));
      expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeInTheDocument();

      // Switch back to login
      fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });
  });

  describe('Forgot password mode', () => {
    it('switches to forgot mode when Forgot password? clicked', () => {
      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));

      expect(screen.getByText('Reset your password')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('••••••••')).not.toBeInTheDocument();
    });

    it('renders Send Reset Link button in forgot mode', () => {
      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));

      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('calls forgotPassword with email on submit', async () => {
      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));

      fireEvent.change(screen.getByPlaceholderText('you@institution.edu'), {
        target: { value: 'user@example.com' },
      });

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('you@institution.edu').closest('form')!);
      });

      expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
    });

    it('shows success message after sending reset link', async () => {
      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));

      fireEvent.change(screen.getByPlaceholderText('you@institution.edu'), {
        target: { value: 'user@example.com' },
      });

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('you@institution.edu').closest('form')!);
      });

      expect(
        await screen.findByText(/if an account exists for that email/i)
      ).toBeInTheDocument();
    });

    it('shows success message even when forgotPassword throws', async () => {
      // AuthPage catches errors and still shows success to prevent enumeration
      mockForgotPassword.mockRejectedValue(new Error('Server error'));

      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));

      fireEvent.change(screen.getByPlaceholderText('you@institution.edu'), {
        target: { value: 'user@example.com' },
      });

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('you@institution.edu').closest('form')!);
      });

      // Implementation always shows success to prevent user enumeration
      expect(
        await screen.findByText(/if an account exists for that email/i)
      ).toBeInTheDocument();
    });

    it('goes back to login mode when Back to sign in clicked', () => {
      renderAuthPage();

      fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
      expect(screen.getByText('Reset your password')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));

      expect(screen.queryByText('Reset your password')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('clears error state when switching modes', async () => {
      mockLogin.mockRejectedValue(new Error('Bad credentials'));

      renderAuthPage();

      // Trigger login error
      fireEvent.change(screen.getByPlaceholderText('you@institution.edu'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('••••••••'), {
        target: { value: 'wrongpass' },
      });

      await act(async () => {
        fireEvent.submit(screen.getByPlaceholderText('you@institution.edu').closest('form')!);
      });

      expect(await screen.findByText('Bad credentials')).toBeInTheDocument();

      // Switch to register mode — error should be cleared
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.queryByText('Bad credentials')).not.toBeInTheDocument();
    });
  });
});
