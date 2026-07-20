import { Redirect } from "expo-router";

export default function LegacyNagarsevakRegisterRedirect() {
  return <Redirect href={"/login" as any} />;
}
