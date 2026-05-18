/**
 * Page Objects Index
 * 
 * Central export for all page objects
 * Usage: const { HomePage, ArticlePage } = require('./page-objects');
 */

const BasePage = require('./BasePage');
const HomePage = require('./HomePage');
const ArticlePage = require('./ArticlePage');
const ModalPage = require('./ModalPage');
const AnalyticsPage = require('./AnalyticsPage');

module.exports = {
  BasePage,
  HomePage,
  ArticlePage,
  ModalPage,
  AnalyticsPage,
};
