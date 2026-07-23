import React from "react";
import { Redirect } from "expo-router";

/**
 * Backward-compatible redirect for old links and cached navigation state.
 * Job Portal access uses the verified Connect T citizen session and confirmed
 * role-specific profile setup instead of a second login screen.
 */
export default function LegacyJobPortalLoginRedirect() {
  return <Redirect href={"/jobs/profile-setup" as any} />;
}
