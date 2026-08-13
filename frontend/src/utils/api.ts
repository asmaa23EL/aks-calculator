export function getApiBaseUrl(): string {
  const fromEnv = [
    process.env.INTERNAL_BACKEND_API_URL,
    process.env.BACKEND_API_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  ].find((value) => value?.trim())?.trim();

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:4001`;
    }
  }

  return 'http://localhost:4001';
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();

  if (typeof window !== 'undefined') {
    if (baseUrl) {
      return `${baseUrl}${normalizedPath}`;
    }
    return normalizedPath;
  }

  return baseUrl ? `${baseUrl}${normalizedPath}` : `http://localhost:3000${normalizedPath}`;
}
