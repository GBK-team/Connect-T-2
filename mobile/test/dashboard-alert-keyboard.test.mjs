import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("job dashboards use authoritative refresh and strict database booleans", () => {
  const context = read("context/JobsContext.tsx");
  const home = read("app/jobs/(tabs)/index.tsx");
  const applied = read("app/jobs/(tabs)/applied.tsx");
  assert.match(context, /export function parseDbBoolean/);
  assert.match(context, /active", "all"/);
  assert.match(context, /await refreshJobs\(\)/);
  assert.match(context, /applications/);
  assert.match(home, /useFocusEffect/);
  assert.match(home, /employerJobs/);
  assert.match(home, /nearbyJobs/);
  assert.match(home, /errorBanner/);
  assert.match(applied, /applicationState/);
  assert.match(applied, /Job closed/);
});

test("citizen alerts refresh on focus and publishing controls are role restricted", () => {
  const context = read("context/AlertContext.tsx");
  const list = read("app/alert/list.tsx");
  const form = read("app/alert/new.tsx");
  assert.match(context, /AppState\.addEventListener/);
  assert.match(context, /alertVisibleForWard/);
  assert.match(list, /useFocusEffect/);
  assert.match(list, /canPublish/);
  assert.match(list, /Official updates published by your Nagarsevak and Super Admin/);
  assert.match(form, /if \(!canPublish\) router\.replace\("\/alert\/list"/);
  assert.match(form, /All citizens/);
  assert.match(form, /Ward residents/);
});

test("forms use keyboard-safe scroll behavior and adjustable insets", () => {
  const appScroll = read("components/AppScrollView.tsx");
  const alertForm = read("app/alert/new.tsx");
  const profile = read("app/jobs/(tabs)/profile.tsx");
  assert.match(appScroll, /automaticallyAdjustKeyboardInsets/);
  assert.match(appScroll, /keyboardDismissMode/);
  assert.match(appScroll, /keyboardShouldPersistTaps/);
  assert.match(alertForm, /KeyboardAvoidingView/);
  assert.match(alertForm, /automaticallyAdjustKeyboardInsets/);
  assert.match(profile, /KeyboardAvoidingView/);
  assert.match(profile, /Request Role Correction/);
});
