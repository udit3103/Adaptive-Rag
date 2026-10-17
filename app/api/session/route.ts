import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "rag_owner";

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ status: "ready" });
  if (!request.cookies.has(COOKIE_NAME)) {
    response.cookies.set(COOKIE_NAME, randomUUID(), {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 60,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
