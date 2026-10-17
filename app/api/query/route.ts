import { NextResponse } from "next/server";

import { isRateLimited } from "../rate-limit";
import { getOwnerId } from "../session-cookie";
import { forwardApiResponse } from "../upstream-response";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const ownerId = getOwnerId(request);
  if (!ownerId) {
    return NextResponse.json(
      { detail: "Start a new browser session before using the API." },
      { status: 401 },
    );
  }
  if (isRateLimited(request, "query", 20, 60_000)) {
    return NextResponse.json(
      { detail: "Too many questions. Please wait a minute and try again." },
      { status: 429 },
    );
  }
  const apiUrl = process.env.RAG_API_URL;
  const apiToken = process.env.RAG_API_TOKEN;
  if (!apiUrl || !apiToken) {
    return NextResponse.json(
      { detail: "The API connection is not configured yet." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Expected a JSON request." }, { status: 400 });
  }
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("query" in payload) ||
    typeof payload.query !== "string" ||
    !payload.query.trim() ||
    payload.query.length > 4000 ||
    !("session_id" in payload) ||
    typeof payload.session_id !== "string" ||
    !payload.session_id.trim() ||
    payload.session_id.length > 128
  ) {
    return NextResponse.json({ detail: "Invalid query or session ID." }, { status: 400 });
  }

  try {
    const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/rag/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, user_id: ownerId }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
    return await forwardApiResponse(response);
  } catch {
    return NextResponse.json(
      { detail: "The RAG API could not be reached. Try again shortly." },
      { status: 502 },
    );
  }
}
