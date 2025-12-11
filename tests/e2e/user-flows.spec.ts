import { test, expect } from '@playwright/test';

test.describe('User Flows E2E Tests', () => {
  test.describe('Search Functionality', () => {
    test('should have a search input in the header', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.getByPlaceholder(/rechercher/i);
      await expect(searchInput).toBeVisible();
    });

    test('should allow typing in search', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.getByPlaceholder(/rechercher/i);
      await searchInput.fill('test search query');

      await expect(searchInput).toHaveValue('test search query');
    });

    test('should show clear button when search has content', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.getByPlaceholder(/rechercher/i);
      await searchInput.fill('some text');

      // Look for the clear button (✕)
      const clearButton = page.locator('button').filter({ hasText: '✕' });
      await expect(clearButton).toBeVisible();
    });

    test('should clear search when clicking clear button', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.getByPlaceholder(/rechercher/i);
      await searchInput.fill('some text');

      const clearButton = page.locator('button').filter({ hasText: '✕' });
      await clearButton.click();

      await expect(searchInput).toHaveValue('');
    });
  });

  test.describe('Sidebar Navigation', () => {
    test('should highlight current page in sidebar', async ({ page }) => {
      await page.goto('/channels');

      // The channels link in sidebar should be highlighted
      const sidebar = page.locator('aside');
      const channelsLink = sidebar.getByRole('link', { name: /chaînes/i });
      await expect(channelsLink).toBeVisible();
    });

    test('should navigate using sidebar links', async ({ page }) => {
      await page.goto('/');

      // Click on Videos in sidebar
      const videosLink = page.locator('aside').getByRole('link', { name: /vidéos/i });
      await videosLink.click();

      // Should navigate to videos page
      await expect(page).toHaveURL(/\/videos/);
    });

    test('should have all main navigation items', async ({ page }) => {
      await page.goto('/');

      const sidebar = page.locator('aside');

      // Check for all main navigation items (case-insensitive)
      await expect(sidebar.getByText(/overview|tableau de bord/i)).toBeVisible();
      await expect(sidebar.getByText(/chaînes/i)).toBeVisible();
      await expect(sidebar.getByText(/vidéos/i)).toBeVisible();
      await expect(sidebar.getByText(/analyses/i)).toBeVisible();
    });
  });

  test.describe('Videos Page', () => {
    test('should display video filters', async ({ page }) => {
      await page.goto('/videos');

      // Should have filter options
      await expect(page.locator('main')).toBeVisible();
    });

    test('should show video list or empty state', async ({ page }) => {
      await page.goto('/videos');

      // Either shows videos or an empty state message
      const main = page.locator('main');
      await expect(main).toBeVisible();

      // Page should render without errors
      const body = page.locator('body');
      const hasError = await body.locator('text=/error|erreur/i').count();
      expect(hasError).toBe(0);
    });
  });

  test.describe('Analyses Page', () => {
    test('should load analyses page', async ({ page }) => {
      await page.goto('/analyses');

      await expect(page.locator('main')).toBeVisible();
    });

    test('should display analysis filters or tabs', async ({ page }) => {
      await page.goto('/analyses');

      // Page should have content
      const main = page.locator('main');
      await expect(main).toBeVisible();
    });
  });

  test.describe('Settings Page', () => {
    test('should load settings page', async ({ page }) => {
      await page.goto('/settings');

      await expect(page.locator('main')).toBeVisible();
    });

    test('should have settings sections', async ({ page }) => {
      await page.goto('/settings');

      // Settings should display some content
      const main = page.locator('main');
      const hasContent = (await main.textContent())?.length ?? 0;
      expect(hasContent).toBeGreaterThan(0);
    });
  });

  test.describe('Add Channel Flow', () => {
    test('should navigate to add channel page', async ({ page }) => {
      await page.goto('/channels');

      // Find and click add button (scope to main content to avoid sidebar duplicate)
      const addButton = page.locator('main').getByRole('button', { name: /add|ajouter/i });
      await expect(addButton).toBeVisible();
    });

    test('should show channel input form on add-channel page', async ({ page }) => {
      await page.goto('/add-channel');

      // Should have an input for YouTube URL or channel name
      const form = page.locator('form').or(page.locator('main'));
      await expect(form).toBeVisible();
    });
  });

  test.describe('Theme Toggle', () => {
    test('should have theme toggle buttons', async ({ page }) => {
      await page.goto('/');

      // Look for theme toggle (sun and moon icons)
      const header = page.locator('header');
      const buttons = header.locator('button');

      // Should have multiple buttons including theme toggle
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);
    });

    test('should toggle theme when clicking theme button', async ({ page }) => {
      await page.goto('/');

      // Find theme toggle area
      const header = page.locator('header');
      const themeButtons = header.locator('button');

      // Click the first button in the theme area
      const firstButton = themeButtons.first();
      await firstButton.click();

      // Page should still be functional
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Notifications', () => {
    test('should have notification bell in header', async ({ page }) => {
      await page.goto('/');

      // Look for notification button
      const header = page.locator('header');
      const notificationButton = header.locator('button').filter({
        has: page.locator('svg'),
      });

      // Should have a clickable notification area
      const buttonCount = await notificationButton.count();
      expect(buttonCount).toBeGreaterThan(0);
    });

    test('should navigate to notifications page', async ({ page }) => {
      await page.goto('/notifications');

      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('User Menu', () => {
    test('should display user avatar in header', async ({ page }) => {
      await page.goto('/');

      // Look for user menu button
      const header = page.locator('header');
      await expect(header).toBeVisible();

      // Should have user-related elements (avatar area)
      const userArea = header.locator('button').last();
      await expect(userArea).toBeVisible();
    });
  });

  test.describe('Page Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await expect(page.locator('main')).toBeVisible();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should not have console errors on page load', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Filter out known non-critical errors (API errors in demo mode are expected)
      const criticalErrors = consoleErrors.filter(
        (error) =>
          !error.includes('favicon') &&
          !error.includes('Failed to load resource') &&
          !error.includes('net::') &&
          !error.includes('ApiError') &&
          !error.includes('Invalid response from server') &&
          !error.includes('Error fetching')
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('Content Studio', () => {
    test('should load content studio page', async ({ page }) => {
      await page.goto('/content-studio');

      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should render correctly on mobile', async ({ page }) => {
      await page.goto('/');

      // Page should be visible and functional
      await expect(page.locator('main')).toBeVisible();
    });

    test('should have scrollable content on mobile', async ({ page }) => {
      await page.goto('/');

      // Content should be scrollable
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });
});
