import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");

test("shared authentication supports the configured Google and Apple providers", () => {
  const authPanel = readFileSync(resolve(projectRoot, "components/marketplace/AuthPanel.tsx"), "utf8");
  const callback = readFileSync(resolve(projectRoot, "components/marketplace/OAuthCallback.tsx"), "utf8");

  assert.match(authPanel, /signInWithOAuth/);
  assert.match(authPanel, /provider,\s*options: \{ redirectTo \}/);
  assert.match(authPanel, /handleOAuth\("google"\)/);
  assert.match(authPanel, /handleOAuth\("apple"\)/);
  assert.match(authPanel, /!hasAcceptedLegalTerms/);
  assert.match(authPanel, /!hasConfirmedAge/);
  assert.match(callback, /auth\.updateUser\(\{ data: pendingSignup \}\)/);
  assert.match(callback, /getAuthReturnPath\(getSafeAuthRedirect\(redirect, ""\), intent, locale\)/);
});
