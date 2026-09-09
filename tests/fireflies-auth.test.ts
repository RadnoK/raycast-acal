import { test } from "node:test";
import assert from "node:assert/strict";
import mockRequire from "mock-require";

// Raycast's OAuth bridge and secure storage only exist inside the native app.
// Keep the real auth service; replace those external boundaries and HTTP.
async function authHarness(
  cachedToken?: string,
  registered = false,
  session: {
    expired?: boolean;
    refreshToken?: string;
    refreshStatus?: number;
  } = {},
) {
  const stored = new Map<string, string>(
    registered ? [["fireflies-public-client-v1", "registered-client"]] : [],
  );
  let tokenSet:
    | { accessToken: string; refreshToken?: string; isExpired(): boolean }
    | undefined = cachedToken
    ? {
        accessToken: cachedToken,
        refreshToken: session.refreshToken,
        isExpired: () => session.expired ?? false,
      }
    : undefined;
  let requests = 0;
  let signIns = 0;
  let workerUnloaded = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (url === "https://api.fireflies.ai/register") {
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.redirect_uris, [
        "https://raycast.com/redirect?packageName=Extension",
      ]);
      return Response.json({
        client_id: "registered-client",
        token_endpoint_auth_method: "none",
      });
    }
    assert.equal(url, "https://api.fireflies.ai/token");
    const form = new URLSearchParams(String(init?.body));
    if (form.get("grant_type") === "refresh_token") {
      assert.equal(form.get("refresh_token"), session.refreshToken);
      assert.equal(form.get("client_id"), "registered-client");
      return Response.json(
        { error: "refresh failed" },
        { status: session.refreshStatus ?? 400 },
      );
    }
    assert.equal(form.get("code_verifier"), "verified-pkce-verifier");
    assert.equal(form.get("client_id"), "registered-client");
    return Response.json({
      access_token: "new-access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
    });
  };
  const api = {
    LocalStorage: {
      getItem: async (key: string) => stored.get(key),
      setItem: async (key: string, value: string) => {
        stored.set(key, value);
      },
    },
    OAuth: {
      RedirectMethod: { Web: "web" },
      PKCEClient: class {
        async getTokens() {
          return tokenSet;
        }
        async removeTokens() {
          // Raycast 2 pops to root when the last saved OAuth token is removed,
          // unloading the command that owns the native authorization callback.
          if (tokenSet) workerUnloaded = true;
          tokenSet = undefined;
        }
        async setTokens(tokens: { access_token: string }) {
          tokenSet = {
            accessToken: tokens.access_token,
            isExpired: () => false,
          };
        }
        async authorizationRequest(options: { clientId: string }) {
          assert.equal(
            workerUnloaded,
            false,
            "reauthorization must retain the current worker until tokens are replaced",
          );
          requests++;
          return {
            clientId: options.clientId,
            redirectURI: "https://raycast.com/redirect?packageName=Extension",
            codeVerifier: "verified-pkce-verifier",
            state: "native-state",
            toURL: () => "https://api.fireflies.ai/authorize",
          };
        }
        async authorize() {
          signIns++;
          return { authorizationCode: "callback-code" };
        }
      },
    },
  };
  mockRequire("@raycast/api", api);
  const auth = mockRequire.reRequire("../src/services/fireflies-auth.ts");
  return {
    auth,
    requests: () => requests,
    signIns: () => signIns,
    restore: () => {
      globalThis.fetch = originalFetch;
      mockRequire.stopAll();
    },
  };
}

test("reopening an authenticated Fireflies command returns its saved token without another login", async () => {
  const h = await authHarness("existing-access-token", true);
  try {
    assert.equal(await h.auth.connectFireflies(), "existing-access-token");
    assert.equal(h.signIns(), 0);
  } finally {
    h.restore();
  }
});

test("first Fireflies login initializes exactly one native callback and returns the stored token", async () => {
  const h = await authHarness();
  try {
    const token = await h.auth.connectFireflies();
    assert.equal(
      h.requests(),
      1,
      "a preliminary request must not replace the native callback session",
    );
    assert.equal(token, "new-access-token");
    assert.equal(await h.auth.firefliesConnected(), true);
  } finally {
    h.restore();
  }
});

test("an expired session without a refresh token starts a new login", async () => {
  const h = await authHarness("expired-token", true, { expired: true });
  try {
    assert.equal(await h.auth.connectFireflies(), "new-access-token");
    assert.equal(await h.auth.firefliesToken(), "new-access-token");
  } finally {
    h.restore();
  }
});

test("an expired session without its client registration can reconnect", async () => {
  const h = await authHarness("expired-token", false, {
    expired: true,
    refreshToken: "old-refresh-token",
  });
  try {
    assert.equal(await h.auth.connectFireflies(), "new-access-token");
  } finally {
    h.restore();
  }
});

test("a rejected refresh token starts a new login in the same command", async () => {
  const h = await authHarness("expired-token", true, {
    expired: true,
    refreshToken: "revoked-refresh-token",
    refreshStatus: 400,
  });
  try {
    assert.equal(await h.auth.connectFireflies(), "new-access-token");
  } finally {
    h.restore();
  }
});

test("a temporary refresh failure preserves the session and reports the error", async () => {
  const h = await authHarness("expired-token", true, {
    expired: true,
    refreshToken: "valid-refresh-token",
    refreshStatus: 503,
  });
  try {
    await assert.rejects(h.auth.connectFireflies(), /Could not/);
    assert.equal(await h.auth.firefliesConnected(), true);
    assert.equal(h.signIns(), 0);
  } finally {
    h.restore();
  }
});
