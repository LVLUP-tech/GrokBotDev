// Vercel entrypoint for the votes API (Hono). The long-running Node server lives in
// src/index.ts (PM2/nginx path) and is untouched; this file only adapts the same app
// factory to Vercel's fetch handler. Config comes from env vars (DATABASE_URL,
// VOTES_HMAC_PEPPER, TURNSTILE_SECRET_KEY, ...) exactly as in src/index.ts. If they are not
// set, config.ts falls back to local-dev defaults and DB-backed routes return errors
// (/api/v1/health reports db: down) instead of crashing the function at import time.
import { handle } from 'hono/vercel';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { connect } from '../src/db/client.js';
import { createLogger } from '../src/logger.js';
import { SlugRegistry } from '../src/slug/registry.js';
import { createTurnstileVerifier } from '../src/turnstile.js';
import { LiveTemplateManifest } from '../src/submissions/live-manifest.js';
import { createShareLinkVerifier } from '../src/submissions/share-link.js';

const cfg = loadConfig();
const logger = createLogger(cfg.logLevel);
// Serverless: keep the pool tiny; each instance handles few concurrent requests.
const db = connect(cfg.databaseUrl, 1);
const slugRegistry = new SlugRegistry({
  contentDir: cfg.useCaseContentDir,
  slugsFile: cfg.slugsFile,
  slugsUrl: cfg.slugsUrl,
  refreshMs: cfg.slugRefreshMs,
});

const app = createApp({
  db,
  slugRegistry,
  turnstileVerifier: createTurnstileVerifier(cfg.turnstileSecret),
  shareLinkVerifier: createShareLinkVerifier(cfg.shareLinkTimeoutMs),
  liveManifest: new LiveTemplateManifest({
    file: cfg.submissionsManifestFile,
    url: cfg.submissionsManifestUrl,
    ttlMs: cfg.submissionsManifestTtlMs,
  }),
  pepper: cfg.pepper,
  logger,
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
export const HEAD = handle(app);
