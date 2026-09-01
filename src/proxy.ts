import type { NextRequest } from "next/server";
import { updateClientSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateClientSession(request);
}

export const config = {
  matcher: ["/client/:path*"],
};
