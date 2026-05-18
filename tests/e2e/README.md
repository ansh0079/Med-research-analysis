# E2E Tests for Medical Research Application

Comprehensive end-to-end tests using Playwright for the Medical Research Finder application.

## 📁 Test Structure

```
tests/e2e/
├── README.md                      # This file
├── research-flow.spec.js          # Main test suite (all test cases)
├── playwright.config.js           # Playwright configuration (root)
├── global-setup.js                # Global setup (runs before all tests)
├── global-teardown.js             # Global teardown (runs after all tests)
├── helpers.js                     # Shared utility functions
├── fixtures/
│   └── test-fixtures.js           # Test fixtures with page objects
└── page-objects/
    ├── index.js                   # Page objects export
    ├── BasePage.js                # Base page object with common methods
    ├── HomePage.js                # Home page (search, navigation)
    ├── ArticlePage.js             # Article card interactions
    ├── ModalPage.js               # Modal interactions (settings, history, etc.)
    └── AnalyticsPage.js           # Analytics dashboard
```

## 🚀 Quick Start

### Installation

```bash
# Install Playwright browsers
npm run test:e2e:install

# Or with system dependencies (Linux)
npm run test:e2e:install-deps
```

### Run Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug

# Run specific browser
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run responsive tests only
npm run test:e2e:mobile
npm run test:e2e:tablet

# View HTML report
npm run test:e2e:report
```

## 📋 Test Coverage

### 1. Homepage Load Tests ✅
- App loads with correct title and branding
- Search input renders with proper placeholder
- All navigation buttons are visible
- Source selector displays all options
- Specificity selector is functional
- Empty state shown before search
- Proper meta tags for SEO

### 2. Search Flow Tests 🔍
- Execute search and display results
- Loading state during search
- Toast notifications on success
- Handle empty search results
- Parsed query pills display
- Change search specificity
- Toggle search sources
- Cache results for repeat searches
- Agentic (AI-powered) search
- Clear previous results on new search

### 3. Article Interaction Tests 📄
- Display article with required elements
- Save/unsave articles
- Persist saved articles across reload
- Toggle abstract visibility
- Add to comparison
- Add to batch selection
- Open AI analysis panel
- Open Mistral AI analysis
- Open access badge display
- PubMed link verification

### 4. History Tests 📜
- Track search in memory
- Display search in history
- Re-run search from history
- Empty state when no history

### 5. Analytics Tests 📊
- Display research visualization
- Show all chart tabs
- Switch between chart views
- Display studies count
- Timeline data visualization
- Journal distribution
- Citation data
- Topic cloud
- Synthesis report
- Batch analysis

### 6. Responsive Design Tests 📱
- Mobile viewport (375x667)
- Tablet viewport (768x1024)
- Large desktop (1920x1080)
- Layout adjustments on resize
- Mobile-optimized navigation

### 7. Accessibility Tests ♿
- Proper ARIA labels
- Keyboard navigation
- Escape key to close modals
- Proper heading hierarchy
- Sufficient color contrast
- Accessible form labels
- Focus indicators
- Alt text for icons

### 8. Settings Tests ⚙️
- Open settings modal
- Change AI provider
- Change search specificity
- Persist settings across reload

### 9. Error Handling Tests ⚠️
- Network error handling
- Empty search query
- Very long search query
- Special characters in search

### 10. Performance Tests ⚡
- Search completes within 15 seconds
- Page load within 5 seconds
- Modal opens within 1 second

## 🔧 Configuration

### Playwright Configuration

The `playwright.config.js` file includes:

- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **Tablet**: Galaxy Tab S4, iPad
- **Parallel execution**: Enabled for faster runs
- **Retries**: 2 retries on CI
- **Artifacts**: Screenshots and videos on failure
- **Tracing**: Collected on first retry

### Environment Variables

```bash
# Base URL for tests
BASE_URL=http://localhost:3002

# CI mode (disables parallel execution)
CI=true
```

## 🏗️ Page Object Model

Tests use the Page Object Model pattern for maintainability:

```javascript
// Example test using page objects
test('should search for articles', async ({ homePage }) => {
  await homePage.goto();
  await homePage.search('diabetes treatment');
  expect(await homePage.hasResults()).toBeTruthy();
});
```

### Available Page Objects

- **HomePage**: Search, navigation, settings
- **ArticlePage**: Article cards, save, abstract, analysis
- **ModalPage**: All modals (settings, history, analysis, etc.)
- **AnalyticsPage**: Charts, visualizations, reports

## 🧪 Test Fixtures

Custom fixtures provide pre-configured objects:

```javascript
test('example test', async ({ homePage, articlePage, testData }) => {
  // Use pre-configured page objects
  await homePage.goto();
  await homePage.search(testData.queries.valid);
});
```

### Available Fixtures

- `homePage`: Pre-configured HomePage object
- `articlePage`: Pre-configured ArticlePage object
- `modalPage`: Pre-configured ModalPage object
- `analyticsPage`: Pre-configured AnalyticsPage object
- `testData`: Common test data (queries, viewports, timeouts)
- `helpers`: Utility functions (waitForToast, mockSearch, etc.)
- `cleanStorage`: Clears localStorage before test

## 📸 Artifacts

Test artifacts are saved to `test-results/`:

- **Screenshots**: `test-results/screenshots/`
- **Videos**: `test-results/videos/`
- **Traces**: `test-results/traces/`

View traces with:
```bash
npx playwright show-trace test-results/traces/<trace-name>.zip
```

## 🔄 CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to main branch
- Pull requests

### Local CI Simulation

```bash
# Run tests in CI mode (sequential, no watch)
CI=true npm run test:e2e
```

## 🐛 Debugging

### Debug Mode

```bash
# Run with Playwright Inspector
npm run test:e2e:debug
```

### UI Mode

```bash
# Interactive UI for debugging
npm run test:e2e:ui
```

### Screenshots on Failure

Screenshots are automatically captured on test failures in `test-results/screenshots/`.

### Console Logs

Enable verbose logging:
```bash
DEBUG=pw:api npm run test:e2e
```

## 📝 Writing New Tests

1. Use existing page objects when possible
2. Add new methods to page objects for reusability
3. Use fixtures for shared setup
4. Include proper assertions
5. Add test to appropriate describe block
6. Follow naming convention: `should [expected behavior]`

### Example:

```javascript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('should perform specific action', async ({ homePage, helpers }) => {
    // Arrange
    await homePage.search('query');
    
    // Act
    await homePage.click(homePage.selectors.someButton);
    
    // Assert
    const toast = await helpers.waitForToast('success');
    expect(toast).toContain('expected message');
  });
});
```

## 📚 Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `cleanStorage` fixture to reset state
3. **Retries**: Tests should be resilient to flakiness
4. **Selectors**: Use data attributes or semantic selectors
5. **Timeouts**: Use appropriate timeouts for network operations
6. **Assertions**: Make assertions specific and meaningful
7. **Documentation**: Comment complex test logic

## 🤝 Contributing

When adding new features:
1. Add corresponding E2E tests
2. Update page objects if needed
3. Test across all supported browsers
4. Verify mobile responsiveness
5. Check accessibility requirements
