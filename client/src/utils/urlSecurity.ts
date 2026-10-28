/**
 * URL sanitization utility to prevent javascript:, data:, and vbscript: XSS vectors
 * in anchor tags and redirects.
 */
export function sanitizeExternalUrl(url: string | null | undefined, fallback: string = '#'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  const lower = trimmed.toLowerCase();
  // Strictly reject executable pseudo-protocols
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return fallback;
  }

  // Allow legitimate mailto: and tel: URIs
  if (lower.startsWith('mailto:') || lower.startsWith('tel:')) {
    return trimmed;
  }

  // Verify valid http / https URLs
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return trimmed;
      }
    } catch {
      return fallback;
    }
  }

  // Allow safe relative site navigation paths
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }

  // Standardize domain-like web URLs to HTTPS
  return `https://${trimmed}`;
}
