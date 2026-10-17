export function getOwnerId(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)rag_owner=([0-9a-f-]{36})(?:;|$)/i);
  return match?.[1] ?? null;
}
