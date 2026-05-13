import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { randomUUID } from "node:crypto";

import {
  createOauthUser,
  findUserByEmail,
  findUserByProvider,
  insertOauthAccount,
} from "./lib/db";
import { isIntegrationEnabled } from "./lib/integrations";
import { googleOAuthEnvReady } from "./lib/google-oauth-env";

/**
 * NextAuth v5 (Auth.js) configuration.
 *
 * Strategy: JWT sessions (no sessions table needed). On sign-in we look up
 * or create the user in our SQLite db and persist the user's id in the JWT
 * so server-side routes can use it.
 *
 * Required environment variables for Google sign-in:
 *   AUTH_SECRET            (random 32+ char string)
 *   AUTH_GOOGLE_ID         (Google OAuth client ID)
 *   AUTH_GOOGLE_SECRET     (Google OAuth client secret)
 *   AUTH_URL               (e.g. https://your-app.up.railway.app) — only
 *                          needed in production
 *
 * Without these, sign-in routes 404 — the app still works against the
 * demo user via getUserId()'s fallback path.
 *
 * Runtime on/off is controlled per deployment in the admin dashboard
 * (`integration_flags.google_oauth`); see `isGoogleAuthActive()` in
 * `lib/integrations.ts`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: googleOAuthEnvReady()
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),
      ]
    : [],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!isIntegrationEnabled("google_oauth")) return false;
      if (!account || !user?.email) return false;
      const providerId = account.providerAccountId;
      const existingByProvider = findUserByProvider(account.provider, providerId);
      let userId: string;
      if (existingByProvider) {
        userId = existingByProvider.id;
      } else {
        const existingByEmail = findUserByEmail(user.email);
        if (existingByEmail) {
          userId = existingByEmail.id;
        } else {
          userId = `u_${randomUUID()}`;
          createOauthUser({
            id: userId,
            name: user.name ?? profile?.name ?? user.email.split("@")[0],
            email: user.email,
            image: user.image ?? undefined,
            provider: account.provider,
            providerId,
          });
        }
      }
      insertOauthAccount({
        provider: account.provider,
        providerAccountId: providerId,
        userId,
        type: account.type ?? "oauth",
        accessToken: account.access_token ?? null,
        refreshToken: account.refresh_token ?? null,
        expiresAt: account.expires_at ?? null,
        tokenType: account.token_type ?? null,
        scope: account.scope ?? null,
        idToken: account.id_token ?? null,
      });
      // Pin our internal id on the auth-user object so the jwt callback can
      // copy it onto the token.
      (user as { id?: string }).id = userId;
      return true;
    },
    async jwt({ token, user }) {
      if (user && (user as { id?: string }).id) {
        token.id = (user as { id?: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        (session.user as { id?: string }).id = token.id;
      }
      return session;
    },
  },
});
