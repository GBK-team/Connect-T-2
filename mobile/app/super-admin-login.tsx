import { Redirect } from "expo-router";

// Compatibility route for older links. All roles now use the verified mobile
// OTP flow on the single main login screen.
export default function LegacySuperAdminLoginRedirect() {
  return <Redirect href={"/login" as any} />;
}
