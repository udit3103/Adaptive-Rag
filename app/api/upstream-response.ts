import { NextResponse } from "next/server";

export async function forwardApiResponse(response: Response): Promise<NextResponse> {
  const body = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("json")) {
    return NextResponse.json(
      {
        detail: response.ok
          ? "The API returned an unexpected response."
          : `The RAG API returned an internal error (HTTP ${response.status}). Check the API service and try again.`,
      },
      { status: response.status },
    );
  }

  return new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": contentType },
  });
}
