import assert from "node:assert/strict";
import test from "node:test";
import {
  getDashboardActionOrder,
  getDashboardSectionOrder,
  getProfessionalDashboardPresentation,
} from "../lib/dashboard-state.ts";

test("new clients retain the approved onboarding order", () => {
  assert.deepEqual(
    getDashboardSectionOrder({ hasClientActivity: false, hasProfessionalProfile: false }),
    ["actions", "join_pro", "account_management"],
  );
  assert.deepEqual(
    getDashboardActionOrder({
      hasClientActivity: false,
      hasProfessionalProfile: false,
      hasRecentSaved: false,
      hasRecentOutgoingRequests: false,
    }),
    ["explore", "preferences", "saved_requests"],
  );
});

test("active clients see real activity before account actions", () => {
  assert.deepEqual(
    getDashboardSectionOrder({ hasClientActivity: true, hasProfessionalProfile: false }),
    ["activity", "actions", "join_pro", "account_management"],
  );
  assert.deepEqual(
    getDashboardActionOrder({
      hasClientActivity: true,
      hasProfessionalProfile: false,
      hasRecentSaved: true,
      hasRecentOutgoingRequests: true,
    }),
    ["preferences", "explore"],
  );
});

test("one-sided client activity keeps the saved and requests pathway available", () => {
  assert.deepEqual(
    getDashboardActionOrder({
      hasClientActivity: true,
      hasProfessionalProfile: false,
      hasRecentSaved: true,
      hasRecentOutgoingRequests: false,
    }),
    ["preferences", "explore", "saved_requests"],
  );
});

test("Pro accounts prioritize Pro state after relevant client activity", () => {
  assert.deepEqual(
    getDashboardSectionOrder({
      hasClientActivity: true,
      hasProfessionalProfile: true,
      showClientRequests: true,
    }),
    ["activity", "pro", "client_requests", "actions", "account_management"],
  );
  assert.deepEqual(
    getDashboardSectionOrder({ hasClientActivity: false, hasProfessionalProfile: true }),
    ["pro", "actions", "account_management"],
  );
});

test("professional presentation distinguishes draft, pending, and live profiles", () => {
  assert.deepEqual(
    getProfessionalDashboardPresentation({ status: "draft", isPubliclyListed: false }),
    { statusLabel: "Draft", editorActionLabel: "Continue Profile" },
  );
  assert.deepEqual(
    getProfessionalDashboardPresentation({ status: "pending_review", isPubliclyListed: false }),
    { statusLabel: "Pending Review", editorActionLabel: "View / Edit Profile" },
  );
  assert.deepEqual(
    getProfessionalDashboardPresentation({ status: "approved", isPubliclyListed: true }),
    { statusLabel: "Live", editorActionLabel: "Edit Profile" },
  );
});
