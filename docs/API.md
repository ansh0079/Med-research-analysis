# 📚 API Documentation

> Complete reference for the Medical Research Intelligence Platform API

---

## Base URLs

| Environment | URL | Description |
|-------------|-----|-------------|
| **Proxy Server** | `http://localhost:3002` | Node.js proxy with caching |
| **Local AI** | `http://localhost:8000` | Python FastAPI server |
| **Static App** | `file://` or `http://localhost` | Frontend application |

---

## Authentication

### API Keys (Server-Side Only)

All third-party API keys are configured server-side via environment variables. The browser **never** sends API keys in request bodies.

| Provider | Environment Variable | Get Key |
|----------|---------------------|---------|
| **Hugging Face** | `HUGGINGFACE_TOKEN` | [settings/tokens](https://huggingface.co/settings/tokens) |
| **Mistral** | `MISTRAL_API_KEY` | [console.mistral.ai](https://console.mistral.ai) |
| **Gemini** | `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) |
| **OpenAI** | `OPENAI_KEY` | [platform.openai.com](https://platform.openai.com) |

### Admin Endpoints

Admin endpoints require an `x-admin-token` header:

```bash
curl -X GET "http://localhost:3002/api/admin/stats" \
  -H "x-admin-token: $ADMIN_TOKEN"
```

Set via environment variable:
```bash
export ADMIN_TOKEN="your-secret-admin-token"
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All `/api/*` | 30 requests | 60 seconds |
| Health check | Unlimited | - |
| Static files | Unlimited | - |

**Rate Limit Response:**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please wait 45 seconds before trying again.",
  "retryAfter": 45
}
```

---

## Active Endpoints

> **Note:** The following endpoints have been removed or consolidated:
> - `POST /api/biogpt` → Use `POST /api/ai/analyze`
> - `POST /api/summarize` → Use `POST /api/ai/analyze`
> - `POST /api/extract-key-findings` → Use `POST /api/ai/analyze`
> - `POST /api/generate-highlights` → Use `POST /api/ai/analyze`

### Health Check

#### GET `/health`

Check server status and capabilities.

**Request:**
```bash
curl http://localhost:3002/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "BioGPT Proxy Server is running",
  "features": ["biogpt", "summarize", "key-findings"],
  "cacheStats": {
    "hits": 150,
    "misses": 45,
    "keys": 45
  },
  "rateLimit": {
    "maxRequests": 30,
    "windowMs": 60000
  }
}
```

---

### Unified search (recommended)

#### GET `/api/search`

Multi-source literature search with **Reciprocal Rank Fusion (RRF)** and **EBM-weighted** ordering server-side. The SPA uses this endpoint via `api.search()`; prefer it over calling individual source routes in parallel.

**Query parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `q` or `query` | Yes | Search string (validated/sanitized server-side) |
| `sources` | No | Comma-separated: `pubmed`, `semantic`, `openalex` (default `pubmed`) |
| `limit` | No | Max results, 1–100 (default 20) |
| `vector` | No | Set `vector=1` to fuse **pgvector** hits as an extra ranked list when the DB is configured |

**Response** (stable object shape):

```json
{
  "articles": [ { "...": "Article" } ],
  "count": 20,
  "sources": ["pubmed", "semantic"]
}
```

Result order must be preserved client-side; do not re-sort by sparse fields such as `_impact?.score`.

---

### AI Analysis

#### POST `/api/ai/analyze`

Send text to AI model for analysis.

**Request:**
```bash
curl -X POST http://localhost:3002/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Analyze this medical abstract: [abstract text]",
    "analysisType": "quick",
    "provider": "auto"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Input text for analysis |
| `analysisType` | string | No | `quick`, `comprehensive`, `critical`, `layperson`, `methodology` |
| `provider` | string | No | `auto`, `gemini`, or `mistral` |
| `model` | string | No | Provider-specific model |

**Parameters Object:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `max_new_tokens` | integer | 256 | Maximum tokens to generate |
| `temperature` | float | 0.7 | Sampling temperature (0-1) |
| `do_sample` | boolean | true | Use sampling vs greedy |
| `top_p` | float | 0.9 | Nucleus sampling |

**Response:**
```json
{
  "result": "Based on the abstract, this study demonstrates...",
  "model": "gemini-2.5-flash-lite",
  "provider": "gemini",
  "type": "quick",
  "timestamp": "2026-02-14T09:30:00.000Z"
}
```

**Error Response:**
```json
{
  "error": "API key is required",
  "status": 400
}
```

---

### Summarization

#### POST `/api/summarize`

Generate an AI summary of a medical article.

