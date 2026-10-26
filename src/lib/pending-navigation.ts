/**
 * A one-shot override for where sign-in should land, set by explicit demo
 * shortcuts (e.g. the Admin quick sign-in) just before the auth store
 * updates. Reading is side-effect free (StrictMode-safe); GuestRoute clears
 * it once the authenticated redirect has been rendered.
 *
 * Why this exists: `signIn()` forces a synchronous re-render, so GuestRoute's
 * `<Navigate>` wins the race against any `navigate()` call made afterwards —
 * the destination has to be readable during GuestRoute's render, not set
 * afterwards.
 */
let forcedSignInHome: string | null = null

export function forceSignInHome(path: string | null): void {
  forcedSignInHome = path
}

export function peekForcedSignInHome(): string | null {
  return forcedSignInHome
}
