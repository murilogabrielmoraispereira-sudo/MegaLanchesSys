export function createRequestId() {
  const random = Math.random().toString(36).slice(2, 12);
  return `atd-${Date.now().toString(36)}-${random}`;
}