**Request:**
```bash
curl -X POST http://localhost:3002/api/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "article": {
      "title": "Metformin for Weight Loss in Type 2 Diabetes",
      "abstract": "Background: Metformin... Methods: RCT... Results:...",
      "authors": ["Smith J", "Doe A"],
      "journal": "Diabetes Care",
      "year": 2024
    },
    "style": "executive",
    "apiConfig": {
      "apiProvider": "huggingface",
      "apiKey": "<your-huggingface-api-key>",
      "model": "mistralai/Mistral-7B-Instruct-v0.2"
    },
    "includeKeyFindings": true,
    "includeHighlights": true
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `article` | object | Yes | Article data |
| `article.title` | string | Yes | Article title |
| `article.abstract` | string | Yes | Article abstract |
| `article.authors` | array | No | List of authors |
| `article.journal` | string | No | Journal name |
| `article.year` | integer | No | Publication year |
| `article.fullText` | string | No | Full text (truncated) |
| `style` | string | Yes | `executive`, `technical`, or `layperson` |
| `apiConfig` | object | Yes | API configuration |
| `apiConfig.apiProvider` | string | Yes | `huggingface` or `openai` |
| `apiConfig.apiKey` | string | Yes | API key |
| `apiConfig.model` | string | No | Model ID |
| `includeKeyFindings` | boolean | No | Include extracted findings |
| `includeHighlights` | boolean | No | Include bullet highlights |

**Response:**
```json
{
  "summary": "This randomized controlled trial examined...",
  "style": "executive",
  "keyFindings": [
    "Metformin reduced HbA1c by 1.2% (p<0.001)",
    "Average weight loss was 3.5kg over 6 months",
    "GI side effects occurred in 15% of patients"
  ],
  "highlights": [
    "Double-blind RCT with 500 participants",
    "Significant improvement in glycemic control",
    "Well-tolerated with manageable side effects"
  ],
  "confidence": 0.91,
  "timestamp": "2026-02-14T09:30:00.000Z",
  "model": "mistralai/Mistral-7B-Instruct-v0.2",
  "cached": false
}
```

---

### Key Findings Extraction

#### POST `/api/extract-key-findings`

Extract the most important findings from an abstract.

**Request:**
```bash
curl -X POST http://localhost:3002/api/extract-key-findings \
  -H "Content-Type: application/json" \
  -d '{
    "abstract": "Background: Type 2 diabetes... Methods: We conducted... Results: Metformin...",
    "apiConfig": {
      "apiProvider": "huggingface",
      "apiKey": "<your-huggingface-api-key>"
    }
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `abstract` | string | Yes | Article abstract (min 50 chars) |
| `apiConfig` | object | Yes | API configuration |
| `apiConfig.apiProvider` | string | Yes | Provider name |
| `apiConfig.apiKey` | string | Yes | API key |
| `apiConfig.model` | string | No | Model ID |

**Response:**
```json
{
  "findings": [
    "Metformin reduced HbA1c by 1.2% compared to placebo (p<0.001)",
    "Weight loss averaged 3.5kg over the 6-month study period",
    "Gastrointestinal side effects occurred in 15% of the treatment group",
    "No significant difference in hypoglycemic events between groups"
  ],
  "confidence": 0.89,
  "timestamp": "2026-02-14T09:30:00.000Z",
  "cached": false
}
```

---

### Highlights Generation

#### POST `/api/generate-highlights`

Generate bullet-point highlights from an article.

**Request:**
```bash
curl -X POST http://localhost:3002/api/generate-highlights \
  -H "Content-Type: application/json" \
  -d '{
    "article": {
      "title": "Metformin Study",
      "abstract": "Background... Methods... Results...",
      "authors": ["Smith J"],
      "journal": "Diabetes Care",
      "year": 2024
    },
    "apiConfig": {
      "apiProvider": "huggingface",
      "apiKey": "<your-huggingface-api-key>"
    }
  }'
```

**Response:**
```json
{
  "highlights": [
    "Large double-blind RCT with 500 participants",
    "Significant improvement in glycemic control with metformin",
    "Modest but clinically meaningful weight reduction observed",
    "Safety profile consistent with previous studies"
  ],
  "cached": false,
  "timestamp": "2026-02-14T09:30:00.000Z"
}
```

---

### Local AI Server (Python)

#### GET `/`

Health check for local AI server.

**Request:**
```bash
curl http://localhost:8000/
```

**Response:**
```json
{
  "status": "ok",
  "message": "Mistral-7B Local AI Server is running",
  "model": "mistralai/Mistral-7B-Instruct-v0.2",
  "model_status": "loaded",
  "device": "cuda",
  "transformers_available": true
}
```

#### GET `/health`

Detailed health status.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cuda",
  "transformers_available": true
}
```

#### POST `/analyze`

Analyze text with local Mistral-7B model.

**Request:**
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Summarize the treatment of type 2 diabetes with metformin",
    "model_type": "standard",
    "max_tokens": 256
  }'
```

**Request Body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | Yes | - | Input text |
| `model_type` | string | No | `standard` | Model variant |
| `max_tokens` | integer | No | 256 | Max output tokens |

