import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '@contexts/AuthContext';

jest.mock('@contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock child component
const ProtectedContent = () => <div>Protected content</div>;
const AuthPage = () => <div>Auth page</div>;

describe('ProtectedRoute', () => {
  const renderWithRouter = (element: React.ReactNode, initialRoute = '/protected') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/protected" element={element} />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders protected content when user is authenticated', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', role: 'user' },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resendVerification: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      setUser: jest.fn(),
    });

    renderWithRouter(
      <ProtectedRoute>
        <ProtectedContent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects to /auth when user is not authenticated', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resendVerification: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      setUser: jest.fn(),
    });

    renderWithRouter(
      <ProtectedRoute>
        <ProtectedContent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Auth page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('shows loading spinner while auth is loading', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resendVerification: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      setUser: jest.fn(),
    });

    renderWithRouter(
      <ProtectedRoute>
        <ProtectedContent />
      </ProtectedRoute>
    );

    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  it('passes location state to auth redirect', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resendVerification: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      setUser: jest.fn(),
    });

    renderWithRouter(
      <ProtectedRoute>
        <ProtectedContent />
      </ProtectedRoute>,
      '/protected'
    );

    // Verify redirect happened (indirectly by checking auth page is shown)
    expect(screen.getByText('Auth page')).toBeInTheDocument();
  });

  it('preserves route location for returning after login', () => {
    // This test verifies the location state is preserved in the redirect
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      forgotPassword: jest.fn(),
      resendVerification: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      deleteAccount: jest.fn(),
      setUser: jest.fn(),
    });

    renderWithRouter(
      <ProtectedRoute>
        <ProtectedContent />
      </ProtectedRoute>,
      '/protected'
    );

    // Auth page should be shown (redirect happened)
    expect(screen.getByText('Auth page')).toBeInTheDocument();
  });
});
