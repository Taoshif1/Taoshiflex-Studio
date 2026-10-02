import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const development = process.env.NODE_ENV === "development";
    let supabaseOrigin = "";
    try { supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin; } catch { /* Unconfigured local site. */ }
    // Static Next hydration and React/Motion inline styles require unsafe-inline.
    // No unsafe-eval in production and no external script providers.
    const csp = ["default-src 'self'", "script-src 'self' 'unsafe-inline'" + (development ? " 'unsafe-eval'" : ""),
      "script-src-attr 'none'", "style-src 'self' 'unsafe-inline'", "img-src 'self' https: data: blob:",
      "font-src 'self'", "connect-src 'self' " + supabaseOrigin + (development ? " ws: http://localhost:*" : ""),
      "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'", "frame-src 'none'",
      ...(development ? [] : ["upgrade-insecure-requests"])].join("; ");
    return [{ source: "/:path*", headers: [
      { key:"Content-Security-Policy", value:csp },
      { key:"X-Content-Type-Options", value:"nosniff" },
      { key:"X-Frame-Options", value:"DENY" },
      { key:"Referrer-Policy", value:"no-referrer" },
      { key:"Permissions-Policy", value:"camera=(), microphone=(), geolocation=(), payment=()" },
      ...(!development ? [{key:"Strict-Transport-Security",value:"max-age=31536000"}] : []),
    ] }, { source:"/api/:path*", headers:[{key:"Cache-Control",value:"private, no-store, max-age=0"}] },
    { source:"/studio-admin/:path*", headers:[{key:"Cache-Control",value:"private, no-store, max-age=0"}] }];
  },
};
export default nextConfig;
