import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, value) => fs.writeFileSync(path.join(root, file), value);

function replaceRequired(text, search, replacement, file) {
  if (!text.includes(search)) throw new Error(`Expected source not found in ${file}: ${search.slice(0, 100)}`);
  return text.replace(search, replacement);
}

function removeRange(text, startText, endText, file) {
  const start = text.indexOf(startText);
  if (start < 0) throw new Error(`Range start not found in ${file}: ${startText}`);
  const end = text.indexOf(endText, start);
  if (end < 0) throw new Error(`Range end not found in ${file}: ${endText}`);
  return text.slice(0, start) + text.slice(end);
}

{
  const file = "mobile/app/jobs/(tabs)/profile.tsx";
  let text = read(file);
  text = replaceRequired(text, `import { useRouter } from "expo-router";\n`, "", file);
  text = replaceRequired(text, `import { AppScrollView } from "@/components/AppScrollView";`, `import { AppScrollView } from "@/components/AppScrollView";\nimport ConfirmActionModal from "@/components/ConfirmActionModal";`, file);
  text = replaceRequired(text, `import { useAuth } from "@/context/AuthContext";\n`, "", file);
  text = replaceRequired(text, `import { apiGet, apiPost, getUserErrorMessage } from "@/lib/api";`, `import { apiGet, apiPost, getUserErrorMessage } from "@/lib/api";\nimport { useAccountActions } from "@/hooks/useAccountActions";`, file);
  text = replaceRequired(text, `  const router = useRouter();\n`, "", file);
  text = replaceRequired(text, `  const { logout } = useAuth();\n`, "", file);
  text = replaceRequired(text, `  const { jobsUser, updateJobsUser } = useJobsAuth();`, `  const { jobsUser, updateJobsUser } = useJobsAuth();\n  const accountActions = useAccountActions();`, file);
  text = replaceRequired(text, `  const handleLogout = async () => {\n    await logout();\n    router.replace("/login" as any);\n  };\n\n`, "", file);
  text = replaceRequired(
    text,
    `<Text style={s.sectionTitle}>ACCOUNT ACTIONS</Text><View style={s.card}><TouchableOpacity style={s.actionRow} onPress={() => router.replace("/portal-select" as any)}><Feather name="repeat" size={16} color={ORANGE} /><View style={{ flex: 1 }}><Text style={s.actionTitle}>Switch Civic / Job Portal</Text><Text style={s.actionSub}>Keep the same verified login</Text></View><Feather name="chevron-right" size={17} color="#CBD5E1" /></TouchableOpacity><TouchableOpacity style={s.actionRow} onPress={handleLogout}><Feather name="log-out" size={16} color="#DC2626" /><View style={{ flex: 1 }}><Text style={[s.actionTitle, { color: "#DC2626" }]}>Logout from Connect T</Text><Text style={s.actionSub}>Clear all sessions and return to login</Text></View><Feather name="chevron-right" size={17} color="#CBD5E1" /></TouchableOpacity></View>`,
    `<Text style={s.sectionTitle}>ACCOUNT ACTIONS</Text><View style={s.card}><TouchableOpacity style={s.actionRow} onPress={accountActions.requestCivicPortal}><Feather name="repeat" size={16} color={ORANGE} /><View style={{ flex: 1 }}><Text style={s.actionTitle}>Switch to Civic Portal</Text><Text style={s.actionSub}>Open Civic Services directly with the same verified login</Text></View><Feather name="chevron-right" size={17} color="#CBD5E1" /></TouchableOpacity><TouchableOpacity style={s.actionRow} onPress={accountActions.requestLogout}><Feather name="log-out" size={16} color="#DC2626" /><View style={{ flex: 1 }}><Text style={[s.actionTitle, { color: "#DC2626" }]}>Logout from Connect T</Text><Text style={s.actionSub}>Securely clear Civic and Job Portal sessions</Text></View><Feather name="chevron-right" size={17} color="#CBD5E1" /></TouchableOpacity></View>`,
    file,
  );
  text = replaceRequired(
    text,
    `      <Notice visible={notice.visible} title={notice.title} message={notice.message} tone={notice.tone} onClose={() => setNotice((current) => ({ ...current, visible: false }))} />`,
    `      <ConfirmActionModal\n        visible={!!accountActions.pendingAction}\n        title={accountActions.pendingAction === "logout" ? "Logout from Connect-T?" : "Switch to Civic Portal?"}\n        message={accountActions.pendingAction === "logout" ? "This will securely clear Civic and Job Portal sessions on this device. Your account, jobs and applications will not be deleted." : "Your verified login will remain active and Civic Services will open directly."}\n        confirmLabel={accountActions.pendingAction === "logout" ? "Logout" : "Switch portal"}\n        icon={accountActions.pendingAction === "logout" ? "log-out" : "repeat"}\n        tone={accountActions.pendingAction === "logout" ? "danger" : "primary"}\n        busy={accountActions.busy}\n        onCancel={accountActions.cancelAction}\n        onConfirm={accountActions.runPendingAction}\n      />\n      <Notice visible={notice.visible} title={notice.title} message={notice.message} tone={notice.tone} onClose={() => setNotice((current) => ({ ...current, visible: false }))} />`,
    file,
  );
  write(file, text);
}

