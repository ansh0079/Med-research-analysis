import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ToastContainer, useToast } from './Toast';
import type { Toast } from '@types';

describe('ToastContainer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders nothing when toasts array is empty', () => {
    const { container } = render(
      <ToastContainer toasts={[]} onRemove={jest.fn()} />
    );

    // Container div is present but has no children
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.children).toHaveLength(0);
  });

  it('renders a toast item with message', () => {
    const toasts: Toast[] = [
      { id: '1', message: 'Operation successful', type: 'success' },
    ];

    render(<ToastContainer toasts={toasts} onRemove={jest.fn()} />);

    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('renders multiple toast items', () => {
    const toasts: Toast[] = [
      { id: '1', message: 'First toast', type: 'success' },
      { id: '2', message: 'Second toast', type: 'error' },
      { id: '3', message: 'Third toast', type: 'info' },
    ];

    render(<ToastContainer toasts={toasts} onRemove={jest.fn()} />);

    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
    expect(screen.getByText('Third toast')).toBeInTheDocument();
  });

  it('auto-dismisses after default duration (4000ms)', () => {
    const mockOnRemove = jest.fn();
    const toasts: Toast[] = [
      { id: 'toast-1', message: 'Auto dismiss', type: 'info' },
    ];

    render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(mockOnRemove).toHaveBeenCalledWith('toast-1');
  });

  it('respects custom duration', () => {
    const mockOnRemove = jest.fn();
    const toasts: Toast[] = [
      { id: 'toast-1', message: 'Custom duration', type: 'success', duration: 1500 },
    ];

    render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);

    act(() => {
      jest.advanceTimersByTime(1499);
    });
    expect(mockOnRemove).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockOnRemove).toHaveBeenCalledWith('toast-1');
  });

  it('calls onRemove with correct id when close button clicked', () => {
    const mockOnRemove = jest.fn();
    const toasts: Toast[] = [
      { id: 'my-toast', message: 'Close me', type: 'warning' },
    ];

    render(<ToastContainer toasts={toasts} onRemove={mockOnRemove} />);

    const closeBtn = screen.getByRole('button');
    closeBtn.click();

    expect(mockOnRemove).toHaveBeenCalledWith('my-toast');
  });

  it('applies green background for success type', () => {
    const toasts: Toast[] = [
      { id: '1', message: 'Success!', type: 'success' },
    ];

    const { container } = render(
      <ToastContainer toasts={toasts} onRemove={jest.fn()} />
    );

    const toastItem = container.querySelector('.bg-green-600');
    expect(toastItem).toBeInTheDocument();
  });

  it('applies red background for error type', () => {
    const toasts: Toast[] = [
      { id: '1', message: 'Error!', type: 'error' },
    ];

    const { container } = render(
      <ToastContainer toasts={toasts} onRemove={jest.fn()} />
    );

    const toastItem = container.querySelector('.bg-red-600');
    expect(toastItem).toBeInTheDocument();
  });

  it('applies amber background for warning type', () => {
    const toasts: Toast[] = [
      { id: '1', message: 'Warning!', type: 'warning' },
    ];

    const { container } = render(
      <ToastContainer toasts={toasts} onRemove={jest.fn()} />
    );

    const toastItem = container.querySelector('.bg-amber-500');
    expect(toastItem).toBeInTheDocument();
  });

  it('applies indigo background for info type', () => {
    const toasts: Toast[] = [
      { id: '1', message: 'Info!', type: 'info' },
    ];

    const { container } = render(
      <ToastContainer toasts={toasts} onRemove={jest.fn()} />
    );

    const toastItem = container.querySelector('.bg-indigo-600');
    expect(toastItem).toBeInTheDocument();
  });

  it('cleans up timer on unmount', () => {
    const mockOnRemove = jest.fn();
    const toasts: Toast[] = [
      { id: '1', message: 'Test', type: 'info', duration: 5000 },
    ];

    const { unmount } = render(
      <ToastContainer toasts={toasts} onRemove={mockOnRemove} />
    );

    unmount();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockOnRemove).not.toHaveBeenCalled();
  });
});

describe('useToast', () => {
  let dateNowSpy: jest.SpyInstance;
  let counter = 0;

  beforeEach(() => {
    counter = 0;
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => ++counter);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  it('initializes with empty toasts array', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
  });

  it('showToast adds a toast with correct fields', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Hello', 'success');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Hello');
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[0].id).toBeTruthy();
  });

  it('showToast defaults type to info', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Message');
    });

    expect(result.current.toasts[0].type).toBe('info');
  });

  it('showToast stores custom duration', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Message', 'warning', 2000);
    });

    expect(result.current.toasts[0].duration).toBe(2000);
  });

  it('removeToast removes toast by id', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('First', 'success');
      result.current.showToast('Second', 'error');
    });

    expect(result.current.toasts).toHaveLength(2);

    const idToRemove = result.current.toasts[0].id;

    act(() => {
      result.current.removeToast(idToRemove);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Second');
  });

  it('multiple showToast calls stack toasts with unique IDs', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Toast 1', 'info');
      result.current.showToast('Toast 2', 'success');
      result.current.showToast('Toast 3', 'error');
    });

    expect(result.current.toasts).toHaveLength(3);
    const ids = result.current.toasts.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });
});
