const { buildProxyService } = require('../../server/services/externalApiProxy');

describe('externalApiProxy', () => {
  let mockFetch;
  let proxy;

  beforeEach(() => {
    mockFetch = jest.fn();
    proxy = buildProxyService({
      serverConfig: {
        keys: {
          ncbi: 'test-ncbi-key',
          ncbiEmail: 'test@example.com',
          semantic: 'test-semantic-key',
          openalex: 'test-openalex-key',
          anthropic: 'test-anthropic-key',
          mistral: 'test-mistral-key',
          gemini: 'test-gemini-key',
          huggingface: 'test-hf-key',
        },
      },
      fetchImpl: mockFetch,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pubmedSearch', () => {
    test('parses esearch + esummary into normalized articles', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            esearchresult: { idlist: ['12345', '67890'] },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              12345: {
                title: 'Test Article One',
                authors: [{ name: 'Smith J' }],
                pubdate: '2023',
                source: 'Test Journal',
                articleids: [
                  { idtype: 'pmc', value: 'PMC12345' },
                  { idtype: 'doi', value: '10.1234/test' },
                ],
                pmcrefcount: 42,
                pubtype: ['Journal Article'],
              },
              67890: {
                title: 'Test Article Two',
                authors: [{ name: 'Doe A' }],
                pubdate: '2022',
                source: 'Another Journal',
                articleids: [{ idtype: 'doi', value: '10.5678/other' }],
                pmcrefcount: 7,
                pubtype: ['Review'],
              },
              // uids key
              uids: ['12345', '67890'],
            },
          }),
        });

      const articles = await proxy.pubmedSearch('diabetes therapy', { maxResults: 10 });
      expect(articles).toHaveLength(2);
      expect(articles[0]).toMatchObject({
        uid: 'pubmed-12345',
        title: 'Test Article One',
        pmid: '12345',
        pmcid: 'PMC12345',
        isFree: true,
        doi: '10.1234/test',
        _source: 'pubmed',
      });
      expect(articles[1]).toMatchObject({
        uid: 'pubmed-67890',
        title: 'Test Article Two',
        pmid: '67890',
        pmcid: null,
        isFree: false,
        doi: '10.5678/other',
        _source: 'pubmed',
      });
    });

    test('returns empty array when PubMed has no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          esearchresult: { idlist: [] },
        }),
      });

      const articles = await proxy.pubmedSearch('xyznonexistent', { maxResults: 10 });
      expect(articles).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('includes api_key and email in PubMed URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ esearchresult: { idlist: [] } }),
      });

      await proxy.pubmedSearch('query', { maxResults: 5 });
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('api_key=test-ncbi-key');
      expect(url).toContain('email=test%40example.com');
    });
  });

  describe('meshSuggest', () => {
    test('returns parsed suggestions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { label: 'Diabetes Mellitus', resource: 'http://id.nlm.nih.gov/mesh/D003922' },
          { label: 'Diabetes Mellitus, Type 2', resource: 'http://id.nlm.nih.gov/mesh/D003924' },
        ],
      });

      const suggestions = await proxy.meshSuggest('diabetes');
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toEqual({
        label: 'Diabetes Mellitus',
        resource: 'http://id.nlm.nih.gov/mesh/D003922',
        note: '',
      });
    });

    test('returns empty array on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      const suggestions = await proxy.meshSuggest('diabetes');
      expect(suggestions).toEqual([]);
    });
  });

  describe('semanticScholarSearch', () => {
    test('maps Semantic Scholar response to article shape', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              paperId: 'abc123',
              title: 'Semantic Paper',
              authors: [{ name: 'Alice' }],
              year: 2024,
              citationCount: 99,
              abstract: 'An abstract.',
              journal: { name: 'Nature' },
              openAccessPdf: { url: 'https://pdf.example.com' },
              publicationTypes: ['JournalArticle'],
              externalIds: { DOI: '10.1000/abc' },
            },
          ],
        }),
      });

      const articles = await proxy.semanticScholarSearch('query', { limit: 5 });
      expect(articles).toHaveLength(1);
      expect(articles[0]).toMatchObject({
        uid: 'abc123',
        title: 'Semantic Paper',
        isFree: true,
        fullTextUrl: 'https://pdf.example.com',
        doi: '10.1000/abc',
        _source: 'semantic',
      });
    });
  });

  describe('claudeMessages', () => {
    test('returns text from Anthropic response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'Hello from Claude' }],
        }),
      });

      const text = await proxy.claudeMessages('prompt');
      expect(text).toBe('Hello from Claude');
      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['x-api-key']).toBe('test-anthropic-key');
    });

    test('throws when API key is missing', async () => {
      const noKeyProxy = buildProxyService({ serverConfig: { keys: {} }, fetchImpl: mockFetch });
      await expect(noKeyProxy.claudeMessages('prompt')).rejects.toThrow('Anthropic API key not configured');
    });
  });

  describe('geminiGenerate', () => {
    test('returns generated text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Gemini says hi' }] } }],
        }),
      });

      const text = await proxy.geminiGenerate('prompt');
      expect(text).toBe('Gemini says hi');
    });

    test('throws on content block', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          promptFeedback: { blockReason: 'SAFETY' },
        }),
      });

      await expect(proxy.geminiGenerate('prompt')).rejects.toThrow('Content blocked: SAFETY');
    });
  });
});
