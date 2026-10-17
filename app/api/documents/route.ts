import { NextResponse } from "next/server";

import { isRateLimited } from "../rate-limit";
import { getOwnerId } from "../session-cookie";
import { forwardApiResponse } from "../upstream-response";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const ownerId = getOwnerId(request);
  if (!ownerId) {
    return NextResponse.json(
      { detail: "Start a new browser session before uploading documents." },
      { status: 401 },
    );
  }
  if (isRateLimited(request, "upload", 3, 60 * 60_000)) {
    return NextResponse.json(
      { detail: "Upload limit reached. Please try again later." },
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

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ detail: "Expected a multipart upload." }, { status: 400 });
  }
  const file = incoming.get("file");
  const description = incoming.get("description");
  if (
    !(file instanceof File) ||
    typeof description !== "string" ||
    !description.trim() ||
    description.length > 300
  ) {
    return NextResponse.json(
      { detail: "Choose a PDF or TXT file and provide a short description." },
      { status: 400 },
    );
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["pdf", "txt"].includes(extension)) {
    return NextResponse.json({ detail: "Only PDF and TXT files are supported." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { detail: "Files must be smaller than 4 MB and contain data." },
      { status: 400 },
    );
  }

  const outgoing = new FormData();
  outgoing.set("file", file, file.name);
  try {
    const response = await fetch(
      `${apiUrl.replace(/\/+$/, "")}/rag/documents/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "X-Description": description.trim(),
          "X-User-ID": ownerId,
        },
        body: outgoing,
        cache: "no-store",
        signal: AbortSignal.timeout(55_000),
      },
    );
    return await forwardApiResponse(response);
  } catch {
    return NextResponse.json(
      { detail: "The RAG API could not be reached. Try again shortly." },
      { status: 502 },
    );
  }
}
