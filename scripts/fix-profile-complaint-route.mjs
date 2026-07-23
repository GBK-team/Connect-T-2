import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "mobile/screens/CivicProfileScreen.tsx");
let source = fs.readFileSync(file, "utf8");
const oldRoute = 'router.push("/(tabs)/complaints" as any)';
const newRoute = 'router.push("/complaint/list" as any)';
if (!source.includes(oldRoute)) throw new Error("Citizen-only complaint route was not found");
source = source.replace(oldRoute, newRoute);
fs.writeFileSync(file, source);
console.log("Civic profile complaint shortcut now uses the role-neutral complaint list.");
