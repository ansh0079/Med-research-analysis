# Changelog

All notable changes to the Medical Research Intelligence Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0] - 2026-02-14

> ⚠️ **DEPLOYMENT HALTED (2026-04-27):** This release is **NOT ready for production**. Previous claims of launch readiness were inaccurate. Critical runtime errors (missing Database methods), security gaps (default JWT secret, missing Helmet headers, incomplete auth), and documentation inconsistencies have been identified. The engineering team is actively resolving these issues. **Do not deploy until all P0/P1 items in `ROADMAP.md` are closed.**

### 🎉 Highlights

Major release with AI-powered summarization, enhanced caching, and enterprise-grade features.

### ✨ Added

#### AI & Analysis
- **Multi-Style Summarization** - Executive, technical, and layperson summary styles
- **Key Findings Extraction** - Automatically extract 3-5 most important findings
- **Highlights Generation** - Bullet-point paper highlights
- **OpenAI Support** - Added GPT-3.5/GPT-4 as alternative to Mistral-7B
- **Local AI Server** - Python/FastAPI server for fully offline operation
- **Analysis Confidence Scoring** - AI-generated confidence metrics for outputs

#### API & Backend
- **Intelligent Caching** - 1-hour TTL cache with MD5 key generation
- **Rate Limiting** - 30 requests/minute per IP
- **Admin Endpoints** - Cache management and statistics
- **Comprehensive Error Handling** - Detailed error messages with status codes
- **Request Validation** - Input validation for all endpoints

#### Frontend
- **Model Status Bar** - Real-time AI model status indicator
- **Local Chat Assistant** - Embedded AI research assistant
- **Learning Hub** - Interactive tutorials and feature guides
- **Mobile Optimizations** - Enhanced responsive design
- **Dark Mode Improvements** - Better contrast and theming

#### Research Tools
- **Agentic Search** - AI-driven multi-vector query exploration
- **True Comparative Analysis** - Side-by-side detailed paper comparison
- **Citation Network Enhancements** - D3.js performance improvements
- **Research Memory** - Persistent session history
- **Smart Collections v2** - Tags, folders, and bulk operations

### 🔧 Changed

- **Proxy Server Architecture** - Complete refactor for better performance
- **AI Analysis Panel** - Redesigned with mode selection
- **Search Interface** - Improved query parsing and suggestions
- **Caching Strategy** - Moved from in-memory to NodeCache

### 🐛 Fixed

- Fixed CORS issues with Hugging Face API
- Resolved memory leaks in citation network visualization
- Fixed batch analysis progress tracking
- Corrected author name parsing from various sources
- Fixed PDF export formatting issues

### 🚀 Performance

- 60% faster summary generation with caching
- 40% reduction in API calls through intelligent deduplication
- Improved D3.js rendering for large citation networks (1000+ nodes)
- Reduced bundle size through lazy loading

### 🔒 Security

- Added input sanitization for all API endpoints
- Implemented rate limiting to prevent abuse
- Added admin key authentication for sensitive endpoints
- Enhanced XSS protection in article rendering

### 📚 Documentation

- Complete API documentation with examples
- Feature showcase with screenshots
- Architecture diagrams
- Deployment guides

---

## [2.1.0] - 2025-11-20

### ✨ Added

- **Batch Analysis** - Process multiple papers simultaneously
- **Synthesis Reports** - Auto-generate systematic review drafts
- **Citation Graph Visualization** - Interactive D3.js network graphs
- **Share Results** - Generate shareable links to research
- **USMLE Integration** - Medical exam question practice mode

### 🔧 Changed

- Improved PubMed search relevance scoring
- Enhanced author disambiguation
- Updated Semantic Scholar API to v2

### 🐛 Fixed

- Fixed duplicate results from multi-source search
- Resolved DOI resolution issues
- Corrected publication date parsing

---

## [2.0.0] - 2025-08-15

### 🎉 Highlights

Complete platform rebuild with BioGPT integration and modern React architecture.

### ✨ Added

- **BioGPT Integration** - AI-powered medical text analysis
- **Mistral-7B Support** - Local and API-based analysis
- **Multi-Source Search** - PubMed + Semantic Scholar unified search
- **React 18 Frontend** - Modern component-based architecture
- **Tailwind CSS** - Utility-first styling
- **Smart Collections** - Save and organize research
- **Research Timeline** - Chronological research history

### 🔧 Changed

- Migrated from vanilla JS to React
- Replaced Bootstrap with Tailwind CSS
- New search interface with natural language support
- Improved article card design

### 🗑️ Removed

- Legacy jQuery dependencies
- Old Bootstrap-based UI components
- Deprecated API endpoints

---

## [1.2.0] - 2025-05-10

### ✨ Added

- **Export to PDF** - Generate research reports
- **BibTeX Export** - Citation manager compatibility
- **Dark Mode** - Toggle between light and dark themes
- **Keyboard Shortcuts** - Power-user navigation

### 🐛 Fixed

- Mobile responsiveness issues
- Search timeout handling
- Author name formatting

---

## [1.1.0] - 2025-02-28

### ✨ Added

- **PubMed Integration** - Direct E-utilities API access
- **Save Articles** - Local storage for saved papers
- **Search History** - Previous query recall
- **Abstract Preview** - Expandable abstracts in results

### 🔧 Changed

- Improved search performance
- Better error messages for API failures

---

## [1.0.0] - 2025-01-15

### 🎉 Initial Release

First public release of the Medical Research Analysis platform.

### ✨ Features

- Basic PubMed search interface
- Article display with metadata
- Simple save functionality
- Responsive design

---

## Upcoming Features

### Planned for v3.1.0

- [ ] **PDF Full-Text Extraction** - Parse and analyze full papers
- [ ] **Collaborative Annotations** - Share notes with team members
- [ ] **Zotero Integration** - Direct sync with reference manager
- [ ] **Browser Extension** - One-click save from publisher sites

### Planned for v4.0.0

- [ ] **Institutional SSO** - SAML/OAuth integration
- [ ] **Custom Model Fine-Tuning** - Organization-specific AI models
- [ ] **Real-time Collaboration** - Multi-user editing
- [ ] **Advanced Analytics** - Research trend analysis
- [ ] **Mobile App** - React Native companion app

---

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for information on how to add changelog entries.

---

## Release Checklist

- [ ] Update version in `package.json`
- [ ] Update version in `biogpt_server.py`
- [ ] Update README.md badges
- [ ] Run full test suite
- [ ] Update CHANGELOG.md
- [ ] Create GitHub release
- [ ] Deploy to production
- [ ] Announce on social media

---

*For a complete list of changes, see the [GitHub commit history](https://github.com/yourusername/medical-research-intelligence/commits/main).*
