import * as client from "openid-client";
import { env, requireSignIn } from "./env";

// The BFF is a confidential OpenID Connect client (authorization code + PKCE),
// so the client secret stays on the server and the browser never sees a token.
// Any OIDC provider works; local development and tests use Keycloak.

let config: Promise<client.Configuration> | undefined;

/** The provider's configuration, discovered once and then reused. */
export function oidcConfig(): Promise<client.Configuration> {
  const { issuer, clientId, clientSecret } = requireSignIn();
  config ??= client
    .discovery(
      new URL(issuer),
      clientId,
      undefined,
      client.ClientSecretBasic(clientSecret),
      // Keycloak runs on plain http:// locally. A production issuer is https://.
      issuer.startsWith("http://")
        ? { execute: [client.allowInsecureRequests] }
        : undefined,
    )
    .catch((error: unknown) => {
      config = undefined; // try again on the next sign-in
      throw error;
    });
  return config;
}

export function callbackUrl() {
  return `${env().PUBLIC_URL}/auth/callback`;
}

export { client };
