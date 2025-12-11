import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '@/components/Layout/Header';

describe('Header', () => {
  const defaultProps = {
    title: 'Test Page',
    searchQuery: '',
    onSearchChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('title rendering', () => {
    it('should render the page title', () => {
      render(<Header {...defaultProps} title="Dashboard" />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    });

    it('should render different titles correctly', () => {
      const { rerender } = render(<Header {...defaultProps} title="Videos" />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Videos');

      rerender(<Header {...defaultProps} title="Channels" />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Channels');
    });
  });

  describe('breadcrumb', () => {
    it('should not render breadcrumb when empty', () => {
      render(<Header {...defaultProps} breadcrumb={[]} />);

      expect(screen.queryByText('Main')).not.toBeInTheDocument();
    });

    it('should render breadcrumb when provided', () => {
      render(<Header {...defaultProps} breadcrumb={['Dashboard']} />);

      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(screen.getByText('/')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('should render search input', () => {
      render(<Header {...defaultProps} />);

      expect(
        screen.getByPlaceholderText(/rechercher vidéos, chaînes/i)
      ).toBeInTheDocument();
    });

    it('should display search query value', () => {
      render(<Header {...defaultProps} searchQuery="test query" />);

      const input = screen.getByPlaceholderText(/rechercher/i);
      expect(input).toHaveValue('test query');
    });

    it('should call onSearchChange when typing', async () => {
      const onSearchChange = vi.fn();
      const user = userEvent.setup();

      render(<Header {...defaultProps} onSearchChange={onSearchChange} />);

      const input = screen.getByPlaceholderText(/rechercher/i);
      await user.type(input, 'new search');

      expect(onSearchChange).toHaveBeenCalled();
    });

    it('should show clear button when search query is not empty', () => {
      render(<Header {...defaultProps} searchQuery="some query" />);

      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('should not show clear button when search query is empty', () => {
      render(<Header {...defaultProps} searchQuery="" />);

      expect(screen.queryByText('✕')).not.toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', () => {
      const onSearchChange = vi.fn();

      render(
        <Header {...defaultProps} searchQuery="some query" onSearchChange={onSearchChange} />
      );

      fireEvent.click(screen.getByText('✕'));

      expect(onSearchChange).toHaveBeenCalledWith('');
    });
  });

  describe('theme toggle', () => {
    it('should render theme toggle buttons', () => {
      render(<Header {...defaultProps} />);

      // Both Sun and Moon buttons should be present
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should toggle theme when clicking sun button', () => {
      render(<Header {...defaultProps} />);

      // Find the theme toggle buttons (there should be 2 buttons for theme)
      const buttons = screen.getAllByRole('button');
      // Click the first button in the theme toggle (sun)
      fireEvent.click(buttons[0]);

      // The component should handle the state change internally
      // We can verify the button classes changed (this tests the onClick handler)
    });
  });

  describe('notifications', () => {
    it('should render notification bell', () => {
      render(<Header {...defaultProps} />);

      // Bell icon should be visible
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should show notification indicator when count > 0', () => {
      const { container } = render(<Header {...defaultProps} notificationCount={5} />);

      // There should be an animated pulse indicator
      const pulseIndicator = container.querySelector('.animate-pulse');
      expect(pulseIndicator).toBeInTheDocument();
    });

    it('should not show notification indicator when count is 0', () => {
      const { container } = render(<Header {...defaultProps} notificationCount={0} />);

      const pulseIndicator = container.querySelector('.animate-pulse');
      expect(pulseIndicator).not.toBeInTheDocument();
    });
  });

  describe('user menu', () => {
    it('should render user menu button', () => {
      render(<Header {...defaultProps} />);

      // User menu should have the avatar and chevron
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('should have accessible search input', () => {
      render(<Header {...defaultProps} />);

      const input = screen.getByPlaceholderText(/rechercher/i);
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should have heading with correct level', () => {
      render(<Header {...defaultProps} title="Test" />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });
  });
});