{
  const file = "mobile/app/super-admin/settings.tsx";
  let text = read(file);
  text = replaceRequired(text, `import { AppScrollView } from "@/components/AppScrollView";`, `import { AppScrollView } from "@/components/AppScrollView";\nimport ConfirmActionModal from "@/components/ConfirmActionModal";`, file);
  text = replaceRequired(text, `import { useRouter } from "expo-router";`, `import { useRouter } from "expo-router";\nimport { useAccountActions } from "@/hooks/useAccountActions";`, file);
  text = replaceRequired(text, `  const { user, logout, updateUser } = useAuth();`, `  const { user, updateUser } = useAuth();`, file);
  text = replaceRequired(text, `  const router = useRouter();`, `  const router = useRouter();\n  const accountActions = useAccountActions();`, file);
  text = replaceRequired(text, `  const [showLogout, setShowLogout] = useState(false);\n`, "", file);
  text = text.replace(`onPress={() => setShowLogout(true)}`, `onPress={accountActions.requestLogout}`);
  text = removeRange(text, `      <Modal\n        visible={showLogout}`, `      <Modal\n        visible={showEditProfile}`, file);
  text = replaceRequired(
    text,
    `      <Modal\n        visible={showEditProfile}`,
    `      <ConfirmActionModal\n        visible={accountActions.pendingAction === "logout"}\n        title="Logout from Connect-T?"\n        message="This will securely clear all authenticated sessions on this device. Administrative data and account access will not be deleted."\n        confirmLabel="Logout"\n        icon="log-out"\n        tone="danger"\n        busy={accountActions.busy}\n        onCancel={accountActions.cancelAction}\n        onConfirm={accountActions.runPendingAction}\n      />\n\n      <Modal\n        visible={showEditProfile}`,
    file,
  );
  write(file, text);
}

{
  const file = "mobile/app/(tabs)/admin.tsx";
  let text = read(file);
  text = replaceRequired(text, `import { AppScrollView } from "@/components/AppScrollView";`, `import { AppScrollView } from "@/components/AppScrollView";\nimport ConfirmActionModal from "@/components/ConfirmActionModal";`, file);
  text = replaceRequired(text, `import { getUserErrorMessage } from "@/lib/api";`, `import { getUserErrorMessage } from "@/lib/api";\nimport { useAccountActions } from "@/hooks/useAccountActions";`, file);
  text = replaceRequired(text, `  const { user, logout, updateUser } = useAuth();`, `  const { user, updateUser } = useAuth();`, file);
  text = replaceRequired(text, `  const [showLogoutModal, setShowLogoutModal] = useState(false);\n`, "", file);
  text = replaceRequired(text, `  const [utilityMessage, setUtilityMessage] = useState("");`, `  const [utilityMessage, setUtilityMessage] = useState("");\n  const accountActions = useAccountActions();`, file);
  text = replaceRequired(text, `  const handleLogout = async () => {\n    setShowLogoutModal(false);\n    await logout("/login");\n    router.replace("/login" as any);\n  };\n\n`, "", file);
  text = text.replaceAll(`setShowLogoutModal(true)`, `accountActions.requestLogout()`);
  text = removeRange(text, `      <Modal visible={showLogoutModal}`, `    </View>\n  );\n}`, file);
  text += `\n`;
  const closing = `    </View>\n  );\n}`;
  if (!text.includes(closing)) throw new Error(`Admin component closing not found after modal removal`);
  text = text.replace(closing, `      <ConfirmActionModal\n        visible={accountActions.pendingAction === "logout"}\n        title="Logout from Connect-T?"\n        message="This will securely clear Civic and Job Portal sessions on this device. Complaints, alerts and account data will remain saved."\n        confirmLabel="Logout"\n        icon="log-out"\n        tone="danger"\n        busy={accountActions.busy}\n        onCancel={accountActions.cancelAction}\n        onConfirm={accountActions.runPendingAction}\n      />\n    </View>\n  );\n}`);
  write(file, text);
}

