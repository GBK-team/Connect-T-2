import { Redirect } from "expo-router";

// Kept as a compatibility route for older links. Admin and officer access is
// now visible from the single main login screen; there is no hidden tap path.
export default function LegacySecretAccessRedirect() {
  return <Redirect href={"/login" as any} />;
}
