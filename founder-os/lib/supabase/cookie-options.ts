// Auth cookies get an explicit one-year lifetime so the session survives
// the installed PWA being closed for weeks — sign in once, stay in.
// Shared by the browser client, server client and middleware so every
// cookie write agrees on the same options.
export const AUTH_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
  path: "/",
} as const
