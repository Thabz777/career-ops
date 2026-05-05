import { tool } from '@langchain/core/tools';
import { z } from 'zod';

async function braveSearch(query) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': process.env.BRAVE_API_KEY,
    },
  });
  if (!res.ok) throw new Error(`Brave Search HTTP ${res.status}`);
  const data = await res.json();
  return (data.web?.results ?? []).slice(0, 5).map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.description,
  }));
}

function stubSearch(query) {
  return [
    {
      title: `Result for "${query}"`,
      url: 'https://example.com',
      snippet: 'Stub result — add BRAVE_API_KEY to .env for real web search.',
    },
  ];
}

export const webSearchTool = tool(
  async ({ query }) => {
    const results = process.env.BRAVE_API_KEY
      ? await braveSearch(query)
      : stubSearch(query);
    return JSON.stringify(results, null, 2);
  },
  {
    name: 'web_search',
    description: 'Search the web for current information on any topic.',
    schema: z.object({
      query: z.string().describe('Search query'),
    }),
  }
);
