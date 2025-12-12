import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../utils/test-utils';
import { Header } from '@/components/Layout/Header';

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('title rendering', () => {
    it('should render the page title', () => {
      render(<Header title="Dashboard" />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    });

    it('should render different titles correctly', () => {
      const { rerender } = render(<Header title="Videos" />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Videos');

      rerender(<Header title="Channels" />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Channels');
    });
  });

  describe('breadcrumb', () => {
    it('should not render breadcrumb when empty', () => {
      render(<Header title="Test" breadcrumb={[]} />);

      expect(screen.queryByText('Main')).not.toBeInTheDocument();
    });

    it('should render breadcrumb when provided', () => {
      render(<Header title="Test" breadcrumb={['Dashboard']} />);

      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(screen.getByText('/')).toBeInTheDocument();
    });
  });

  describe('theme toggle', () => {
    it('should render theme toggle button', () => {
      render(<Header title="Test" />);

      // Theme toggle button should be present
      const themeButton = screen.getByRole('button', { name: /changer le thème/i });
      expect(themeButton).toBeInTheDocument();
    });

    it('should show theme dropdown when clicking toggle', () => {
      render(<Header title="Test" />);

      const themeButton = screen.getByRole('button', { name: /changer le thème/i });
      fireEvent.click(themeButton);

      // Dropdown options should be visible - use getAllByText since text may appear multiple times
      expect(screen.getAllByText('Clair').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Sombre').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Système')).toBeInTheDocument();
    });

    it('should close dropdown when clicking a theme option', () => {
      render(<Header title="Test" />);

      const themeButton = screen.getByRole('button', { name: /changer le thème/i });
      fireEvent.click(themeButton);

      // Click on a theme option - get all 'Sombre' texts and click the one in the dropdown
      const sombreOptions = screen.getAllByText('Sombre');
      // The dropdown option is the one inside a button with full width
      const dropdownOption = sombreOptions.find(el =>
        el.closest('button')?.classList.contains('w-full')
      );
      if (dropdownOption) {
        fireEvent.click(dropdownOption);
      }

      // Dropdown should be closed
      expect(themeButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('notifications', () => {
    it('should render notification bell', () => {
      render(<Header title="Test" />);

      const notifButton = screen.getByRole('button', { name: /notifications/i });
      expect(notifButton).toBeInTheDocument();
    });

    it('should show notification indicator when count > 0', () => {
      const { container } = render(<Header title="Test" notificationCount={5} />);

      // There should be an animated pulse indicator
      const pulseIndicator = container.querySelector('.animate-pulse');
      expect(pulseIndicator).toBeInTheDocument();
    });

    it('should not show notification indicator when count is 0', () => {
      const { container } = render(<Header title="Test" notificationCount={0} />);

      const pulseIndicator = container.querySelector('.animate-pulse');
      expect(pulseIndicator).not.toBeInTheDocument();
    });

    it('should include count in aria-label when notifications exist', () => {
      render(<Header title="Test" notificationCount={5} />);

      const notifButton = screen.getByRole('button', { name: /5 nouvelles/i });
      expect(notifButton).toBeInTheDocument();
    });
  });

  describe('user menu', () => {
    it('should render user menu button', () => {
      render(<Header title="Test" />);

      const userButton = screen.getByRole('button', { name: /menu utilisateur/i });
      expect(userButton).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have heading with correct level', () => {
      render(<Header title="Test" />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible theme toggle with aria attributes', () => {
      render(<Header title="Test" />);

      const themeButton = screen.getByRole('button', { name: /changer le thème/i });
      expect(themeButton).toHaveAttribute('aria-haspopup', 'true');
      expect(themeButton).toHaveAttribute('aria-expanded');
    });

    it('should have accessible notification button', () => {
      render(<Header title="Test" />);

      const notifButton = screen.getByRole('button', { name: /notifications/i });
      expect(notifButton).toHaveAttribute('aria-label');
    });
  });

  describe('global search', () => {
    it('should render GlobalSearch component', () => {
      render(<Header title="Test" />);

      // GlobalSearch uses a search input
      const searchInput = screen.getByPlaceholderText(/rechercher/i);
      expect(searchInput).toBeInTheDocument();
    });
  });
});
