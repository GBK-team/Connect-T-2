import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, value) => fs.writeFileSync(path.join(root, file), value);

function replaceOnce(text, search, replacement, file) {
  if (!text.includes(search)) throw new Error(`Expected source not found in ${file}: ${search.slice(0, 90)}`);
  return text.replace(search, replacement);
}

{
  const file = "backend/server.js";
  let text = read(file);
  text = replaceOnce(
    text,
    `    if (method === "POST" && req.path === "/") {\n      if (user.role !== "citizen" && !isOfficer && !isSuperAdmin) {`,
    `    if (method === "POST" && req.path === "/") {\n      // Multipart complaints parse their body in the dedicated upload route,\n      // which performs the same server-side identity and role derivation.\n      if (req.is("multipart/form-data")) return next();\n      if (user.role !== "citizen" && !isOfficer && !isSuperAdmin) {`,
    file,
  );
  write(file, text);
}

{
  const file = "backend/schema-hostinger.sql";
  let text = read(file);
  text = replaceOnce(
    text,
    `CREATE TABLE IF NOT EXISTS complaints (\n  id VARCHAR(100) PRIMARY KEY,`,
    `CREATE TABLE IF NOT EXISTS complaints (\n  id VARCHAR(100) PRIMARY KEY,\n  client_request_id VARCHAR(80) NULL,`,
    file,
  );
  text = replaceOnce(
    text,
    `  KEY idx_complaints_user_mobile (user_mobile),`,
    `  UNIQUE KEY uniq_complaints_client_request (client_request_id),\n  KEY idx_complaints_user_mobile (user_mobile),`,
    file,
  );
  write(file, text);
}

