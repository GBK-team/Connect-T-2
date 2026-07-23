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
  assert.match(context, /export function parseDbBoolean/);
  assert.match(context, /active", "all"/);
  assert.match(context, /await refreshJobs\(\)/);
  assert.match(home, /useFocusEffect/);
  assert.match(home, /errorBanner/);
});

test("citizen alerts refresh on focus and publishing controls are role restricted", () => {
  const list = read("app/alert/list.tsx");
  const form = read("app/alert/new.tsx");
  assert.match(list, /useFocusEffect/);
  assert.match(list, /canPublish/);
  assert.match(list, /Official updates published by your Nagarsevak and Super Admin/);
  assert.match(form, /if \(!canPublish\) router\.replace\("\/alert\/list"/);
});

test("long alert forms use resize-safe keyboard and adjustable scroll insets", () => {
  const form = read("app/alert/new.tsx");
  assert.match(form, /KeyboardAvoidingView/);
  assert.match(form, /automaticallyAdjustKeyboardInsets/);
  assert.match(form, /keyboardShouldPersistTaps="handled"/);
  assert.match(form, /keyboardDismissMode=/);
});
