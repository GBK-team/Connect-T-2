import React from "react";
import { Redirect } from "expo-router";

/**
 * Backward-compatible redirect for old links and cached navigation state.
 * Job Portal access now uses the citizen's verified Connect T session and a
 * role-specific profile onboarding flow instead of a separate login screen.
 */
export default function LegacyJobPortalLoginRedirect() {
  return <Redirect href="/jobs/onboarding" />;
}
