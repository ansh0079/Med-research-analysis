import '@testing-library/jest-dom';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  document.documentElement.className = '';
});
