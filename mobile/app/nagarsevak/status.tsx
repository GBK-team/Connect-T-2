import { Redirect } from "expo-router";

export default function LegacyNagarsevakStatusRedirect() {
  return <Redirect href={"/login" as any} />;
}
