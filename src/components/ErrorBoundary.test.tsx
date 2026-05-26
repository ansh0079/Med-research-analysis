import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error
const ThrowingComponent = () => {
  throw new Error('Test error message');
};

// Component that renders safely
const SafeComponent = () => <div>Safe content</div>;

describe('ErrorBoundary', () => {
  // Suppress console.error in tests since we expect error logs
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('displays error message when a child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/test error message/i)).toBeInTheDocument();
  });

  it('shows the error icon', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    const icon = screen.getByRole('button').parentElement?.querySelector('i');
    expect(icon).toHaveClass('fa-exclamation-triangle');
  });

  it('renders "Try again" button', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('resets error when "Try again" is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Rerender with safe component
    rerender(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainBtn);

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('accepts custom fallback', () => {
    const customFallback = <div>Custom error UI</div>;
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalled();
    const [error, errorInfo] = onError.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error message');
    expect(errorInfo.componentStack).toBeDefined();
  });

  it('has proper styling classes', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    const container = screen.getByText(/something went wrong/i).closest('div');
    expect(container).toHaveClass('bg-red-50');
    expect(container).toHaveClass('dark:bg-red-900/20');
    expect(container).toHaveClass('rounded-2xl');
  });
});
