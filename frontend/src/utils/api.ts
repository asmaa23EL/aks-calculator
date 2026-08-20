export function getApiBaseUrl(): string {
  // Browser requests go through the Next.js /api proxy. This avoids exposing an
  // internal backend hostname to visitors and removes cross-origin failures.
  if (typeof window !== 'undefined') {
    return '';
  }

  const fromEnv = [
    process.env.INTERNAL_BACKEND_API_URL,
    process.env.BACKEND_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  ].find((value) => value?.trim())?.trim();

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  return '';
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();

  if (baseUrl) {
    return `${baseUrl}${normalizedPath}`;
  }

  return normalizedPath;
}
