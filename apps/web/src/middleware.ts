import { NextResponse } from "next/server";

// Auth disabled for development — pass all requests through
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
