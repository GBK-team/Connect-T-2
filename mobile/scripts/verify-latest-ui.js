const fs = require("fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function mustInclude(file, markers) {
  const text = read(file);
  for (const marker of markers) {
    if (!text.includes(marker)) {
      console.error(`❌ Latest UI check failed: ${file} missing "${marker}"`);
      process.exit(1);
    }
  }
}

function mustNotInclude(file, markers) {
  const text = read(file);
  for (const marker of markers) {
    if (text.includes(marker)) {
      console.error(`❌ Latest UI check failed: ${file} still contains old marker "${marker}"`);
      process.exit(1);
    }
  }
}

mustInclude("app/login.tsx", ["Email Address", "Date of Birth"]);
mustNotInclude("app/login.tsx", ["regAge"]);

mustInclude("app/jobs/login.tsx", ["Connect T Jobs", "Date of Birth"]);
mustNotInclude("app/jobs/login.tsx", ['label="Age"', "Please select your age", "Select your age"]);

mustInclude("super-admin-login.tsx".startsWith("x") ? "x" : "app/super-admin-login.tsx", ["Connect T Control Center", "Open Super Admin Dashboard"]);
mustInclude("app/jobs/(tabs)/index.tsx", ["Hiring Overview", "Connect T Jobs", "Find trusted local work"]);
mustInclude("app/secret-access.tsx", ["Admin Access"]);
mustInclude("app/super-admin/broadcast.tsx", ["Broadcast Center"]);

console.log("✅ Latest UI verified: citizen, job portal, super admin, admin access");
