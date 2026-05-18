# 🔬 Medical Research Intelligence Platform

<p align="center">
  <img src="https://img.shields.io/badge/version-3.0.0-blue.svg?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square" alt="Node.js">
  <img src="https://img.shields.io/badge/python-3.8%2B-blue.svg?style=flat-square" alt="Python">
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#api-documentation">API</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## 🚀 Overview

The **Medical Research Intelligence Platform** is an advanced, AI-powered research tool designed for healthcare professionals, researchers, and medical students. It combines multi-source academic search with state-of-the-art AI analysis to accelerate literature review and evidence-based decision making.

> **"Transforming how medical professionals discover, analyze, and synthesize research."**

## ✨ Features

### 🔍 Multi-Source Intelligence Search

- **PubMed Integration** - Direct access to 35+ million biomedical articles
- **Semantic Scholar** - AI-powered academic search with citation contexts
- **Cross-Ref & CORE** - Comprehensive coverage of open-access literature
- **Smart Query Parsing** - Natural language to structured search conversion

### 🤖 AI-Powered Analysis

- **Mistral-7B Integration** - Local or API-based medical text analysis
- **BioGPT Support** - Biomedical-specific language understanding
- **Multiple Analysis Modes:**
  - 🔬 Comprehensive Analysis
  - ⚡ Quick Summary
  - 🎯 Critical Appraisal
  - 🧬 Biomedical Entity Extraction
  - 👨‍👩‍👧‍👦 Layperson Explanation

### 📊 Research Visualization

- **Research Timeline** - Chronological view of study evolution
- **Impact Scoring** - Advanced metrics for paper significance

### 🔄 Collaboration Tools

- **Smart Collections** - Organize research into shareable projects
- **Batch Analysis** - Process multiple papers simultaneously
- **Synthesis Reports** - Auto-generate systematic review drafts
- **Export Options** - PDF, JSON, and citation formats

### 🧠 Intelligent Features

- **Research Memory** - Persistent session history and notes
- **Agentic Search** - AI-driven multi-vector exploration
- **Smart Recommendations** - ML-powered paper suggestions
- **Comparative Analysis** - Side-by-side paper comparison

## 📸 Screenshots

<p align="center">
  <img src="./docs/screenshots/dashboard.png" alt="Dashboard" width="800">
  <br>
  <em>Main Dashboard with Multi-Source Search</em>
</p>

<p align="center">
  <img src="./docs/screenshots/ai-analysis.png" alt="AI Analysis" width="800">
  <br>
  <em>AI-Powered Research Analysis</em>
</p>

<p align="center">
  <img src="./docs/screenshots/citation-network.png" alt="Citation Network" width="800">
  <br>
  <em>Interactive Citation Network Visualization</em>
</p>

## 🛠️ Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js">
  <img src="https://img.shields.io/badge/D3.js-F9A03C?style=for-the-badge&logo=d3.js&logoColor=white" alt="D3.js">
  <img src="https://img.shields.io/badge/Hugging_Face-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black" alt="Hugging Face">
</p>

## 📦 Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **Python** >= 3.8 (optional - for local AI server)
- **npm** or **yarn**

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/medical-research-intelligence.git
cd medical-research-intelligence

# Install dependencies
npm install

# Start API + frontend in development
npm run dev

# Open in browser
http://localhost:5173
```

For production-style API only, run `npm start` and use port `3002`.

### Production Deployment

See [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) for complete pre-launch verification and deployment steps.

### Detailed Setup

#### 1. Node.js API Server (Recommended)

```bash
npm install
npm run dev
```

The API server runs on `http://localhost:3002` and handles:

- Multi-source search endpoints
- AI analysis endpoints (`/api/ai/*`)
- Rate limiting (30 req/min)
- Response caching

#### 2. Local Python AI Server (Optional - Best Performance)

```bash
pip install -r requirements.txt
python biogpt_server.py
```

Runs Mistral-7B locally for:

- Zero API costs
- Faster inference
- Full privacy

#### 3. API Configuration

Add your API keys in the app settings (gear icon):

- **Hugging Face**: Get token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
- **OpenAI** (optional): For GPT-based analysis

## 🚀 Usage

### Entry Points

