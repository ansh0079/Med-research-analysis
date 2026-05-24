import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoadingState, ErrorState, EmptyState } from './StateViews';

describe('LoadingState', () => {
  it('renders with default message', () => {
    render(<LoadingState />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingState message="Fetching articles..." />);

    expect(screen.getByText('Fetching articles...')).toBeInTheDocument();
  });

  it('renders spinner element', () => {
    const { container } = render(<LoadingState />);

    const spinner = container.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <LoadingState className="my-custom-class" />
    );

    expect(container.firstChild).toHaveClass('my-custom-class');
  });
});

describe('ErrorState', () => {
  it('renders with default title and provided message', () => {
    render(<ErrorState message="Failed to load data" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<ErrorState title="Network Error" message="Check your connection" />);

    expect(screen.getByText('Network Error')).toBeInTheDocument();
  });

  it('renders warning emoji', () => {
    render(<ErrorState message="Error occurred" />);

    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    render(
      <ErrorState message="Failed" onRetry={jest.fn()} />
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('does not render retry button when onRetry not provided', () => {
    render(<ErrorState message="Failed" />);

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('calls onRetry when try again button clicked', () => {
    const mockRetry = jest.fn();

    render(<ErrorState message="Error" onRetry={mockRetry} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry multiple times on repeated clicks', () => {
    const mockRetry = jest.fn();

    render(<ErrorState message="Error" onRetry={mockRetry} />);

    const btn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);

    expect(mockRetry).toHaveBeenCalledTimes(3);
  });

  it('applies custom className', () => {
    const { container } = render(
      <ErrorState message="Error" className="error-custom" />
    );

    expect(container.firstChild).toHaveClass('error-custom');
  });
});

describe('EmptyState', () => {
  it('renders with default icon and provided title', () => {
    render(<EmptyState title="No results found" />);

    expect(screen.getByText('📭')).toBeInTheDocument();
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('renders with custom icon', () => {
    render(<EmptyState icon="🔍" title="Search empty" />);

    expect(screen.getByText('🔍')).toBeInTheDocument();
  });

  it('renders optional message when provided', () => {
    render(
      <EmptyState title="Nothing here" message="Try different search terms" />
    );

    expect(screen.getByText('Try different search terms')).toBeInTheDocument();
  });

  it('does not render message when not provided', () => {
    render(<EmptyState title="Empty" />);

    // Only the title p/h3 should be present; no extra text
    expect(screen.queryByText(/try different/i)).not.toBeInTheDocument();
  });

  it('renders action ReactNode when provided', () => {
    render(
      <EmptyState
        title="Empty basket"
        action={<button>Start searching</button>}
      />
    );

    expect(screen.getByRole('button', { name: /start searching/i })).toBeInTheDocument();
  });

  it('calls action callback when action button clicked', () => {
    const mockAction = jest.fn();

    render(
      <EmptyState
        title="No items"
        action={<button onClick={mockAction}>Add item</button>}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /add item/i }));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('does not render action when not provided', () => {
    render(<EmptyState title="Empty" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState title="Empty" className="custom-empty" />
    );

    expect(container.firstChild).toHaveClass('custom-empty');
  });
});
