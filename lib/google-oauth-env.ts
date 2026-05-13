/**
 * Whether Google OAuth credentials are present in the environment.
 * NextAuth registers the Google provider only when this is true.
 */
export function googleOAuthEnvReady(): boolean {
  return !!(
    process.env.AUTH_SECRET &&
    process.env.AUTH_GOOGLE_ID &&
    process.env.AUTH_GOOGLE_SECRET
  );
}
