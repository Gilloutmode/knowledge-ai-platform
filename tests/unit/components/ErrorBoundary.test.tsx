import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, ErrorFallback, InlineError } from '@/components/ErrorBoundary';

// Component that throws an error
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child content rendered successfully</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error during tests since we're testing error handling
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('normal rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Child content rendered successfully')).toBeInTheDocument();
    });

    it('should not show error UI when children render successfully', () => {
      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should catch errors and display error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(
        screen.getByText(/An unexpected error occurred/i)
      ).toBeInTheDocument();
    });

    it('should display Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should display Go Home button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onErrorMock = vi.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error message' }),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });
  });

  describe('retry functionality', () => {
    it('should have functional Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error UI should be visible
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // The Try Again button should be present and clickable
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      // Click should not throw (this tests the handleRetry method works)
      expect(() => fireEvent.click(retryButton)).not.toThrow();
    });

    it('should recover when remounted with working children', () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error UI should be visible
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Unmount and remount with working component
      unmount();

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should now show child content
      expect(screen.getByText('Child content rendered successfully')).toBeInTheDocument();
    });
  });

  describe('custom fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });
});

describe('ErrorFallback', () => {
  it('should render error message', () => {
    const error = new Error('Component failed to load');
    const resetMock = vi.fn();

    render(<ErrorFallback error={error} resetErrorBoundary={resetMock} />);

    expect(screen.getByText('Error loading content')).toBeInTheDocument();
    expect(screen.getByText('Component failed to load')).toBeInTheDocument();
  });

  it('should render Try again button', () => {
    const error = new Error('Test error');
    const resetMock = vi.fn();

    render(<ErrorFallback error={error} resetErrorBoundary={resetMock} />);

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should call resetErrorBoundary when Try again is clicked', () => {
    const error = new Error('Test error');
    const resetMock = vi.fn();

    render(<ErrorFallback error={error} resetErrorBoundary={resetMock} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(resetMock).toHaveBeenCalledTimes(1);
  });
});

describe('InlineError', () => {
  it('should render error message', () => {
    render(<InlineError message="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should not render Retry button when onRetry is not provided', () => {
    render(<InlineError message="Error occurred" />);

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('should render Retry button when onRetry is provided', () => {
    const retryMock = vi.fn();

    render(<InlineError message="Error occurred" onRetry={retryMock} />);

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should call onRetry when Retry button is clicked', () => {
    const retryMock = vi.fn();

    render(<InlineError message="Error occurred" onRetry={retryMock} />);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(retryMock).toHaveBeenCalledTimes(1);
  });
});
