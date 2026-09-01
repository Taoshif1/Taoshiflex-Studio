type CookieWriter = {
  set: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      maxAge: number;
      path: string;
      sameSite: "lax" | "strict";
      secure: boolean;
    },
  ) => unknown;
};

export const legacyClientCookieNames = [
  "client_access_token",
  "client_refresh_token",
] as const;

export function clearLegacyClientCookies(writer: CookieWriter) {
  const secure = process.env.NODE_ENV === "production";
  writer.set("client_access_token", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure,
  });
  writer.set("client_refresh_token", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/client",
    sameSite: "strict",
    secure,
  });
}
