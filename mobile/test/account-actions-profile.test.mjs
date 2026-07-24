import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("all profile portal actions bypass portal selection after initial choice", () => {
  const civic = read("screens/CivicProfileScreen.tsx");
  const jobs = read("app/jobs/(tabs)/profile.tsx");
  const hook = read("hooks/useAccountActions.ts");
  assert.match(civic, /requestJobsPortal/);
  assert.match(jobs, /requestCivicPortal/);
  assert.doesNotMatch(jobs, /portal-select/);
  assert.ok(hook.includes('resetNavigation("/jobs")'));
  assert.ok(hook.includes('resetNavigation("/(tabs)")'));
});

test("shared logout confirmation is used by civic jobs nagarsevak and super admin", () => {
  for (const file of ["screens/CivicProfileScreen.tsx", "app/jobs/(tabs)/profile.tsx", "app/(tabs)/admin.tsx", "app/super-admin/settings.tsx"]) {
    assert.match(read(file), /ConfirmActionModal/, file);
    assert.match(read(file), /requestLogout/, file);
  }
});

test("logout also clears protected in-memory query data", () => {
  const layout = read("app/_layout.tsx");
  assert.match(layout, /ProtectedCacheResetter/);
  assert.match(layout, /useQueryClient/);
  assert.match(layout, /client\.clear\(\)/);
});

test("civic profile exposes registration fields and keeps mobile read-only", () => {
  const screen = read("screens/CivicProfileScreen.tsx");
  assert.match(screen, /readOnlyMobile/);
  assert.match(screen, /notifyEmail/);
  assert.match(screen, /officeTimings/);
  assert.match(screen, /DobDatePicker/);
  assert.match(screen, /updateUser/);
});
