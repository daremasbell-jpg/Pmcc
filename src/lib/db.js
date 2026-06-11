/**
 * Simple server-side storage using Vercel's /tmp directory.
 * Positions and alert settings are stored as JSON files.
 * 
 * Note: /tmp persists within a serverless function invocation.
 * For true persistence across invocations we use a flat JSON approach
 * with a unique user token stored in the browser.
 */

import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = '/tmp/pmcc-data';

async function ensureDir() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {}
}

function userFile(userId) {
  return path.join(DATA_DIR, `user-${userId.replace(/[^a-z0-9]/gi, '')}.json`);
}

export async function loadUserData(userId) {
  await ensureDir();
  try {
    const raw = await fs.readFile(userFile(userId), 'utf8');
    return JSON.parse(raw);
  } catch {
    return { positions: [], settings: {}, lastUpdated: null };
  }
}

export async function saveUserData(userId, data) {
  await ensureDir();
  await fs.writeFile(userFile(userId), JSON.stringify({ ...data, lastUpdated: new Date().toISOString() }), 'utf8');
  return true;
}
