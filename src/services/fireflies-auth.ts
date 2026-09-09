import { LocalStorage, OAuth } from "@raycast/api";
import { z } from "zod";

export const FIREFLIES_MCP = "https://api.fireflies.ai/mcp";
const issuer = "https://api.fireflies.ai";
const registrationKey = "fireflies-public-client-v1";
// Raycast's documented Web redirect is shared by all extensions. Register it
// before initializing PKCE: authorizationRequest creates a live native session.
const redirectURI = "https://raycast.com/redirect?packageName=Extension";
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Fireflies",
  providerId: "fireflies",
  description: "Sign in to browse your meetings and plan follow-ups.",
});
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
});
export const firefliesConnected = async () =>
  Boolean((await client.getTokens())?.accessToken);
export const disconnectFireflies = () => client.removeTokens();

class ReauthenticationRequired extends Error {}

async function exchange(
  params: URLSearchParams,
  previousRefreshToken?: string,
) {
  const response = await fetch(`${issuer}/token`, {
    method: "POST",
    body: params,
    signal: AbortSignal.timeout(30_000),
    redirect: "error",
  });
  if (!response.ok) {
    const message =
      "Could not refresh your Fireflies session. Reconnect in Cailendar Connections.";
    if (response.status === 400 || response.status === 401)
      throw new ReauthenticationRequired(message);
    throw new Error(message);
  }
  const tokens = tokenSchema.parse(await response.json());
  await client.setTokens({
    ...tokens,
    refresh_token: tokens.refresh_token ?? previousRefreshToken,
  });
  return tokens.access_token;
}

export async function connectFireflies(): Promise<string> {
  if (await firefliesConnected()) {
    try {
      return await storedFirefliesToken();
    } catch (error) {
      // Removing the last token makes Raycast pop to root and unload this
      // worker. Keep stale credentials until successful OAuth replaces them.
      if (!(error instanceof ReauthenticationRequired)) throw error;
    }
  }
  let clientId = await LocalStorage.getItem<string>(registrationKey);
  if (!clientId) {
    const response = await fetch(`${issuer}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
      body: JSON.stringify({
        client_name: "Cailendar for Raycast",
        redirect_uris: [redirectURI],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: "profile email",
      }),
    });
    if (!response.ok)
      throw new Error(
        "Fireflies could not register the sign-in client. Try again later.",
      );
    const registration = z
      .object({
        client_id: z.string().min(1),
        token_endpoint_auth_method: z.literal("none").optional(),
      })
      .parse(await response.json());
    clientId = registration.client_id;
    await LocalStorage.setItem(registrationKey, clientId);
  }
  const request = await client.authorizationRequest({
    endpoint: `${issuer}/authorize`,
    clientId,
    scope: "profile email",
    extraParameters: { resource: FIREFLIES_MCP },
  });
  const { authorizationCode } = await client.authorize(request);
  return exchange(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code: authorizationCode,
      code_verifier: request.codeVerifier,
      redirect_uri: request.redirectURI,
      resource: FIREFLIES_MCP,
    }),
  );
}

let refreshing: Promise<string> | undefined;
export async function firefliesToken(forceRefresh = false): Promise<string> {
  try {
    return await storedFirefliesToken(forceRefresh);
  } catch (error) {
    // Ordinary data requests cannot reauthorize. Clear unusable credentials so
    // reopening the command can start a fresh login.
    if (error instanceof ReauthenticationRequired) await client.removeTokens();
    throw error;
  }
}

async function storedFirefliesToken(forceRefresh = false): Promise<string> {
  const tokens = await client.getTokens();
  if (!tokens)
    throw new Error("Connect your Fireflies account in Cailendar Connections.");
  if (!forceRefresh && !tokens.isExpired()) return tokens.accessToken;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const clientId = await LocalStorage.getItem<string>(registrationKey);
    if (!tokens.refreshToken || !clientId) {
      throw new ReauthenticationRequired(
        "Your Fireflies session has expired. Connect your account again.",
      );
    }
    return exchange(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
        client_id: clientId,
        resource: FIREFLIES_MCP,
      }),
      tokens.refreshToken,
    );
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = undefined;
  }
}