{
  const file = "mobile/context/ComplaintContext.tsx";
  let text = read(file);
  text = replaceOnce(text, `import { apiGet, apiPatch, apiPost } from "@/lib/api";\nimport { toUploadableMediaUri } from "@/lib/mediaUpload";`, `import { apiGet, apiPatch, apiPost, apiPostForm } from "@/lib/api";`, file);
  text = replaceOnce(
    text,
    `export type NewComplaintData = {\n  title: string;\n  description: string;\n  category: ComplaintCategory;\n  photoUri?: string;`,
    `export type ComplaintPhotoAsset = {\n  uri: string;\n  fileName?: string | null;\n  mimeType?: string | null;\n  fileSize?: number | null;\n  file?: any;\n};\n\nexport type NewComplaintData = {\n  title: string;\n  description: string;\n  category: ComplaintCategory;\n  photoUri?: string;\n  photoAsset?: ComplaintPhotoAsset;`,
    file,
  );
  const start = text.indexOf("  const addComplaint = async (data: NewComplaintData): Promise<Complaint> => {");
  const endMarker = "\n  const updateStatus = async (";
  const end = text.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Could not locate addComplaint in ${file}`);
  const replacement = `  const addComplaint = async (data: NewComplaintData): Promise<Complaint> => {\n    const now = new Date().toISOString();\n    const clientRequestId = \`cmp_\${Date.now()}_\${Math.random().toString(36).slice(2, 12)}\`;\n    const payload = {\n      title: data.title.trim(),\n      description: data.description.trim(),\n      category: data.category || "other",\n      location: data.location.trim(),\n      ward: data.ward?.trim() || "Ward Pending",\n      ward_code: data.wardCode || user?.wardCode || null,\n      assigned_officer_id: data.assignedOfficerId || null,\n      user_id: data.userId || user?.id || null,\n      user_name: data.userName || user?.name || null,\n      user_mobile: normalizeMobileValue(data.userMobile || user?.mobile) || null,\n      user_address: data.userAddress || user?.address || null,\n      user_age: data.userAge || user?.age || null,\n      user_email: data.userEmail || user?.email || null,\n      user_dob: data.userDob || user?.dob || null,\n      user_profile_photo: data.userProfilePhoto || user?.profilePhoto || null,\n      latitude: data.latitude ?? null,\n      longitude: data.longitude ?? null,\n      location_accuracy: data.locationAccuracy ?? null,\n    };\n\n    let result: any;\n    let submittedPhoto = data.photoUri;\n    if (data.photoAsset) {\n      const form = new FormData();\n      form.append("client_request_id", clientRequestId);\n      Object.entries(payload).forEach(([key, value]) => {\n        if (value !== undefined && value !== null) form.append(key, String(value));\n      });\n      if (data.photoAsset.file) {\n        form.append("photo", data.photoAsset.file);\n      } else {\n        form.append("photo", {\n          uri: data.photoAsset.uri,\n          name: data.photoAsset.fileName || \`complaint_\${Date.now()}.jpg\`,\n          type: data.photoAsset.mimeType || "image/jpeg",\n        } as any);\n      }\n      result = await apiPostForm<any>("/api/complaints", form);\n      submittedPhoto = result.photo_url || data.photoAsset.uri;\n    } else {\n      result = await apiPost<any>("/api/complaints", {\n        ...payload,\n        id: clientRequestId,\n        photo_url: null,\n      });\n    }\n\n    const created = normalizeComplaint({\n      ...payload,\n      photo_url: submittedPhoto || result.photo_url || null,\n      id: result.complaintId || result.complaint?.id || clientRequestId,\n      status: "submitted",\n      created_at: now,\n      updated_at: now,\n      timeline: buildTimeline("submitted", now),\n      ward_code: result.ward_code ?? payload.ward_code,\n      assigned_officer_id: result.assigned_officer_id ?? payload.assigned_officer_id,\n    });\n\n    setComplaints((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);\n    void refreshComplaints();\n    return created;\n  };\n`;
  text = text.slice(0, start) + replacement + text.slice(end);
  write(file, text);
}

{
  const file = "mobile/app/complaint/new.tsx";
  let text = read(file);
  text = replaceOnce(text, `import { useComplaints, ComplaintCategory } from "@/context/ComplaintContext";`, `import { useComplaints, ComplaintCategory, ComplaintPhotoAsset } from "@/context/ComplaintContext";`, file);
  text = replaceOnce(text, `  const [photoUri, setPhotoUri] = useState<string | undefined>();`, `  const [photoAsset, setPhotoAsset] = useState<ComplaintPhotoAsset | undefined>();`, file);
  text = replaceOnce(
    text,
    `  const closeNotice = () => setNotice((prev) => ({ ...prev, visible: false, onDone: undefined }));`,
    `  const closeNotice = () => setNotice((prev) => ({ ...prev, visible: false, onDone: undefined }));\n\n  const acceptPhoto = (asset: ImagePicker.ImagePickerAsset) => {\n    const mimeType = String(asset.mimeType || "").toLowerCase();\n    const fileName = asset.fileName || \`complaint_\${Date.now()}.jpg\`;\n    const extension = fileName.split(".").pop()?.toLowerCase();\n    const inferredMime = mimeType || (extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : ["jpg", "jpeg"].includes(extension || "") ? "image/jpeg" : "");\n    if (!['image/jpeg', 'image/png', 'image/webp'].includes(inferredMime)) {\n      showNotice("Unsupported image", "Choose a JPEG, PNG or WebP image.", "danger");\n      return;\n    }\n    if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {\n      showNotice("Image too large", "Choose an image smaller than 8MB. Camera photos are compressed automatically.", "danger");\n      return;\n    }\n    setPhotoAsset({\n      uri: asset.uri,\n      fileName,\n      mimeType: inferredMime,\n      fileSize: asset.fileSize,\n      file: asset.file,\n    });\n  };`,
    file,
  );
  text = replaceOnce(text, `if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);`, `if (!result.canceled && result.assets[0]) acceptPhoto(result.assets[0]);`, file);
  text = replaceOnce(text, `if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);`, `if (!result.canceled && result.assets[0]) acceptPhoto(result.assets[0]);`, file);
  text = replaceOnce(
    text,
    `  const handleGallery = async () => {\n    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });\n    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);\n  };`,
    `  const handleGallery = async () => {\n    if (Platform.OS !== "web") {\n      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();\n      if (!permission.granted) {\n        showNotice("Photo permission needed", "Allow photo access to attach an image. You can still submit without one.");\n        return;\n      }\n    }\n    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });\n    if (!result.canceled && result.assets[0]) acceptPhoto(result.assets[0]);\n  };`,
    file,
  );
  text = replaceOnce(text, `        photoUri,`, `        photoAsset,`, file);
  text = text.replace(`      console.error("Complaint submit failed", error);\n`, "");
  text = replaceOnce(
    text,
    `{photoUri ? <View style={styles.photoContainer}><Image source={{ uri: photoUri }} style={styles.photo} /><TouchableOpacity style={styles.retakeBtn} onPress={handleCamera} activeOpacity={0.8}><Feather name="refresh-cw" size={14} color="white" /><Text style={styles.retakeBtnText}>{t("retake")}</Text></TouchableOpacity></View> :`,
    `{photoAsset ? <View style={styles.photoContainer}><Image source={{ uri: photoAsset.uri }} style={styles.photo} /><TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoAsset(undefined)} activeOpacity={0.8} accessibilityLabel="Remove complaint image"><Feather name="x" size={16} color="white" /></TouchableOpacity><TouchableOpacity style={styles.retakeBtn} onPress={handleCamera} activeOpacity={0.8}><Feather name="refresh-cw" size={14} color="white" /><Text style={styles.retakeBtnText}>{t("retake")}</Text></TouchableOpacity></View> :`,
    file,
  );
  text = replaceOnce(
    text,
    `{submitting ? <ActivityIndicator color="white" /> : <><Feather name="send" size={18} color="white" /><Text style={styles.submitBtnText}>{t("submitComplaint")}</Text></>}`,
    `{submitting ? <><ActivityIndicator color="white" /><Text style={styles.submitBtnText}>{photoAsset ? "Uploading image..." : "Submitting..."}</Text></> : <><Feather name="send" size={18} color="white" /><Text style={styles.submitBtnText}>{t("submitComplaint")}</Text></>}`,
    file,
  );
  text = replaceOnce(
    text,
    `  retakeBtn: { position: "absolute", bottom: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },`,
    `  retakeBtn: { position: "absolute", bottom: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, minHeight: 40 },\n  removePhotoBtn: { position: "absolute", top: 10, right: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(220,38,38,0.9)", alignItems: "center", justifyContent: "center" },`,
    file,
  );
  write(file, text);
}

{
  const file = "backend/test/auth-security.test.js";
  let text = read(file);
  if (!text.includes("replacement OTP supersedes")) {
    text += `\n\ntest("replacement OTP supersedes the previous session", async () => {\n  const originalNow = Date.now;\n  let now = 1_800_000_000_000;\n  Date.now = () => now;\n  const codes = [];\n  try {\n    const first = await sendOtp({\n      mobile: "9988776655",\n      purpose: "login",\n      sendSms: async (_mobile, code) => codes.push(code),\n    });\n    now += 46_000;\n    const second = await sendOtp({\n      mobile: "9988776655",\n      purpose: "login",\n      sendSms: async (_mobile, code) => codes.push(code),\n    });\n    assert.throws(() => verifyOtp({ mobile: "9988776655", purpose: "login", code: codes[0], sessionToken: first.sessionToken }), /Invalid or expired OTP/);\n    assert.equal(verifyOtp({ mobile: "9988776655", purpose: "login", code: codes[1], sessionToken: second.sessionToken }).mobile, "9988776655");\n  } finally {\n    Date.now = originalNow;\n  }\n});\n`;
  }
  write(file, text);
}

{
  const file = "mobile/test/production-audit-phase1.test.mjs";
  const content = `import test from "node:test";\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\nimport path from "node:path";\nimport { fileURLToPath } from "node:url";\n\nconst root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");\nconst read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");\n\ntest("OTP UI has persistent resend timing and duplicate-submit guards", () => {\n  const login = read("app/login.tsx");\n  const otpApi = read("lib/otpApi.ts");\n  assert.match(login, /Resend OTP in/);\n  assert.match(login, /getOtpSessionState/);\n  assert.match(login, /if \(loading \|\| resending\) return/);\n  assert.match(otpApi, /resendAt/);\n  assert.match(otpApi, /secureSessionStorage/);\n});\n\ntest("complaint photos use multipart transport instead of JSON base64", () => {\n  const context = read("context/ComplaintContext.tsx");\n  const screen = read("app/complaint/new.tsx");\n  assert.match(context, /apiPostForm/);\n  assert.match(context, /form\.append\("photo"/);\n  assert.doesNotMatch(context, /toUploadableMediaUri\(data\.photoUri\)/);\n  assert.match(screen, /Remove complaint image/);\n  assert.match(screen, /Uploading image/);\n});\n`;
  fs.writeFileSync(path.join(root, file), content);
}

console.log("Phase-one audit codemod applied successfully.");
