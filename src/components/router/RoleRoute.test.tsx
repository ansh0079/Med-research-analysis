import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RoleRoute } from './RoleRoute';
import { AuthProvider } from '@contexts/AuthContext';
import * as AuthContext from '@contexts/AuthContext';

const AdminContent = () => <div>Admin panel</div>;
const HomePage = () => <div>Home page</div>;
const FallbackContent = () => <div>Access denied</div>;

describe('RoleRoute', () => {
  const renderWithRouter = (element: React.ReactNode, initialRoute = '/admin') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={element} />
            <Route path="/" element={<HomePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders content for user with matching role', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: '1', email: 'admin@example.com', role: 'admin' },
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
      <RoleRoute allowedRoles={['admin']}>
        <AdminContent />
      </RoleRoute>
    );

    expect(screen.getByText('Admin panel')).toBeInTheDocument();
  });

  it('allows any role in the allowedRoles list', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: '1', email: 'curator@example.com', role: 'curator' },
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
      <RoleRoute allowedRoles={['admin', 'curator']}>
        <AdminContent />
      </RoleRoute>
    );

    expect(screen.getByText('Admin panel')).toBeInTheDocument();
  });

  it('redirects to home when user does not have required role', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: '1', email: 'user@example.com', role: 'user' },
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
      <RoleRoute allowedRoles={['admin']}>
        <AdminContent />
      </RoleRoute>
    );

    expect(screen.getByText('Home page')).toBeInTheDocument();
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
  });

  it('redirects to auth when user is not authenticated', () => {
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

    const { container } = renderWithRouter(
      <RoleRoute allowedRoles={['admin']}>
        <AdminContent />
      </RoleRoute>
    );

    // Should redirect away from admin content
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
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
      <RoleRoute allowedRoles={['admin']}>
        <AdminContent />
      </RoleRoute>
    );

    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  it('renders custom fallback when user lacks role', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: '1', email: 'user@example.com', role: 'user' },
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
      <RoleRoute allowedRoles={['admin']} fallback={<FallbackContent />}>
        <AdminContent />
      </RoleRoute>
    );

    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
  });

  it('handles missing user role gracefully', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: '1', email: 'user@example.com' }, // role is undefined
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
      <RoleRoute allowedRoles={['admin']}>
        <AdminContent />
      </RoleRoute>
    );

    // Should not render admin content since role is undefined
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
  });
});
