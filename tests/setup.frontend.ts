import '@testing-library/jest-dom';

const originalConsoleError = console.error.bind(console);
const originalConsoleWarn = console.warn.bind(console);

function consoleText(args: unknown[]): string {
  return args.map((arg) => (typeof arg === 'string' ? arg : '')).join(' ');
}

const quietErrorPatterns = [
  /Warning: An update to .* was not wrapped in act\(\.\.\.\)/,
];

const quietWarnPatterns = [
  /No routes matched location/,
];

console.error = (...args: unknown[]) => {
  const text = consoleText(args);
  if (quietErrorPatterns.some((pattern) => pattern.test(text))) return;
  originalConsoleError(...args);
};

console.warn = (...args: unknown[]) => {
  const text = consoleText(args);
  if (quietWarnPatterns.some((pattern) => pattern.test(text))) return;
  originalConsoleWarn(...args);
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  document.documentElement.className = '';
});
