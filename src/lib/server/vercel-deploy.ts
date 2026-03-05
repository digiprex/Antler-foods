const DEFAULT_COOLDOWN_MS = 60_000;
const MAX_COOLDOWN_MS = 10 * 60_000;

const deployAttemptCache = new Map<string, number>();

export interface TriggerVercelDeployOptions {
  restaurantId?: string | null;
  reason?: string | null;
  source?: string | null;
  force?: boolean;
  cooldownMs?: number;
  metadata?: Record<string, unknown>;
}

export interface TriggerVercelDeployResult {
  attempted: boolean;
  triggered: boolean;
  skipped: boolean;
  reason:
    | 'deploy_triggered'
    | 'cooldown_active'
    | 'missing_deploy_hook_url'
    | 'invalid_deploy_hook_url'
    | 'hook_http_error'
    | 'hook_network_error';
  statusCode?: number;
  message: string;
  retryAfterMs?: number;
}

export async function triggerVercelDeploy(
  options: TriggerVercelDeployOptions = {},
): Promise<TriggerVercelDeployResult> {
  const hookUrl = normalizeText(process.env.VERCEL_DEPLOY_HOOK_URL);
  if (!hookUrl) {
    return {
      attempted: false,
      triggered: false,
      skipped: true,
      reason: 'missing_deploy_hook_url',
      message: 'VERCEL_DEPLOY_HOOK_URL is not configured on server.',
    };
  }

  try {
    // Validate URL once so route logs show clear configuration errors.
    new URL(hookUrl);
  } catch {
    return {
      attempted: false,
      triggered: false,
      skipped: true,
      reason: 'invalid_deploy_hook_url',
      message: 'VERCEL_DEPLOY_HOOK_URL is not a valid URL.',
    };
  }

  const restaurantId = normalizeText(options.restaurantId);
  const reason = normalizeText(options.reason) || 'content-update';
  const source = normalizeText(options.source) || 'server';
  const cooldownMs = resolveCooldownMs(options.cooldownMs);
  const rateLimitKey = buildRateLimitKey(restaurantId, source);
  const now = Date.now();

  pruneRateLimitCache(now, cooldownMs);

  if (!options.force) {
    const lastAttempt = deployAttemptCache.get(rateLimitKey);
    if (typeof lastAttempt === 'number' && now - lastAttempt < cooldownMs) {
      return {
        attempted: false,
        triggered: false,
        skipped: true,
        reason: 'cooldown_active',
        retryAfterMs: cooldownMs - (now - lastAttempt),
        message: 'Deploy trigger skipped because cooldown is active.',
      };
    }
  }

  deployAttemptCache.set(rateLimitKey, now);

  const payload = {
    triggered_at: new Date(now).toISOString(),
    restaurant_id: restaurantId || null,
    reason,
    source,
    metadata: options.metadata ?? null,
  };

  try {
    const response = await fetch(hookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!response.ok) {
      const responseText = await safeReadText(response);
      return {
        attempted: true,
        triggered: false,
        skipped: false,
        reason: 'hook_http_error',
        statusCode: response.status,
        message:
          responseText ||
          `Vercel deploy hook failed with HTTP ${response.status}.`,
      };
    }

    return {
      attempted: true,
      triggered: true,
      skipped: false,
      reason: 'deploy_triggered',
      statusCode: response.status,
      message: 'Vercel deploy hook triggered successfully.',
    };
  } catch (error) {
    return {
      attempted: true,
      triggered: false,
      skipped: false,
      reason: 'hook_network_error',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to call Vercel deploy hook.',
    };
  }
}

function resolveCooldownMs(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_COOLDOWN_MS;
  }

  const normalized = Math.max(0, Math.floor(value));
  return Math.min(normalized, MAX_COOLDOWN_MS);
}

function buildRateLimitKey(restaurantId: string, source: string) {
  return `${restaurantId || 'global'}:${source || 'server'}`;
}

function pruneRateLimitCache(now: number, cooldownMs: number) {
  const maxAge = cooldownMs * 5;
  for (const [key, timestamp] of deployAttemptCache.entries()) {
    if (now - timestamp > maxAge) {
      deployAttemptCache.delete(key);
    }
  }
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

async function safeReadText(response: Response) {
  try {
    const text = await response.text();
    return text.trim();
  } catch {
    return '';
  }
}
