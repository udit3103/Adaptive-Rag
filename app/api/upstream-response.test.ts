import { describe, expect, it } from "vitest";

import { forwardApiResponse } from "./upstream-response";

describe("upstream API response handling", () => {
  it("converts a non-JSON upstream failure into a useful JSON error", async () => {
    const response = await forwardApiResponse(
      new Response("Internal Server Error", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({
      detail:
        "The RAG API returned an internal error (HTTP 500). Check the API service and try again.",
    });
  });

  it("preserves JSON responses from the API", async () => {
    const body = JSON.stringify({ detail: "OpenAI API credits are exhausted." });
    const response = await forwardApiResponse(
      new Response(body, {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      detail: "OpenAI API credits are exhausted.",
    });
  });
});
