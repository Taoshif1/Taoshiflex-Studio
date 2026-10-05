import type { NextConfig } from "next";
// Only the configured public media bucket may use the image optimizer.
function publicImagePatterns() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (url.protocol !== "https:" || url.username || url.password || url.port) return [];
    return [{ protocol: "https" as const, hostname: url.hostname, port: "", pathname: "/storage/v1/object/public/project-media/**", search: "" }];
  } catch { return []; }
}
const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { globalNotFound: true },
  images: {
    remotePatterns: publicImagePatterns(),
    maximumRedirects: 0,
  },
  async headers() {
    const development = process.env.NODE_ENV === "development";
    let supabaseOrigin = "";
    try { supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin; } catch { /* Unconfigured local site. */ }
    // Static Next hydration and React/Motion inline styles require unsafe-inline.
    // Private documents retain the original policy; public analytics hosts are opt-in.
    const csp = ["default-src 'self'", "script-src 'self' 'unsafe-inline'" + (development ? " 'unsafe-eval'" : ""),
      "script-src-attr 'none'", "style-src 'self' 'unsafe-inline'", "img-src 'self' https: data: blob:",
      "font-src 'self'", "connect-src 'self' " + supabaseOrigin + (development ? " ws: http://localhost:*" : ""),
      "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'", "frame-src 'none'",
      ...(development ? [] : ["upgrade-insecure-requests"])].join("; ");
    const ga = /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "");
    const clarity = /^[a-z0-9]{4,32}$/.test(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "");
    const scripts = (ga ? " https://www.googletagmanager.com/gtag/js" : "") + (clarity ? " https://www.clarity.ms https://scripts.clarity.ms" : "");
    const connections = (ga ? " https://www.google-analytics.com https://region1.google-analytics.com" : "") + (clarity ? " https://*.clarity.ms" : "");
    const publicCsp = csp.replace("script-src 'self'", "script-src 'self'" + scripts).replace("connect-src 'self'", "connect-src 'self'" + connections);
    return [{ source: "/:path*", headers: [
      { key:"Content-Security-Policy", value:publicCsp },
      { key:"X-Content-Type-Options", value:"nosniff" },
      { key:"X-Frame-Options", value:"DENY" },
      { key:"Referrer-Policy", value:"no-referrer" },
      { key:"Permissions-Policy", value:"camera=(), microphone=(), geolocation=(), payment=()" },
      ...(!development ? [{key:"Strict-Transport-Security",value:"max-age=31536000"}] : []),
    ] },
    ...["/client/:path*", "/studio-admin/:path*", "/api/:path*"].map(source => ({source,headers:[{key:"Content-Security-Policy",value:csp},{key:"X-Robots-Tag",value:"noindex, nofollow"}]})),
    { source:"/api/:path*", headers:[{key:"Cache-Control",value:"private, no-store, max-age=0"}] },
    { source:"/studio-admin/:path*", headers:[{key:"Cache-Control",value:"private, no-store, max-age=0"}] }];
  },
};
export default nextConfig;