- **Default (modern UI):** `index.html` (or `/` in production)
- **Status:** Legacy fallback entry points have been retired in Phase 4.

### Basic Search

1. Enter your research query in natural language
2. Select data sources (PubMed, Semantic Scholar, etc.)
3. Adjust specificity level (broad → moderate → narrow)
4. Click Search or press Enter

### AI Analysis

1. Click the **AI Analysis** button on any article
2. Select analysis type:
   - **Comprehensive** - Full research breakdown
   - **Quick** - Brief summary
   - **Critical** - Study quality assessment
   - **Biomedical** - Entity extraction
   - **Layperson** - Patient-friendly explanation

### Citation Network

1. Select an article with citations
2. Click **View Citation Network**
3. Explore paper relationships interactively
4. Identify key papers and research clusters

### Collections & Collaboration

1. Save articles to collections
2. Add notes and tags
3. Export collections as PDF reports
4. Share with colleagues

## 📚 API Documentation

Comprehensive API documentation is available at:

📖 **[API Documentation](./docs/API.md)**

Key endpoints:

- `POST /api/ai/analyze` - AI text analysis
- `POST /api/ai/explain` - Patient-friendly explanation
- `POST /api/quiz/generate` - Quiz generation from topic/articles
- `GET /health` - Health check
- `GET /api/admin/readiness` - Admin readiness snapshot for SMTP/vector/paywall config

### Premium Feature Gating (Optional)

You can enable a lightweight paywall around premium endpoints with environment flags:

- `PAYWALL_ENABLED=true`
- `PAYWALL_ALLOW_IN_DEV=false` (recommended for staging QA)
- `PAYWALL_ALLOWED_ROLES=admin,researcher,pro,enterprise`

Premium-gated endpoints:

- `POST /api/guidelines/align`
- `POST /api/cases/analyze`
- `GET /api/reviews/:id/export.csv`

### Strict Production Readiness Flags

To fail-fast in production when critical premium infra is missing:

- `REQUIRE_SMTP=true` requires `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `APP_URL`
- `REQUIRE_VECTOR_SEARCH=true` requires `PG_VECTOR_URL` or `VECTOR_DATABASE_URL`

## 🗺️ Roadmap

- Legacy surface retirement plan: [LEGACY_DEPRECATION_PLAN.md](./LEGACY_DEPRECATION_PLAN.md)
- Phase 3 parity checklist: [PHASE3_PARITY_CHECKLIST.md](./PHASE3_PARITY_CHECKLIST.md)
- Phase 4 removal execution plan: [PHASE4_REMOVAL_PLAN.md](./PHASE4_REMOVAL_PLAN.md)
- [x] Multi-source search integration
- [x] AI-powered analysis (Mistral-7B, BioGPT)
- [x] Citation network visualization
- [x] Smart collections
- [x] Batch processing
- [x] Research memory & timeline
- [ ] PDF full-text extraction
- [ ] Collaborative annotations
- [ ] Mobile app (React Native)
- [ ] Browser extension
- [ ] Institutional SSO integration

## 🚨 Security Notice

**IMPORTANT:** If you pulled this code before **March 9, 2026**, you need to:

1. **Rotate your API keys immediately** - Old keys may have been exposed
2. **Update your installation** - Hardcoded API keys have been removed
3. **Configure your keys** - Add them to `.env` or the Settings modal

See [SECURITY_FIXES.md](./SECURITY_FIXES.md) for full details.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone
git clone https://github.com/yourusername/medical-research-intelligence.git

# Install dev dependencies
npm install

# Run tests
npm test

# Start dev server with hot reload
npm run dev
```

### Code Style

- **JavaScript**: ESLint + Prettier
- **Python**: Black + isort
- **Commits**: Conventional commits format

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **Hugging Face** for the Inference API and model hosting
- **NCBI** for PubMed E-utilities
- **Semantic Scholar** for academic graph data
- **Mistral AI** for the incredible Mistral-7B model

## 📧 Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/medical-research-intelligence/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/medical-research-intelligence/discussions)
- **Email**: <contact@medicalresearch.app>

---

<p align="center">
  Made with ❤️ for the medical research community
  <br>
  ⭐ Star us on GitHub if you find this useful!
</p>
