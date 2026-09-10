import { tavily, TavilyClient } from '@tavily/core';

let tavilyClientInstance: TavilyClient | null = null;

export function getTavilyClient(): TavilyClient {
  const apiKey = (process.env.TAVILY_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not configured in server environment');
  }

  if (!tavilyClientInstance) {
    tavilyClientInstance = tavily({ apiKey });
  }

  return tavilyClientInstance;
}
