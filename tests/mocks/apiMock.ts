export const api = {
  getMe: jest.fn().mockResolvedValue({ user: null }),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  resendVerification: jest.fn(),
  getSavedArticles: jest.fn().mockResolvedValue({ articles: [] }),
  saveArticle: jest.fn(),
  unsaveArticle: jest.fn(),
};