{
  const file = "backend/server.js";
  let text = read(file);
  text = replaceRequired(
    text,
    `    if (existing && !authIsSuperAdmin && existingMobile !== mobile && (!ownsExisting || !hasOtpProof)) {\n      return res.status(403).json({ success: false, error: "Verified OTP is required to change this account's mobile number" });\n    }`,
    `    if (existing && !authIsSuperAdmin && existingMobile !== mobile) {\n      return res.status(403).json({\n        success: false,\n        code: "MOBILE_CHANGE_REQUIRES_REVERIFICATION",\n        message: "Mobile number cannot be changed from the normal profile form. A separate re-verification workflow is required.",\n      });\n    }`,
    file,
  );
  write(file, text);
}

{
  const file = "mobile/app/super-admin/officers.tsx";
  let text = read(file);
  text = text.replaceAll("Search Marathi name, phone or ward...", "Search officer name, phone or ward...");
  write(file, text);
}

{
  const file = "mobile/test/account-actions-profile.test.mjs";
  const content = `import test from "node:test";\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\nimport path from "node:path";\nimport { fileURLToPath } from "node:url";\n\nconst root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");\nconst read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");\n\ntest("all profile portal actions bypass portal selection after initial choice", () => {\n  const civic = read("screens/CivicProfileScreen.tsx");\n  const jobs = read("app/jobs/(tabs)/profile.tsx");\n  const hook = read("hooks/useAccountActions.ts");\n  assert.match(civic, /requestJobsPortal/);\n  assert.match(jobs, /requestCivicPortal/);\n  assert.doesNotMatch(jobs, /portal-select/);\n  assert.match(hook, /resetNavigation\("\\/jobs"\)/);\n  assert.match(hook, /resetNavigation\("\\/\(tabs\)"\)/);\n});\n\ntest("shared logout confirmation is used by civic jobs nagarsevak and super admin", () => {\n  for (const file of ["screens/CivicProfileScreen.tsx", "app/jobs/(tabs)/profile.tsx", "app/(tabs)/admin.tsx", "app/super-admin/settings.tsx"]) {\n    assert.match(read(file), /ConfirmActionModal/, file);\n    assert.match(read(file), /requestLogout/, file);\n  }\n});\n\ntest("civic profile exposes registration fields and keeps mobile read-only", () => {\n  const screen = read("screens/CivicProfileScreen.tsx");\n  assert.match(screen, /readOnlyMobile/);\n  assert.match(screen, /notifyEmail/);\n  assert.match(screen, /officeTimings/);\n  assert.match(screen, /DobDatePicker/);\n  assert.match(screen, /updateUser/);\n});\n`;
  fs.writeFileSync(path.join(root, file), content);
}

{
  const file = "backend/test/profile-security.test.js";
  const content = `"use strict";\nconst test = require("node:test");\nconst assert = require("node:assert/strict");\nconst fs = require("fs");\nconst path = require("path");\n\ntest("normal profile endpoint rejects mobile-number changes", () => {\n  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");\n  assert.match(server, /MOBILE_CHANGE_REQUIRES_REVERIFICATION/);\n  assert.match(server, /Mobile number cannot be changed from the normal profile form/);\n});\n`;
  fs.writeFileSync(path.join(root, file), content);
}

console.log("Phase-two audit codemod applied successfully.");
