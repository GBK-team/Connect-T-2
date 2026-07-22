import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const complaintDetail = await readFile(
  new URL("../app/complaint/[id].tsx", import.meta.url),
  "utf8",
);

test("complaint details fall back to existing role dashboards", () => {
  assert.doesNotMatch(complaintDetail, /router\.replace\("\/nagarsevak"/);
  assert.match(complaintDetail, /router\.replace\("\/\(tabs\)\/admin"/);
  assert.match(complaintDetail, /router\.replace\("\/super-admin"/);
});

test("retired privileged login screens redirect to the unified login", async () => {
  for (const route of [
    "../app/super-admin-login.tsx",
    "../app/nagarsevak/login.tsx",
    "../app/nagarsevak/register.tsx",
    "../app/nagarsevak/status.tsx",
    "../app/secret-access.tsx",
  ]) {
    const source = await readFile(new URL(route, import.meta.url), "utf8");
    assert.match(source, /\/login/, `${route} must redirect to the unified login`);
  }
});
