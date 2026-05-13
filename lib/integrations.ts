import { getIntegrationFlag } from "./db";
import { googleOAuthEnvReady } from "./google-oauth-env";

export type IntegrationKey =
  | "google_oauth"
  | "anthropic"
  | "payments"
  | "health_wearables"
  | "bank_linking"
  | "voice_tts";

export const INTEGRATION_KEYS: IntegrationKey[] = [
  "google_oauth",
  "anthropic",
  "payments",
  "health_wearables",
  "bank_linking",
  "voice_tts",
];

export type IntegrationCatalogEntry = {
  key: IntegrationKey;
  title: string;
  summary: string;
  /** Environment variables involved (no values shown). */
  envVars: string[];
  /** How access / tokens work at a high level. */
  accessNotes: string;
  /** Ordered setup steps for operators. */
  setupSteps: string[];
};

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    key: "google_oauth",
    title: "Google sign-in (NextAuth)",
    summary: "Users sign in with Google; JWT sessions; accounts stored in SQLite.",
    envVars: ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "AUTH_URL (production)"],
    accessNotes:
      "Create an OAuth 2.0 Web client in Google Cloud Console. You receive a Client ID and Client Secret (not end-user tokens). NextAuth exchanges the authorization code server-side and may store access/refresh tokens on the Account row for future API use.",
    setupSteps: [
      "Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application).",
      "Authorized JavaScript origins: your site origin (e.g. https://your-app.up.railway.app).",
      "Authorized redirect URI: https://<your-host>/api/auth/callback/google",
      "Copy Client ID and Client Secret into AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.",
      "Generate a random AUTH_SECRET (32+ characters). In production set AUTH_URL to the public https base URL.",
      "Deploy; confirm /signin shows “Continue with Google” when this integration is enabled below.",
    ],
  },
  {
    key: "anthropic",
    title: "Anthropic Claude (ACE, reports, vault, brain dump)",
    summary: "Server-side Messages API for ACE chat, monthly reports, vault moderation, and brain-dump sorting.",
    envVars: ["ANTHROPIC_API_KEY", "ACE_MODEL (optional)"],
    accessNotes:
      "Create an API key in the Anthropic Console. The key is a server secret — never expose it to the browser. Requests go from your Node server to api.anthropic.com; when the key is missing or this toggle is off, the app uses local heuristics / fallbacks.",
    setupSteps: [
      "Anthropic Console → API keys → Create key.",
      "Set ANTHROPIC_API_KEY in your host environment (e.g. Railway variables).",
      "Optionally set ACE_MODEL (defaults to claude-sonnet-4-6).",
      "Redeploy; open ACE and send a message to verify cloud replies (not the short local fallback).",
    ],
  },
  {
    key: "payments",
    title: "Payments (Swish / Stripe)",
    summary: "Stake charges and charity disbursements are stubbed; real Swish/Stripe not wired yet.",
    envVars: ["(future: STRIPE_SECRET_KEY, SWISH_*)"],
    accessNotes:
      "No live payment provider keys in this repo yet. When implemented, Stripe uses restricted API keys and webhooks; Swish uses merchant credentials from your bank/Getswish agreement.",
    setupSteps: [
      "Design: Stripe Customer + PaymentMethod or Swish payment request API.",
      "Add webhook endpoints with signed verification.",
      "Store external_id on payments rows; never trust client-only success.",
      "Until wired, keep this toggle off in production if you do not want the demo charge UI used.",
    ],
  },
  {
    key: "health_wearables",
    title: "Health / wearables",
    summary: "Web prototype: manual samples + provider flags. Native HealthKit / Health Connect not wired in this Next app.",
    envVars: ["(none in web build; native apps would use platform keys)"],
    accessNotes:
      "Apple HealthKit and Google Health Connect are device-side. A future mobile app would request OS permissions and sync to your backend with user-scoped tokens or direct on-device reads pushed to /api/health.",
    setupSteps: [
      "For this web build: users can log samples manually via the Health API when enabled.",
      "For iOS later: enable HealthKit capability, request read types, use HKObserverQuery, POST aggregates to your API.",
      "For Android later: Health Connect permissions + WorkManager periodic sync.",
    ],
  },
  {
    key: "bank_linking",
    title: "Bank intercept (demo)",
    summary: "Simulated bank feed for intercept flows — no PSD2 / Tink connection in this codebase.",
    envVars: ["(future: bank aggregator client id/secret)"],
    accessNotes:
      "Real open banking uses regulated aggregators (e.g. Tink, TrueLayer) with OAuth per user and consent scopes. This prototype only toggles user.bank_connected and simulates transactions server-side.",
    setupSteps: [
      "Choose a licensed aggregator for your market (SE/EU PSD2).",
      "Register redirect URIs and obtain client credentials.",
      "Implement OAuth connect flow and store refresh tokens encrypted per user.",
      "Replace simulateIncomingTransaction with webhook or polling from the aggregator.",
    ],
  },
  {
    key: "voice_tts",
    title: "Voice / TTS (ACE weekly call)",
    summary: "Call UI uses the browser Web Speech API for playback; server TTS (e.g. ElevenLabs) is not implemented.",
    envVars: ["(future: ELEVENLABS_API_KEY or similar)"],
    accessNotes:
      "When added, TTS would stream audio from a server route using a provider API key kept server-side only.",
    setupSteps: [
      "Pick a TTS vendor and create an API key with billing limits.",
      "Add a secured API route that returns audio/stream; call from the call client after ACE text reply.",
      "Keep keys out of the client bundle; rate-limit by user.",
    ],
  },
];

export function isIntegrationEnabled(key: IntegrationKey): boolean {
  return getIntegrationFlag(key);
}

/** Google OAuth is registered (env) and not disabled by an admin flag. */
export function isGoogleAuthActive(): boolean {
  return googleOAuthEnvReady() && isIntegrationEnabled("google_oauth");
}

/** Use Anthropic cloud APIs (when key present and flag on). */
export function isAnthropicCloudEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim() && isIntegrationEnabled("anthropic");
}

export function isPaymentsIntegrationEnabled(): boolean {
  return isIntegrationEnabled("payments");
}

export function isHealthWearablesIntegrationEnabled(): boolean {
  return isIntegrationEnabled("health_wearables");
}

export function isBankLinkingIntegrationEnabled(): boolean {
  return isIntegrationEnabled("bank_linking");
}
