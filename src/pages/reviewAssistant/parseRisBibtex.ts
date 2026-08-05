import type { Article } from '@types';

export function parseRisBibtex(text: string): Article[] {
  const blocks = text.split(/\n\s*\n|(?=TY\s+-\s+)|(?=@\w+\s*{)/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    const title = block.match(/(?:TI|T1)\s+-\s+(.+)/i)?.[1] || block.match(/title\s*=\s*[{"']([^}"']+)/i)?.[1] || `Imported article ${i + 1}`;
    const doi = block.match(/DO\s+-\s+(.+)/i)?.[1] || block.match(/doi\s*=\s*[{"']([^}"']+)/i)?.[1];
    const yearText = block.match(/(?:PY|Y1)\s+-\s+(\d{4})/i)?.[1] || block.match(/year\s*=\s*[{"']?(\d{4})/i)?.[1];
    const journal = block.match(/(?:JO|JF|T2)\s+-\s+(.+)/i)?.[1] || block.match(/journal\s*=\s*[{"']([^}"']+)/i)?.[1];
    return { uid: doi ? `doi:${doi}` : `imported:${Date.now()}:${i}`, title, doi, year: yearText ? Number(yearText) : undefined, journal, _source: 'semantic' } as Article;
  });
}
