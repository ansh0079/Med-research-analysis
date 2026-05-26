import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RouteErrorBoundary } from './RouteErrorBoundary';

const ThrowingComponent = () => {
  throw new Error('Route component error');
};

const SafeComponent = () => <div>Safe route content</div>;
const HomePage = () => <div>Home page</div>;

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderWithRouter = (element: React.ReactNode, initialRoute = '/test') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/test" element={element} />
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders children when there is no error', () => {
    renderWithRouter(
      <RouteErrorBoundary>
        <SafeComponent />
      </RouteErrorBoundary>
    );

    expect(screen.getByText('Safe route content')).toBeInTheDocument();
  });

  it('displays error when route component throws', () => {
    renderWithRouter(
      <RouteErrorBoundary>
        <ThrowingComponent />
      </RouteErrorBoundary>
    );

    expect(screen.getByText(/this page failed to load/i)).toBeInTheDocument();
    expect(screen.getByText(/route component error/i)).toBeInTheDocument();
  });

  it('displays the route pathname in error message', () => {
    renderWithRouter(
      <RouteErrorBoundary>
        <ThrowingComponent />
      </RouteErrorBoundary>,
      '/test'
    );

    expect(screen.getByText(/\/test/)).toBeInTheDocument();
  });

  it('renders "Try again" button', () => {
    renderWithRouter(
      <RouteErrorBoundary>
        <ThrowingComponent />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders "Go home" button', () => {
    renderWithRouter(
      <RouteErrorBoundary>
        <ThrowingComponent />
      </RouteErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('recovers from error when "Try again" is clicked', () => {
    const { rerender } = renderWithRouter(
      <RouteErrorBoundary>
        <ThrowingComponent />
      </RouteErrorBoundary>
    );

    expect(screen.getByText(/this page failed to load/i)).toBeInTheDocument();

    // Rerender with safe component
    rerender(
      <MemoryRouter initialEntries={['/test']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/test" element={<RouteErrorBoundary><SafeComponent /></RouteErrorBoundary>} />
        </Routes>
      </MemoryRouter>
    );

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainBtn);

    expect(screen.getByText('Safe route content')).toBeInTheDocument();
  });

  it('navigates home when "Go home" is clicked', () => {
    // Mock window.location.href
    delete (window as any).location;
    window.location = { href: '' } as any;

    renderWithRouter(
      <RouteErrorBoundary>
        <ThrowingComponent />
      </RouteErrorBoundary>
    );

    // Verify error is initially shown
    expect(screen.getByText(/this page failed to load/i)).toBeInTheDocument();

    const goHomeBtn = screen.getByRole('button', { name: /go home/i });
    fireEvent.click(goHomeBtn);

    // Verify that window.location.href was set to home
    expect(window.location.href).toBe('http://localhost/');
  });

  it('has proper error UI styling', () => {
    renderWithRouter(
      <RouteErrorBoundary>
        <ThrowingComponent />
      </RouteErrorBoundary>
    );

    const container = screen.getByText(/this page failed to load/i).closest('div');
    expect(container).toHaveClass('bg-red-50');
    expect(container).toHaveClass('dark:bg-red-900/20');
    expect(container).toHaveClass('rounded-2xl');
  });

  it('displays exclamation triangle icon', () => {
    renderWithRouter(
      <RouteErrorBoundary>
        <ThrowingComponent />
      </RouteErrorBoundary>
    );

    const icon = screen.getByText(/this page failed to load/i).parentElement?.querySelector('i');
    expect(icon).toHaveClass('fa-exclamation-triangle');
  });

  it('shows error message in monospace font', () => {
    renderWithRouter(
      <RouteErrorBoundary>
        <ThrowingComponent />
      </RouteErrorBoundary>
    );

    const errorMsg = screen.getByText(/route component error/i);
    expect(errorMsg).toHaveClass('font-mono');
  });
});
