import React from "react";
import { Redirect } from "expo-router";

/**
 * Backward-compatible route for cached app state and older links.
 * The production onboarding flow now requires explicit role confirmation.
 */
export default function LegacyJobPortalOnboardingRedirect() {
  return <Redirect href={"/jobs/profile-setup" as any} />;
}
