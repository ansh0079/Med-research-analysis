import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('bg-indigo-600');
  });

  it('renders all variants', () => {
    const variants = ['primary', 'secondary', 'danger', 'ghost', 'gradient'] as const;
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>Test</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
      unmount();
    }
  });

  it('renders all sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    for (const size of sizes) {
      const { unmount } = render(<Button size={size}>Test</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
      unmount();
    }
  });

  it('disables when isLoading is true', () => {
    render(<Button isLoading>Load</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    render(<Button isLoading>Load</Button>);
    const svg = screen.getByRole('button').querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });

  it('disables when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders with full width', () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('renders left icon', () => {
    render(
      <Button leftIcon={<span data-testid="left-icon">←</span>}>
        With Icon
      </Button>
    );
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('renders right icon', () => {
    render(
      <Button rightIcon={<span data-testid="right-icon">→</span>}>
        With Icon
      </Button>
    );
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('does not show right icon when loading', () => {
    render(
      <Button isLoading rightIcon={<span data-testid="right-icon">→</span>}>
        Loading
      </Button>
    );
    expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger click when disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('accepts custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(
      <Button ref={ref}>Ref Test</Button>
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
