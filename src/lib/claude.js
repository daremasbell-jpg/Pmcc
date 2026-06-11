import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Parse JSON from Claude's response text robustly.
 * Handles preamble text, markdown fences, trailing commas.
 */
function parseJSON(text) {
  let raw = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in response');
  raw = raw.slice(start, end + 1);

  // Attempt 1: direct
  try { return JSON.parse(raw); } catch (_) {}
  // Attempt 2: strip trailing commas
  try { return JSON.parse(raw.replace(/,\s*([}\]])/g, '$1')); } catch (_) {}
  // Attempt 3: strip control chars + trailing commas
  const cleaned = raw.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(cleaned);
}

/**
 * Call Claude with web search, with automatic retry on rate limits.
 */
export async function callClaude(prompt, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(attempt * 8000);

    try {
      const response = await client.messages.create({
        model:      'claude-sonnet-4-5',
        max_tokens: 4000,
        system:     SYSTEM_PROMPT,
        tools:      [{ type: 'web_search_20250305', name: 'web_search' }],
        messages:   [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content?.find(b => b.type === 'text');
      if (!textBlock?.text) throw new Error('No text in API response');
      return parseJSON(textBlock.text);

    } catch (err) {
      const status  = err.status || err.statusCode;
      const isRate  = status === 429 || err.error?.type === 'rate_limit_error';
      const isOver  = status === 529;

      if ((isRate || isOver) && attempt < retries) {
        const wait = isOver ? 15000 : (attempt + 1) * 10000;
        await sleep(wait);
        continue;
      }

      // Final attempt or non-retriable error
      if (isRate)  throw new Error('Rate limit — try again in 30 seconds');
      if (isOver)  throw new Error('API overloaded — try again in a minute');
      throw new Error(err.message || 'API error');
    }
  }
}
