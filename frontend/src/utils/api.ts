export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  return 'http://localhost:4001';
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();
  if (typeof window !== 'undefined') {
    return `${baseUrl}${normalizedPath}`;
  }
  return baseUrl ? `${baseUrl}${normalizedPath}` : `http://localhost:3000${normalizedPath}`;
}
