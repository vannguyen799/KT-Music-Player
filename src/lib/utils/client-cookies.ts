/** Read a cookie value from `document.cookie` by name. */
export function getClientCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match?.[1] != null ? decodeURIComponent(match[1]) : undefined
}

/** Set a cookie on `document.cookie` with the given max-age (seconds). */
export function setClientCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

/** Delete a cookie by setting max-age to 0. */
export function clearClientCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`
}
