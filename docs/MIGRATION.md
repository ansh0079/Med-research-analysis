# 🔄 Migration Guide: v1.0 → v2.0

## Overview

This guide helps you migrate from the monolithic v1.0 architecture to the modular v2.0 architecture while maintaining functionality.

---

## Phase 1: Immediate Actions (Do Now)

### 1. Secure Your API Keys

```bash
# 1. Copy the example env file
cp .env.example .env

# 2. Edit .env and add your keys
# Do NOT commit .env to git!
```

**Before (INSECURE - services.js):**
```javascript
// ❌ NEVER do this
const defaults = {
    semantic: 'XLQ18jCdCB7YcO7WiHjsV4cPctrUTbVC9uITadCi',  // HARDCODED!
    huggingface: 'hf_...',
};
```

**After (SECURE - .env):**
```bash
# ✅ Safe in .env
HUGGINGFACE_TOKEN=your_token_here
SEMANTIC_SCHOLAR_KEY=your_key_here
```

### 2. Switch to New Server

**Before:**
```bash
node proxy-server.js  # Old server
```

**After:**
```bash
npm start  # New unified server (runs server.js)
```

### 3. Update Frontend API Calls

**Before (Direct API calls with keys):**
```javascript
// Old way - in services.js
const response = await fetch('https://api.semanticscholar.org/...', {
    headers: { 'x-api-key': 'HARDCODED_KEY' }
});
```

**After (Through secure proxy):**
```javascript
// New way - in your components
import { api } from './api';

const { articles } = await api.searchSemanticScholar(query);
```

---

## Phase 2: Component Migration

### Breaking Down legacy component monolith (7,100 lines -> manageable modules)

**Historical Structure (retired):**
```
scripts/components.js (7,100 lines, now removed)
  ├─ TimelineChart
  ├─ JournalChart
  ├─ CitationChart
  ├─ TopicChart
  ├─ ResearchVisualization
  ├─ AIAnalysisPanel (1,000+ lines)
  ├─ BatchAnalysisPanel
  ├─ MistralAnalysisPanel (1,000+ lines)
  ├─ MedGemmaAnalysisPanel
  ├─ ComparativeAnalysis
  ├─ ... 20+ more components
```

**Target Structure:**
```
src/components/
├── charts/
│   ├── TimelineChart.tsx
│   ├── JournalChart.tsx
│   ├── CitationChart.tsx
│   └── index.ts
├── analysis/
│   ├── AnalysisPanel/
│   │   ├── index.tsx
│   │   ├── AnalysisTabs.tsx
│   │   ├── AnalysisResults.tsx
│   │   └── hooks.ts
│   ├── MistralPanel/
│   └── ComparativePanel/
├── search/
│   ├── SearchBar.tsx
│   ├── ResultsList.tsx
│   └── ArticleCard.tsx
├── ui/
│   ├── Modal.tsx
│   ├── Button.tsx
│   ├── Toast.tsx
│   └── Skeleton.tsx
└── layout/
    ├── Header.tsx
    └── Footer.tsx
```

### Migration Example: AIAnalysisPanel

**Step 1: Extract the component**
```typescript
// src/components/analysis/AIAnalysisPanel/index.tsx
import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { AnalysisTabs } from './AnalysisTabs';
import { AnalysisResults } from './AnalysisResults';
import type { Article, AnalysisType, AnalysisResult } from '../../../types';

interface AIAnalysisPanelProps {
    article: Article | null;
    isOpen: boolean;
    onClose: () => void;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
    article,
    isOpen,
    onClose
}) => {
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('summary');

    useEffect(() => {
        if (isOpen && article) {
            performAnalysis();
        }
    }, [isOpen, article]);

    const performAnalysis = async () => {
        if (!article) return;
        
        setLoading(true);
        try {
            const result = await api.analyzeWithAI(
                `${article.title}\n${article.abstract}`,
                'comprehensive'
            );
            setAnalysis(result);
        } catch (error) {
            console.error('Analysis failed:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !article) return null;

    return (
        <Modal onClose={onClose} title="AI Analysis">
            <AnalysisTabs activeTab={activeTab} onChange={setActiveTab} />
            <AnalysisResults 
                analysis={analysis} 
                loading={loading}
                activeTab={activeTab}
            />
        </Modal>
    );
};
```

