import { describe, expect, it } from "vitest";

import { isRateLimited } from "./rate-limit";

describe("public demo rate limits", () => {
  it("limits requests per forwarded client address and route bucket", () => {
    const request = new Request("http://localhost/api/query", {
      headers: { "x-forwarded-for": "198.51.100.42" },
    });
    const bucket = "rate-limit-test";

    expect(isRateLimited(request, bucket, 1, 60_000)).toBe(false);
    expect(isRateLimited(request, bucket, 1, 60_000)).toBe(true);
    expect(isRateLimited(request, `${bucket}-other`, 1, 60_000)).toBe(false);
  });
});
