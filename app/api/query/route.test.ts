import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const mockFetch = vi.fn<typeof fetch>();

describe("query API proxy", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubEnv("RAG_API_URL", "https://rag.example.test/");
    vi.stubEnv("RAG_API_TOKEN", "test-only-token");
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ result: { content: "A useful answer." } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", mockFetch);
  });

  it("forwards valid queries to the private Python API", async () => {
    const response = await POST(
      new Request("http://localhost/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "rag_owner=12345678-1234-4123-8123-123456789abc",
        },
        body: JSON.stringify({ query: "Explain RAG", session_id: "session-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      result: { content: "A useful answer." },
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://rag.example.test/rag/query",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-only-token",
        }),
        body: JSON.stringify({
          query: "Explain RAG",
          session_id: "session-1",
          user_id: "12345678-1234-4123-8123-123456789abc",
        }),
      }),
    );
  });

  it("rejects invalid request bodies before making an API call", async () => {
    const response = await POST(
      new Request("http://localhost/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "rag_owner=12345678-1234-4123-8123-123456789abc",
        },
        body: JSON.stringify({ query: "", session_id: "session-1" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns a configuration error when secrets are missing", async () => {
    vi.stubEnv("RAG_API_TOKEN", "");
    const response = await POST(
      new Request("http://localhost/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "rag_owner=12345678-1234-4123-8123-123456789abc",
        },
        body: JSON.stringify({ query: "hello", session_id: "session-1" }),
      }),
    );

    expect(response.status).toBe(503);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("requires an HTTP-only browser session cookie", async () => {
    const response = await POST(
      new Request("http://localhost/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "hello", session_id: "session-1" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
