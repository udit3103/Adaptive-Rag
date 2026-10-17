type RateWindow = {
  count: number;
  expiresAt: number;
};

const windows = new Map<string, RateWindow>();

export function isRateLimited(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): boolean {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",").at(-1)?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const now = Date.now();

  if (windows.size > 10_000) {
    for (const [key, window] of windows) {
      if (window.expiresAt <= now) windows.delete(key);
    }
  }

  const key = `${bucket}:${clientIp}`;
  const current = windows.get(key);
  if (!current || current.expiresAt <= now) {
    windows.set(key, { count: 1, expiresAt: now + windowMs });
    return false;
  }

  current.count += 1;
  return current.count > limit;
}
