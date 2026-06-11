import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Parse JSON from Claude's response text robustly.
 * Handles preamble text, markdown fences, trailing commas, truncated responses.
 */
function parseJSON(text) {
  if (!text || typeof text !== 'string') throw new Error('Empty response from API');

  // Strip markdown fences
  let raw = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim();

  // Find outermost { ... } — handles any preamble or postamble text
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    console.error('No JSON braces found in response. Raw text:', raw.slice(0, 500));
    throw new Error('No JSON object in response');
  }

  raw = raw.slice(start, end + 1);

  // Attempt 1: direct parse
  try { return JSON.parse(raw); } catch (_) {}

  // Attempt 2: strip trailing commas before ] or }
  try { return JSON.parse(raw.replace(/,\s*([}\]])/g, '$1')); } catch (_) {}

  // Attempt 3: strip control characters + trailing commas
  try {
    const cleaned = raw
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(cleaned);
  } catch (_) {}

  // Attempt 4: try to recover truncated JSON by closing open brackets
  try {
    let fixed = raw;
    const openBraces   = (fixed.match(/{/g) || []).length;
    const closeBraces  = (fixed.match(/}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/]/g) || []).length;
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
    for (let i = 0; i < openBraces  - closeBraces;  i++) fixed += '}';
    return JSON.parse(fixed.replace(/,\s*([}\]])/g, '$1'));
  } catch (e) {
    console.error('All JSON parse attempts failed. Raw:', raw.slice(0, 500));
    throw new Error('Failed to parse JSON response — ' + e.message);
  }
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

      // Collect all text blocks (tool use may produce multiple blocks)
      const textBlocks = response.content?.filter(b => b.type === 'text') || [];
      if (textBlocks.length === 0) throw new Error('No text in API response');

      // Try each text block until one parses
      let lastErr;
      for (const block of textBlocks) {
        try { return parseJSON(block.text); } catch (e) { lastErr = e; }
      }
      throw lastErr || new Error('No parseable JSON in any text block');

    } catch (err) {
      const status = err.status || err.statusCode;
      const isRate = status === 429 || err.error?.type === 'rate_limit_error';
      const isOver = status === 529;

      if ((isRate || isOver) && attempt < retries) {
        const wait = isOver ? 15000 : (attempt + 1) * 10000;
        await sleep(wait);
        continue;
      }

      if (isRate) throw new Error('Rate limit — try again in 30 seconds');
      if (isOver) throw new Error('API overloaded — try again in a minute');
      throw new Error(err.message || 'API error');
    }
  }
}