**Response:**
```json
{
  "result": "Metformin is a first-line medication for type 2 diabetes...",
  "model": "mistralai/Mistral-7B-Instruct-v0.2",
  "tokens_used": 189
}
```

---

### Cache Management

#### DELETE `/api/cache/clear`

Clear the summary cache (admin only).

**Request:**
```bash
curl -X DELETE http://localhost:3002/api/cache/clear \
  -H "Content-Type: application/json" \
  -d '{
    "adminKey": "your-admin-key"
  }'
```

**Response:**
```json
{
  "message": "Cache cleared successfully"
}
```

#### GET `/api/cache/stats`

Get cache statistics (admin only).

**Request:**
```bash
curl "http://localhost:3002/api/cache/stats?adminKey=your-admin-key"
```

**Response:**
```json
{
  "stats": {
    "hits": 150,
    "misses": 45,
    "keys": 45
  },
  "keys": 45
}
```

---

## Error Handling

### Standard Error Format

```json
{
  "error": "Error type",
  "message": "Human-readable description"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| `200` | Success | Request completed |
| `400` | Bad Request | Missing required field |
| `401` | Unauthorized | Invalid admin key |
| `429` | Rate Limited | Too many requests |
| `500` | Server Error | AI service failure |
| `503` | Service Unavailable | Model not loaded |

### Common Errors

**Missing API Key:**
```json
{
  "error": "API key is required"
}
```

**Invalid Style:**
```json
{
  "error": "Invalid style. Must be: executive, technical, or layperson"
}
```

**Abstract Too Short:**
```json
{
  "error": "Abstract is required and must be at least 50 characters"
}
```

**Model Not Loaded:**
```json
{
  "error": "Failed to generate summary",
  "message": "Mistral-7B model not loaded"
}
```

---

## Caching

### Cache Behavior

- **TTL**: 1 hour (3600 seconds)
- **Key**: MD5 hash of request parameters
- **Scope**: Per-article, per-style, per-model

### Cache Headers

Responses include cache status:

```json
{
  "cached": true,
  "timestamp": "2026-02-14T09:30:00.000Z"
}
```

### Bypassing Cache

To force a fresh analysis, vary any parameter:

```json
{
  "parameters": {
    "temperature": 0.71  // Slightly different
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
class MedicalResearchAPI {
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  async summarize(article: Article, style: SummaryStyle): Promise<Summary> {
    const response = await fetch(`${this.baseURL}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article,
        style,
        apiConfig: {
          apiProvider: 'huggingface',
          apiKey: this.apiKey
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async extractKeyFindings(abstract: string): Promise<string[]> {
    const response = await fetch(`${this.baseURL}/api/extract-key-findings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        abstract,
        apiConfig: {
          apiProvider: 'huggingface',
          apiKey: this.apiKey
        }
      })
    });

    const data = await response.json();
    return data.findings;
  }
}
```

### Python

```python
import requests

class MedicalResearchAPI:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key

    def summarize(self, article: dict, style: str = "executive") -> dict:
        response = requests.post(
            f"{self.base_url}/api/summarize",
            json={
                "article": article,
                "style": style,
                "apiConfig": {
                    "apiProvider": "huggingface",
                    "apiKey": self.api_key
                }
            }
        )
        response.raise_for_status()
        return response.json()

    def extract_key_findings(self, abstract: str) -> list:
        response = requests.post(
            f"{self.base_url}/api/extract-key-findings",
            json={
                "abstract": abstract,
                "apiConfig": {
                    "apiProvider": "huggingface",
                    "apiKey": self.api_key
                }
            }
        )
        response.raise_for_status()
        return response.json()["findings"]

# Usage
api = MedicalResearchAPI("http://localhost:3002", "<your-huggingface-api-key>")

article = {
    "title": "Example Study",
    "abstract": "Background... Methods... Results...",
    "authors": ["Author A", "Author B"],
    "journal": "Journal Name",
    "year": 2024
}

summary = api.summarize(article, "executive")
print(summary["summary"])
```

### cURL Examples

**Quick Test:**
```bash
# Health check
curl http://localhost:3002/health

# Simple analysis
curl -X POST http://localhost:3002/api/biogpt \
  -H "Content-Type: application/json" \
  -d '{"model":"mistralai/Mistral-7B-Instruct-v0.2","prompt":"What is diabetes?","apiKey":"<your-huggingface-api-key>"}'
```

---

## Changelog

### v3.0.0 (Current)
- Added `/api/summarize` endpoint with multiple styles
- Added `/api/extract-key-findings` endpoint
- Added `/api/generate-highlights` endpoint
- Added caching layer with Redis-compatible interface
- Added rate limiting (30 req/min)
- Added OpenAI API support

### v2.0.0
- Initial `/api/biogpt` endpoint
- Hugging Face integration
- Basic proxy functionality

---

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/medical-research-intelligence/issues)
- **Documentation**: [Full Docs](./README.md)
- **API Status**: `http://localhost:3002/health`

---

*Last updated: February 2026*
