import { Redirect } from "expo-router";

export default function LegacyNagarsevakLoginRedirect() {
  return <Redirect href={"/login" as any} />;
}
