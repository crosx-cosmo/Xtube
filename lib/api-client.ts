export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
  timeoutMs?: number;
  retries?: number;
}

export interface ApiJsonResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * Pure helper to build a canonical watch page URL for clipboard sharing.
 */
export function buildWatchShareUrl(
  videoId: string | undefined | null,
  origin?: string | null,
  fallbackHref?: string | null
): string {
  const cleanId = (videoId ?? '').trim();
  const baseOrigin = (origin ?? '').trim().replace(/\/+$/, '');
  if (cleanId) {
    return `${baseOrigin || 'https://heylady.app'}/watch/${encodeURIComponent(cleanId)}`;
  }
  const cleanHref = (fallbackHref ?? '').trim();
  return cleanHref || `${baseOrigin || 'https://heylady.app'}/`;
}

/**
 * Lightweight, deduplicated, timeout-safe JSON API client for browser components.
 * - Coalesces concurrent identical GET requests into a single network round-trip.
 * - Automatically serializes `json` bodies and attaches `Accept: application/json`.
 * - Enforces a configurable request timeout via AbortController.
 * - Safely parses JSON responses even when upstream proxies return empty/HTML bodies.
 */
const inflightGetMap = new Map<string, Promise<ApiJsonResult<unknown>>>();

export async function requestApiJson<T = Record<string, unknown>>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiJsonResult<T>> {
  const {
    json,
    timeoutMs = 15_000,
    retries = 0,
    headers: customHeaders,
    signal: externalSignal,
    ...restInit
  } = options;

  const method = (restInit.method ?? (json !== undefined ? 'POST' : 'GET')).toUpperCase();
  const dedupeKey = method === 'GET' && !externalSignal ? `GET:${url}` : null;

  if (dedupeKey) {
    const existing = inflightGetMap.get(dedupeKey);
    if (existing) {
      return existing as Promise<ApiJsonResult<T>>;
    }
  }

  const execute = async (): Promise<ApiJsonResult<T>> => {
    let lastError = 'Network request failed.';

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timeoutId =
        timeoutMs > 0
          ? setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs)
          : null;

      const onExternalAbort = () => controller.abort(externalSignal?.reason);
      if (externalSignal) {
        if (externalSignal.aborted) {
          if (timeoutId) clearTimeout(timeoutId);
          return { ok: false, status: 0, data: null, error: 'Request aborted.' };
        }
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }

      try {
        const headers = new Headers(customHeaders);
        if (!headers.has('Accept')) {
          headers.set('Accept', 'application/json');
        }
        let body: BodyInit | undefined;
        if (json !== undefined) {
          if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
          }
          body = JSON.stringify(json);
        }

        const response = await fetch(url, {
          ...restInit,
          method,
          headers,
          body,
          signal: controller.signal,
        });

        let parsed: T | null = null;
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          parsed = (await response.json().catch(() => null)) as T | null;
        } else {
          const text = await response.text().catch(() => '');
          if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            try {
              parsed = JSON.parse(text) as T;
            } catch {
              parsed = null;
            }
          }
        }

        const errorMsg =
          !response.ok && parsed && typeof parsed === 'object' && 'error' in parsed
            ? String((parsed as Record<string, unknown>).error ?? '')
            : undefined;

        return {
          ok: response.ok,
          status: response.status,
          data: parsed,
          error: errorMsg || (!response.ok ? `HTTP ${response.status}` : undefined),
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Network request failed.';
        if (attempt < retries && method === 'GET' && !externalSignal?.aborted) {
          continue;
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (externalSignal) {
          externalSignal.removeEventListener('abort', onExternalAbort);
        }
      }
    }

    return {
      ok: false,
      status: 0,
      data: null,
      error: lastError,
    };
  };

  const promise = execute();

  if (dedupeKey) {
    inflightGetMap.set(dedupeKey, promise as Promise<ApiJsonResult<unknown>>);
    void promise.finally(() => {
      inflightGetMap.delete(dedupeKey);
    });
  }

  return promise;
}

/**
 * Copies a string to the system clipboard with a resilient DOM textarea fallback
 * for iframe / non-HTTPS contexts where navigator.clipboard may be restricted.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to selection fallback
  }

  if (typeof document === 'undefined') return false;

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}
