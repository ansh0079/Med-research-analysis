import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { GuestRoute } from './GuestRoute';
import { AuthProvider } from '@contexts/AuthContext';
import * as AuthContext from '@contexts/AuthContext';

const AuthPageContent = () => <div>Auth page</div>;
const HomePage = () => <div>Home page</div>;

describe('GuestRoute', () => {
  const renderWithRouter = (element: React.ReactNode, initialRoute = '/auth') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={element} />
            <Route path="/" element={<HomePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders content when user is not authenticated', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
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
      <GuestRoute>
        <AuthPageContent />
      </GuestRoute>
    );

    expect(screen.getByText('Auth page')).toBeInTheDocument();
  });

  it('redirects to home when user is authenticated', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
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
      <GuestRoute>
        <AuthPageContent />
      </GuestRoute>
    );

    expect(screen.getByText('Home page')).toBeInTheDocument();
    expect(screen.queryByText('Auth page')).not.toBeInTheDocument();
  });

  it('shows loading spinner while auth is loading', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
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
      <GuestRoute>
        <AuthPageContent />
      </GuestRoute>
    );

    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  it('allows multiple guest routes in the same app', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
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

    const { rerender } = render(
      <MemoryRouter initialEntries={['/auth']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<GuestRoute><AuthPageContent /></GuestRoute>} />
            <Route path="/" element={<HomePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Auth page')).toBeInTheDocument();
  });
});
