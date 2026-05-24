import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { api } from '@services/api';

// Mock the API service
jest.mock('@services/api', () => ({
  api: {
    getMe: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resendVerification: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides initial auth state (not authenticated, loading)', async () => {
    mockedApi.getMe.mockResolvedValue({ user: null });

    const TestComponent = () => {
      const { user, isAuthenticated, isLoading } = useAuth();
      return (
        <>
          <div>Loading: {String(isLoading)}</div>
          <div>Authenticated: {String(isAuthenticated)}</div>
          <div>User: {user?.email || 'null'}</div>
        </>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially loading
    expect(screen.getByText('Loading: true')).toBeInTheDocument();

    // After hydration
    await waitFor(() => {
      expect(screen.getByText('Loading: false')).toBeInTheDocument();
    });
    expect(screen.getByText('Authenticated: false')).toBeInTheDocument();
  });

  it('hydrates auth from httpOnly cookie on mount', async () => {
    const mockUser = { id: '1', email: 'user@example.com', role: 'user' };
    mockedApi.getMe.mockResolvedValue({ user: mockUser });

    const TestComponent = () => {
      const { user, isAuthenticated, isLoading } = useAuth();
      return (
        <>
          <div>Loading: {String(isLoading)}</div>
          <div>User: {user?.email}</div>
          <div>Authenticated: {String(isAuthenticated)}</div>
        </>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Loading: false')).toBeInTheDocument();
    });
    expect(screen.getByText('User: user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Authenticated: true')).toBeInTheDocument();
    expect(mockedApi.getMe).toHaveBeenCalledTimes(1);
  });

  it('handles hydration error gracefully', async () => {
    mockedApi.getMe.mockRejectedValue(new Error('Network error'));

    const TestComponent = () => {
      const { user, isLoading, isAuthenticated } = useAuth();
      return (
        <>
          <div>Loading: {String(isLoading)}</div>
          <div>Authenticated: {String(isAuthenticated)}</div>
          <div>User: {user ? 'logged in' : 'not logged in'}</div>
        </>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Loading: false')).toBeInTheDocument();
    });
    expect(screen.getByText('Authenticated: false')).toBeInTheDocument();
    expect(screen.getByText('User: not logged in')).toBeInTheDocument();
  });

  it('cleans up hydration on unmount', async () => {
    mockedApi.getMe.mockImplementation(
      () => new Promise(() => {
        // Never resolves
      })
    );

    const TestComponent = () => {
      const { isLoading } = useAuth();
      return <div>Loading: {String(isLoading)}</div>;
    };

    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Unmount should clean up and not cause setState warnings
    expect(() => unmount()).not.toThrow();
  });

  it('logs in user with email and password', async () => {
    const mockUser = { id: '1', email: 'user@example.com', role: 'user' };
    mockedApi.getMe.mockResolvedValue({ user: null });
    mockedApi.login.mockResolvedValue({ user: mockUser });

    const TestComponent = () => {
      const { user, login } = useAuth();
      return (
        <>
          <button onClick={() => login('user@example.com', 'password')}>Login</button>
          <div>User: {user?.email || 'null'}</div>
        </>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('User: null')).toBeInTheDocument();
    });

    const loginBtn = screen.getByRole('button', { name: /login/i });
    loginBtn.click();

    await waitFor(() => {
      expect(screen.getByText('User: user@example.com')).toBeInTheDocument();
    });
    expect(mockedApi.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password',
    });
  });

  it('does not cache auth in localStorage', async () => {
    const mockUser = { id: '1', email: 'user@example.com', role: 'user' };
    mockedApi.getMe.mockResolvedValue({ user: mockUser });

    render(
      <AuthProvider>
        <div>Test</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    // Verify localStorage does NOT contain user data
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('auth')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('registers new user', async () => {
    const mockUser = { id: '2', email: 'newuser@example.com', role: 'user' };
    mockedApi.getMe.mockResolvedValue({ user: null });
    mockedApi.register.mockResolvedValue({
      user: mockUser,
      message: 'Registration successful',
    });

    const TestComponent = () => {
      const { user, register } = useAuth();
      return (
        <>
          <button
            onClick={() =>
              register('newuser@example.com', 'password', 'New User')
            }
          >
            Register
          </button>
          <div>User: {user?.email || 'null'}</div>
        </>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('User: null')).toBeInTheDocument();
    });

    const registerBtn = screen.getByRole('button', { name: /register/i });
    registerBtn.click();

    await waitFor(() => {
      expect(screen.getByText('User: newuser@example.com')).toBeInTheDocument();
    });
    expect(mockedApi.register).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'password',
      name: 'New User',
    });
  });

  it('logs out user', async () => {
    const mockUser = { id: '1', email: 'user@example.com', role: 'user' };
    mockedApi.getMe.mockResolvedValue({ user: mockUser });
    mockedApi.logout.mockResolvedValue(undefined);

    const TestComponent = () => {
      const { user, logout, isAuthenticated } = useAuth();
      return (
        <>
          <button onClick={logout}>Logout</button>
          <div>Authenticated: {String(isAuthenticated)}</div>
          <div>User: {user?.email || 'null'}</div>
        </>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('User: user@example.com')).toBeInTheDocument();
    });

    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    logoutBtn.click();

    await waitFor(() => {
      expect(screen.getByText('User: null')).toBeInTheDocument();
    });
    expect(screen.getByText('Authenticated: false')).toBeInTheDocument();
    expect(mockedApi.logout).toHaveBeenCalledTimes(1);
  });

  it('handles forgot password', async () => {
    mockedApi.getMe.mockResolvedValue({ user: null });
    mockedApi.forgotPassword.mockResolvedValue(undefined);

    const TestComponent = () => {
      const { forgotPassword } = useAuth();
      return (
        <button onClick={() => forgotPassword('user@example.com')}>
          Reset Password
        </button>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const btn = screen.getByRole('button', { name: /reset password/i });
    btn.click();

    await waitFor(() => {
      expect(mockedApi.forgotPassword).toHaveBeenCalledWith('user@example.com');
    });
  });

  it('resends verification email', async () => {
    mockedApi.getMe.mockResolvedValue({ user: null });
    mockedApi.resendVerification.mockResolvedValue(undefined);

    const TestComponent = () => {
      const { resendVerification } = useAuth();
      return (
        <button onClick={() => resendVerification()}>Resend Verification</button>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const btn = screen.getByRole('button', { name: /resend verification/i });
    btn.click();

    await waitFor(() => {
      expect(mockedApi.resendVerification).toHaveBeenCalledTimes(1);
    });
  });

  it('allows manual user override with setUser', async () => {
    mockedApi.getMe.mockResolvedValue({ user: null });

    const TestComponent = () => {
      const { user, setUser } = useAuth();
      return (
        <>
          <button
            onClick={() =>
              setUser({ id: '99', email: 'override@example.com', role: 'admin' })
            }
          >
            Set User
          </button>
          <div>User: {user?.email || 'null'}</div>
          <div>Role: {user?.role || 'none'}</div>
        </>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('User: null')).toBeInTheDocument();
    });

    const setBtn = screen.getByRole('button', { name: /set user/i });
    setBtn.click();

    await waitFor(() => {
      expect(screen.getByText('User: override@example.com')).toBeInTheDocument();
    });
    expect(screen.getByText('Role: admin')).toBeInTheDocument();
  });

  it('throws error when useAuth used outside provider', () => {
    // Suppress console.error for this test
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      useAuth();
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within AuthProvider');

    (console.error as jest.Mock).mockRestore();
  });

  it('maintains isAuthenticated boolean derived from user', async () => {
    const mockUser = { id: '1', email: 'user@example.com' };
    mockedApi.getMe.mockResolvedValue({ user: mockUser });

    const TestComponent = () => {
      const { user, isAuthenticated } = useAuth();
      return (
        <div>
          {user && isAuthenticated ? 'Authenticated' : 'Not authenticated'}
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Authenticated')).toBeInTheDocument();
    });
  });
});
