// Legacy audience metadata remains in storage for compatibility, never in headings.
export const postDisplayTitle = (title?: string | null) =>
  (title || '').replace(/^\s*\[Connections Only\]\s*/i, '').trim();