**Step 2: Create types**
```typescript
// src/types/index.ts
export interface Article {
    uid: string;
    title: string;
    abstract?: string;
    authors?: Array<{ name: string }>;
    pubdate?: string;
    source?: string;
    pmcrefcount?: number;
    doi?: string;
    _source: 'pubmed' | 'semantic' | 'openalex' | 'crossref';
    _impact?: ImpactScore;
}

export interface ImpactScore {
    score: number;
    level: 'high' | 'medium' | 'low';
    factors: string[];
}

export type AnalysisType = 'quick' | 'comprehensive' | 'critical' | 'biomedical' | 'layperson';

export interface AnalysisResult {
    summary: string;
    keyPoints: string[];
    confidenceScore: number;
    studyType: string;
    // ... other fields
}
```

---

## Phase 3: State Management Migration

**Before (Global window objects):**
```javascript
// In services.js
window.dataSourceManager = new DataSourceManager();
window.coreConfig = new CoreConfig();

// In components
const data = await window.dataSourceManager.unifiedSearch(query);
```

**After (React Context):**
```typescript
// src/contexts/SearchContext.tsx
import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../services/api';
import type { Article, SearchFilters } from '../types';

interface SearchContextType {
    results: Article[];
    loading: boolean;
    error: Error | null;
    search: (query: string, filters?: SearchFilters) => Promise<void>;
    clearResults: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC = ({ children }) => {
    const [results, setResults] = useState<Article[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const search = useCallback(async (query: string, filters?: SearchFilters) => {
        setLoading(true);
        setError(null);
        try {
            const { articles } = await api.unifiedSearch(query, filters?.sources);
            setResults(articles);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Search failed'));
        } finally {
            setLoading(false);
        }
    }, []);

    return (
        <SearchContext.Provider value={{ results, loading, error, search, clearResults }}>
            {children}
        </SearchContext.Provider>
    );
};

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) throw new Error('useSearch must be used within SearchProvider');
    return context;
};
```

**Usage in components:**
```typescript
// In any component
const { results, loading, search } = useSearch();

// Search
await search('diabetes treatment', { sources: ['pubmed'] });
```

---

## Phase 4: Testing Strategy

### Unit Tests
```typescript
// src/services/__tests__/api.test.ts
import { api } from '../api';

describe('MedicalResearchAPI', () => {
    beforeEach(() => {
        api.clearCache();
    });

    test('searches PubMed successfully', async () => {
        const result = await api.searchPubMed('diabetes', { max: 10 });
        expect(result.articles).toBeDefined();
        expect(result.articles.length).toBeLessThanOrEqual(10);
    });

    test('caches results', async () => {
        const spy = jest.spyOn(global, 'fetch');
        
        await api.searchPubMed('cancer');
        await api.searchPubMed('cancer'); // Should use cache
        
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
```

### Component Tests
```typescript
// src/components/analysis/__tests__/AIAnalysisPanel.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { AIAnalysisPanel } from '../AIAnalysisPanel';

const mockArticle = {
    uid: '123',
    title: 'Test Article',
    abstract: 'Test abstract'
};

test('performs analysis on open', async () => {
    render(<AIAnalysisPanel article={mockArticle} isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
    
    await waitFor(() => {
        expect(screen.getByText(/summary/i)).toBeInTheDocument();
    });
});
```

---

## Migration Checklist

### Week 1: Security & Foundation
- [ ] All API keys moved to `.env`
- [ ] New server running on port 3002
- [ ] Old `proxy-server.js` deprecated
- [ ] API client integrated

### Week 2: Component Extraction
- [ ] Chart components extracted
- [ ] Analysis panels modularized
- [ ] UI components created
- [ ] No component file >500 lines

### Week 3: Type Safety
- [ ] TypeScript configured
- [ ] Core types defined
- [ ] Props typed
- [ ] API responses typed

### Week 4: Testing
- [ ] Unit tests for utilities
- [ ] API service tests
- [ ] Component tests for critical paths
- [ ] E2E tests for search flow

---

## Troubleshooting

### Issue: "API keys not working"
**Solution:** Check that `.env` exists and server was restarted after changes.

### Issue: "Module not found"
**Solution:** Ensure imports use correct relative paths. Use `@/` alias:
```json
// tsconfig.json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"]
        }
    }
}
```

### Issue: "Types not recognized"
**Solution:** Restart TypeScript service in IDE. Check `tsconfig.json` includes:
```json
{
    "include": ["src/**/*"]
}
```
