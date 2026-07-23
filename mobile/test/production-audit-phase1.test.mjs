import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("OTP UI has persistent resend timing and duplicate-submit guards", () => {
  const login = read("app/login.tsx");
  const otpApi = read("lib/otpApi.ts");
  assert.match(login, /Resend OTP in/);
  assert.match(login, /getOtpSessionState/);
  assert.match(login, /if (loading || resending) return/);
  assert.match(otpApi, /resendAt/);
  assert.match(otpApi, /secureSessionStorage/);
});

test("complaint photos use multipart transport instead of JSON base64", () => {
  const context = read("context/ComplaintContext.tsx");
  const screen = read("app/complaint/new.tsx");
  assert.match(context, /apiPostForm/);
  assert.match(context, /form.append("photo"/);
  assert.doesNotMatch(context, /toUploadableMediaUri(data.photoUri)/);
  assert.match(screen, /Remove complaint image/);
  assert.match(screen, /Uploading image/);
});
