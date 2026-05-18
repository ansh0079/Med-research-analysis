# Citation Network Visualization Feature

This document describes the citation network visualization feature for the Medical Research Analysis platform.

## Overview

The citation network feature provides interactive visualization of academic paper citation relationships, enabling researchers to:

- Visualize citation graphs with D3.js
- Explore paper relationships (citations and references)
- Calculate citation metrics (h-index, impact scores)
- Find paths between papers
- Filter networks by year, citations, and more

## Components

### 1. Service Layer (`src/services/citationNetwork.ts`)

Core service for building and analyzing citation graphs:

```typescript
// Build citation network
const builder = new CitationNetworkBuilder();
builder.addArticles(articles);
const network = builder.buildNetwork(articleId, { depth: 2, maxNodes: 100 });

// Get citations/references
const citations = builder.getCitations(articleId);
const references = builder.getReferences(articleId);

// Calculate metrics
const metrics = builder.calculateMetrics();

// Find paths
const path = builder.findShortestPath(fromId, toId);
```

**Key Classes & Types:**
- `CitationNetworkBuilder` - Main builder class
- `CitationNetworkAPI` - API client for server communication
- `CitationNode`, `CitationLink` - Graph data structures
- `CitationMetrics` - Metrics data structure

### 2. CitationGraph Component (`src/components/citations/CitationGraph.tsx`)

Interactive D3.js visualization component:

```tsx
import { CitationGraph } from '@components/citations';

<CitationGraph
  network={network}
  width={800}
  height={600}
  onNodeClick={(article) => console.log(article)}
  highlightedPath={['id1', 'id2', 'id3']}
  filters={{ minYear: 2020, minCitations: 10 }}
/>
```

**Features:**
- Force-directed graph layout
- Zoom and pan controls
- Node size based on citation count
- Color coding by impact level
- Highlight paths between papers
- Interactive node selection
- Physics controls (link distance, repulsion)

### 3. CitationMetricsPanel Component (`src/components/citations/CitationMetrics.tsx`)

Metrics display panel with comprehensive statistics:

```tsx
import { CitationMetricsPanel } from '@components/citations';

<CitationMetricsPanel
  metrics={metrics}
  network={network}
  networkStats={stats}
  article={selectedArticle}
  loading={false}
/>
```

**Metrics Displayed:**
- h-index
- Total/average/max citations
- Citation velocity (per year)
- Influential papers count (10+ citations)
- Network density and clustering
- Publication year distribution
- Top journals
- Most cited papers

### 4. CitationNetworkPage Component (`src/components/citations/CitationNetworkPage.tsx`)

Full-page citation network explorer:

```tsx
import { CitationNetworkPage } from '@components/citations';

<CitationNetworkPage
  article={currentArticle}
  onClose={() => setShowNetwork(false)}
  onArticleClick={(article) => navigateToArticle(article)}
/>
```

**Features:**
- Tabbed interface (Graph, Citations, References)
- Filter panel for year and citation range
- Depth selector (1-3 levels)
- Sticky metrics sidebar
- Responsive layout

### 5. useCitationNetwork Hook (`src/hooks/useCitationNetwork.ts`)

React hook for citation network operations:

```tsx
import { useCitationNetwork } from '@hooks/useCitationNetwork';

const {
  network,
  metrics,
  loading,
  error,
  fetchNetwork,
  fetchMetrics,
  filters,
  setFilters,
  findPath
} = useCitationNetwork();

// Fetch data
useEffect(() => {
  fetchNetwork(articleId, { depth: 2 });
  fetchMetrics(articleId);
}, [articleId]);
```

## API Endpoints

### GET /api/articles/:id/citations
Get papers citing this article.

**Response:**
```json
{
  "citations": [/* Article array */],
  "count": 42
}
```

### GET /api/articles/:id/references
Get papers this article cites.

**Response:**
```json
{
  "references": [/* Article array */],
  "count": 25
}
```

### GET /api/articles/:id/citation-network
Get full network data.

**Query Parameters:**
- `depth` - Search depth (1-3, default: 2)
- `maxNodes` - Maximum nodes to return (default: 100)

**Response:**
```json
{
  "network": {
    "nodes": [/* CitationNode array */],
    "links": [/* CitationLink array */],
    "centralNodeId": "..."
  },
  "nodeCount": 50,
  "linkCount": 120
}
```

### GET /api/articles/:id/metrics
Get citation metrics.

**Response:**
```json
{
  "metrics": {
    "hIndex": 15,
    "totalCitations": 1250,
    "averageCitations": 25.5,
    "maxCitations": 150,
    "paperCount": 49,
    "citationVelocity": 45.2,
    "influentialCitations": 12,
    "coCitationCount": 85
  }
}
```

### GET /api/articles/path
Find shortest path between two papers.

**Query Parameters:**
- `from` - Source article ID
- `to` - Target article ID

**Response:**
```json
{
  "path": {
    "path": [/* CitationNode array */],
    "distance": 3,
    "pathLength": 4
  }
}
```

## Data Sources

The citation network uses **Semantic Scholar API** as the primary data source for:
- Citation relationships
- Paper metadata
- Author information
- Citation counts

Alternative IDs (PMID, DOI) are automatically handled with fallback logic.

## Filtering Options

Networks can be filtered by:

```typescript
interface FilterOptions {
  minYear?: number;           // Minimum publication year
  maxYear?: number;           // Maximum publication year
  minCitations?: number;      // Minimum citation count
  maxCitations?: number;      // Maximum citation count
  journalFilter?: string[];   // Journal name patterns
  authorFilter?: string[];    // Author name patterns
}
```

## Algorithm Details

### Network Building (BFS)
1. Start from central paper
2. Fetch citations (papers citing this)
3. Fetch references (papers this cites)
4. Repeat for specified depth
5. Limit to maxNodes to prevent overload

### Shortest Path (BFS)
1. Build adjacency list from network
2. Standard BFS from source
3. Track parent pointers
4. Reconstruct path when target found

### Metrics Calculation
- **h-index**: Largest number h such that h papers have at least h citations each
- **Citation velocity**: Total citations / years since publication
- **Influential papers**: Papers with 10+ citations
- **Network density**: Actual links / possible links

## Styling

Components use Tailwind CSS classes with dark mode support:
- Light theme: `bg-white`, `text-gray-900`
- Dark theme: `dark:bg-slate-800`, `dark:text-white`

Custom styles in `CitationGraph.css` for D3-specific elements.

## Performance Considerations

1. **Caching**: API responses cached for 10 minutes
2. **Pagination**: Limited connections per node (15-20)
3. **Depth limiting**: Maximum depth of 3 levels
4. **Node limiting**: Maximum 200 nodes in network
5. **Lazy loading**: Network built on-demand

## Dependencies

```json
{
  "d3": "^7.8.5"
}
```

## Usage Example

```tsx
import React, { useState } from 'react';
import { CitationNetworkPage } from '@components/citations';
import type { Article } from '@types';

const ArticleDetail: React.FC<{ article: Article }> = ({ article }) => {
  const [showNetwork, setShowNetwork] = useState(false);

  return (
    <div>
      <button onClick={() => setShowNetwork(true)}>
        View Citation Network
      </button>
      
      {showNetwork && (
        <CitationNetworkPage
          article={article}
          onClose={() => setShowNetwork(false)}
        />
      )}
    </div>
  );
};
```

## Future Enhancements

- [ ] Temporal animation of citation growth
- [ ] Community detection algorithms
- [ ] Co-authorship network overlay
- [ ] Export to GEXF/GraphML formats
- [ ] Saved network views
- [ ] Collaborative annotations
