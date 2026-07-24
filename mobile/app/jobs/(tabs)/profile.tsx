import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScrollView } from "@/components/AppScrollView";
import ConfirmActionModal from "@/components/ConfirmActionModal";
import DecorativeCircles from "@/components/DecorativeCircles";
import DobDatePicker from "@/components/DobDatePicker";
import TopShade from "@/components/TopShade";
import { CurrentStatus, JobsUser, useJobsAuth } from "@/context/JobsAuthContext";
import { apiGet, apiPost, getUserErrorMessage } from "@/lib/api";
import { useAccountActions } from "@/hooks/useAccountActions";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#EBEFFC";
const GREEN = "#059669";
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

type RoleRequest = {
  id: string;
  currentRole: "seeker" | "employer";
  targetRole: "seeker" | "employer";
  reason: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
};

type ProfileForm = {
  name: string;
  email: string;
  dob: string;
  location: string;
  profilePhoto?: string | null;
  qualification: string;
  skills: string;
  experience: string;
  languages: string;
  about: string;
  currentStatus: CurrentStatus;
  currentCompany: string;
  currentRole: string;
  previousCompany: string;
  previousRole: string;
  collegeName: string;
  fieldOfStudy: string;
  company: string;
  contactPerson: string;
  industry: string;
  companyType: string;
  companySize: string;
  companyDescription: string;
  address: string;
  pincode: string;
  whatsapp: string;
  website: string;
  gstNo: string;
  yearEstablished: string;
};

function formFromUser(user: JobsUser): ProfileForm {
  return {
    name: user.name || "",
    email: user.email || "",
    dob: user.dob || "",
    location: user.location || user.address || "",
    profilePhoto: user.profilePhoto ?? null,
    qualification: user.qualification || "",
    skills: user.skills || "",
    experience: user.experience || "",
    languages: user.languages || "",
    about: user.about || "",
    currentStatus: user.currentStatus || "unemployed",
    currentCompany: user.currentCompany || "",
    currentRole: user.currentRole || "",
    previousCompany: user.previousCompany || "",
    previousRole: user.previousRole || "",
    collegeName: user.collegeName || "",
    fieldOfStudy: user.fieldOfStudy || "",
    company: user.company || "",
    contactPerson: user.contactPerson || user.name || "",
    industry: user.industry || "",
    companyType: user.companyType || "",
    companySize: user.companySize || "",
    companyDescription: user.companyDescription || "",
    address: user.address || user.location || "",
    pincode: user.pincode || "",
    whatsapp: user.whatsapp || user.phone || "",
    website: user.website || "",
    gstNo: user.gstNo || "",
    yearEstablished: user.yearEstablished || "",
  };
}

function initials(name?: string) {
  return String(name || "CT").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function isValidEmail(value: string) {
  return !value.trim() || /^\S+@\S+\.\S+$/.test(value.trim());
}

function isValidDob(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}

function Input({ label, multiline, help, ...props }: React.ComponentProps<typeof TextInput> & { label: string; help?: string }) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor="#94A3B8"
        style={[s.input, multiline && s.textArea, props.style]}
        returnKeyType={multiline ? "default" : "next"}
        blurOnSubmit={!multiline}
      />
      {help ? <Text style={s.help}>{help}</Text> : null}
    </View>
  );
}

function ReadOnlyMobile({ phone }: { phone: string }) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>Verified Mobile Number</Text>
      <View style={s.readOnly}><Feather name="lock" size={14} color="#64748B" /><Text style={s.readOnlyText}>+91 {phone}</Text><View style={s.verified}><Feather name="check-circle" size={10} color={GREEN} /><Text style={s.verifiedText}>Verified</Text></View></View>
      <Text style={s.help}>This number is shared with the verified Connect-T citizen account and cannot be edited here.</Text>
    </View>
  );
}

function Detail({ icon, label, value, verified }: { icon: keyof typeof Feather.glyphMap; label: string; value?: string | null; verified?: boolean }) {
  return (
    <View style={s.detail}>
      <View style={s.detailIcon}><Feather name={icon} size={15} color={ORANGE} /></View>
      <View style={{ flex: 1, minWidth: 0 }}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{value || "Not added"}</Text></View>
      {verified ? <View style={s.verified}><Feather name="check-circle" size={10} color={GREEN} /><Text style={s.verifiedText}>Verified</Text></View> : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <><Text style={s.sectionTitle}>{title}</Text><View style={s.card}>{children}</View></>;
}

function Notice({ visible, title, message, tone, onClose }: { visible: boolean; title: string; message: string; tone: "success" | "danger" | "info"; onClose: () => void }) {
  const color = tone === "success" ? GREEN : tone === "danger" ? "#DC2626" : ORANGE;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}><View style={s.noticeCard}>
        <View style={[s.noticeIcon, { backgroundColor: `${color}14` }]}><Feather name={tone === "success" ? "check-circle" : tone === "danger" ? "alert-circle" : "info"} size={27} color={color} /></View>
        <Text style={s.noticeTitle}>{title}</Text><Text style={s.noticeText}>{message}</Text>
        <TouchableOpacity style={[s.noticeButton, { backgroundColor: color }]} onPress={onClose}><Text style={s.noticeButtonText}>OK</Text></TouchableOpacity>
      </View></View>
    </Modal>
  );
}

export default function JobPortalProfileScreen() {
  const insets = useSafeAreaInsets();
  const { jobsUser, updateJobsUser } = useJobsAuth();
  const accountActions = useAccountActions();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [roleRequest, setRoleRequest] = useState<RoleRequest | null>(null);
  const [notice, setNotice] = useState({ visible: false, title: "", message: "", tone: "info" as "success" | "danger" | "info" });
  const [form, setForm] = useState<ProfileForm | null>(jobsUser ? formFromUser(jobsUser) : null);

  const isEmployer = jobsUser?.role === "employer";
  const roleLabel = isEmployer ? "Employer" : "Job Seeker";
  const targetRoleLabel = isEmployer ? "Job Seeker" : "Employer";

  useEffect(() => {
    if (!jobsUser) return;
    if (!editing) setForm(formFromUser(jobsUser));
    void apiGet<{ request: RoleRequest | null }>("/api/job-portal/role-change-requests/me")
      .then((result) => setRoleRequest(result.request || null))
      .catch(() => undefined);
  }, [editing, jobsUser?.id]);

  const details = useMemo(() => {
    if (!jobsUser) return { personal: [], professional: [] };
    const personal = [
      { icon: "user" as const, label: "Full Name", value: jobsUser.name },
      { icon: "phone" as const, label: "Verified Mobile", value: `+91 ${jobsUser.phone}`, verified: true },
      { icon: "mail" as const, label: "Email", value: jobsUser.email },
      { icon: "calendar" as const, label: "Date of Birth", value: jobsUser.dob },
    ];
    const professional = isEmployer ? [
      { icon: "briefcase" as const, label: "Company / Business", value: jobsUser.company },
      { icon: "user-check" as const, label: "Contact Person", value: jobsUser.contactPerson },
      { icon: "activity" as const, label: "Industry", value: jobsUser.industry },
      { icon: "layers" as const, label: "Business Type", value: jobsUser.companyType },
      { icon: "users" as const, label: "Company Size", value: jobsUser.companySize },
      { icon: "file-text" as const, label: "Business Description", value: jobsUser.companyDescription },
      { icon: "map-pin" as const, label: "Business Address", value: jobsUser.address || jobsUser.location },
      { icon: "hash" as const, label: "PIN Code", value: jobsUser.pincode },
      { icon: "message-circle" as const, label: "WhatsApp", value: jobsUser.whatsapp ? `+91 ${jobsUser.whatsapp}` : undefined },
      { icon: "globe" as const, label: "Website", value: jobsUser.website },
      { icon: "shield" as const, label: "GST / Registration", value: jobsUser.gstNo },
      { icon: "calendar" as const, label: "Established", value: jobsUser.yearEstablished },
    ] : [
      { icon: "award" as const, label: "Qualification", value: jobsUser.qualification },
      { icon: "tool" as const, label: "Skills", value: jobsUser.skills },
      { icon: "activity" as const, label: "Current Status", value: jobsUser.currentStatus },
      ...(jobsUser.currentStatus === "employed" ? [
        { icon: "briefcase" as const, label: "Current Company", value: jobsUser.currentCompany },
        { icon: "user-check" as const, label: "Current Role", value: jobsUser.currentRole },
      ] : []),
      ...(jobsUser.currentStatus === "student" ? [
        { icon: "book-open" as const, label: "College", value: jobsUser.collegeName },
        { icon: "bookmark" as const, label: "Field of Study", value: jobsUser.fieldOfStudy },
      ] : []),
      { icon: "clock" as const, label: "Experience", value: jobsUser.experience },
      { icon: "archive" as const, label: "Previous Company", value: jobsUser.previousCompany },
      { icon: "clipboard" as const, label: "Previous Role", value: jobsUser.previousRole },
      { icon: "target" as const, label: "Objective / Preferred Job", value: jobsUser.about },
      { icon: "message-square" as const, label: "Languages", value: jobsUser.languages },
      { icon: "map-pin" as const, label: "Preferred Location", value: jobsUser.location },
    ];
    return { personal, professional };
  }, [isEmployer, jobsUser]);

  if (!jobsUser || !form) return <View style={s.center}><ActivityIndicator color={ORANGE} /><Text style={s.loadingText}>Loading profile...</Text></View>;

  const showNotice = (title: string, message: string, tone: "success" | "danger" | "info" = "info") => setNotice({ visible: true, title, message, tone });
  const setField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setForm((current) => current ? { ...current, [key]: value } : current);

  const pickPhoto = async () => {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return showNotice("Photo permission needed", "Allow photo access to choose a Job Portal profile image.", "danger");
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.55 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    const mime = String(asset.mimeType || "").toLowerCase();
    if (mime && !["image/jpeg", "image/png", "image/webp"].includes(mime)) return showNotice("Unsupported image", "Choose a JPEG, PNG or WebP image.", "danger");
    if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) return showNotice("Image too large", "Choose a profile image smaller than 8MB.", "danger");
    setField("profilePhoto", asset.uri);
  };

  const save = async () => {
    if (saving) return;
    if (form.name.trim().split(/\s+/).filter(Boolean).length < 2) return showNotice("Check full name", "Enter your full name, including surname.", "danger");
    if (!isValidEmail(form.email)) return showNotice("Check email", "Enter a valid email address.", "danger");
    if (!isValidDob(form.dob)) return showNotice("Check date of birth", "Select a valid date of birth.", "danger");

    if (isEmployer) {
      if (form.company.trim().length < 2) return showNotice("Company required", "Enter your company, shop or business name.", "danger");
      if (form.contactPerson.trim().split(/\s+/).filter(Boolean).length < 2) return showNotice("Contact person required", "Enter the contact person's full name.", "danger");
      if (!form.address.trim()) return showNotice("Address required", "Enter the complete business address.", "danger");
      if (form.whatsapp && form.whatsapp.replace(/\D/g, "").length !== 10) return showNotice("Check WhatsApp number", "Enter a valid 10-digit WhatsApp number.", "danger");
      if (form.pincode && !/^\d{6}$/.test(form.pincode)) return showNotice("Check PIN code", "Enter a valid 6-digit PIN code.", "danger");
      const year = Number(form.yearEstablished);
      if (form.yearEstablished && (!/^\d{4}$/.test(form.yearEstablished) || year < 1800 || year > new Date().getFullYear())) return showNotice("Check establishment year", "Enter a valid four-digit year.", "danger");
    } else {
      if (form.qualification.trim().length < 2) return showNotice("Qualification required", "Add your highest qualification.", "danger");
      if (form.currentStatus === "employed" && (!form.currentCompany.trim() || !form.currentRole.trim())) return showNotice("Employment details required", "Add your current company and role.", "danger");
      if (form.currentStatus === "student" && (!form.collegeName.trim() || !form.fieldOfStudy.trim())) return showNotice("Education details required", "Add your college and field of study.", "danger");
    }

    setSaving(true);
    try {
      const common: Partial<JobsUser> = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        dob: form.dob || undefined,
        profilePhoto: form.profilePhoto,
      };
      await updateJobsUser(isEmployer ? {
        ...common,
        company: form.company.trim(),
        contactPerson: form.contactPerson.trim(),
        industry: form.industry.trim() || undefined,
        companyType: form.companyType.trim() || undefined,
        companySize: form.companySize.trim() || undefined,
        companyDescription: form.companyDescription.trim() || undefined,
        address: form.address.trim(),
        location: form.address.trim(),
        pincode: form.pincode || undefined,
        whatsapp: form.whatsapp.replace(/\D/g, "").slice(-10) || jobsUser.phone,
        website: form.website.trim() || undefined,
        gstNo: form.gstNo.trim() || undefined,
        yearEstablished: form.yearEstablished || undefined,
      } : {
        ...common,
        qualification: form.qualification.trim(),
        skills: form.skills.trim() || undefined,
        currentStatus: form.currentStatus,
        currentCompany: form.currentStatus === "employed" ? form.currentCompany.trim() : undefined,
        currentRole: form.currentStatus === "employed" ? form.currentRole.trim() : undefined,
        collegeName: form.currentStatus === "student" ? form.collegeName.trim() : undefined,
        fieldOfStudy: form.currentStatus === "student" ? form.fieldOfStudy.trim() : undefined,
        experience: form.currentStatus === "fresher" ? undefined : form.experience.trim() || undefined,
        previousCompany: form.previousCompany.trim() || undefined,
        previousRole: form.previousRole.trim() || undefined,
        languages: form.languages.trim() || undefined,
        about: form.about.trim() || undefined,
        location: form.location.trim() || undefined,
      });
      setEditing(false);
      showNotice("Profile saved", "Your Job Portal profile has been updated successfully.", "success");
    } catch (error) {
      showNotice("Profile not saved", getUserErrorMessage(error, "Please try again after some time."), "danger");
    } finally {
      setSaving(false);
    }
  };

  const submitRoleRequest = async () => {
    if (reason.trim().length < 10) return showNotice("More detail required", "Explain the genuine reason for this role correction in at least 10 characters.", "danger");
    setRequestLoading(true);
    try {
      const result = await apiPost<{ request: RoleRequest; message?: string }>("/api/job-portal/role-change-requests", { targetRole: isEmployer ? "seeker" : "employer", reason: reason.trim() });
      setRoleRequest(result.request);
      setShowRequest(false);
      setReason("");
      showNotice("Request submitted", result.message || "Your request was sent to the Super Admin.", "success");
    } catch (error) {
      showNotice("Request not submitted", getUserErrorMessage(error, "Please try again after some time."), "danger");
    } finally {
      setRequestLoading(false);
    }
  };

  const requestColor = roleRequest?.status === "approved" ? GREEN : roleRequest?.status === "rejected" ? "#DC2626" : "#D97706";

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#FB923C"]} style={[s.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <TopShade height={110} /><DecorativeCircles />
        <View style={s.profileRow}>
          <TouchableOpacity style={s.avatar} onPress={editing ? pickPhoto : undefined} accessibilityLabel={editing ? "Change profile photo" : undefined}>
            {form.profilePhoto ? <Image source={{ uri: form.profilePhoto }} style={s.avatarImage} /> : <Text style={s.avatarText}>{initials(form.name)}</Text>}
            {editing ? <View style={s.cameraBadge}><Feather name="camera" size={11} color="white" /></View> : null}
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}><Text style={s.name} numberOfLines={2}>{jobsUser.name}</Text><View style={s.rolePill}><Feather name={isEmployer ? "briefcase" : "user"} size={11} color="white" /><Text style={s.rolePillText}>{roleLabel}</Text><Feather name="lock" size={10} color="rgba(255,255,255,0.8)" /></View><Text style={s.phone}>+91 {jobsUser.phone}</Text></View>
          <TouchableOpacity style={s.editButton} onPress={() => { setForm(formFromUser(jobsUser)); setEditing((value) => !value); }} accessibilityLabel={editing ? "Cancel profile editing" : "Edit profile"}><Feather name={editing ? "x" : "edit-2"} size={17} color={ORANGE} /></TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}>
        <AppScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 120 }]} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
          {editing ? (
            <View style={s.formCard}>
              <Text style={s.sectionTitle}>EDIT {roleLabel.toUpperCase()} PROFILE</Text>
              <View style={s.photoActions}><TouchableOpacity style={s.photoAction} onPress={pickPhoto}><Feather name="image" size={15} color={ORANGE} /><Text style={s.photoActionText}>Change photo</Text></TouchableOpacity><TouchableOpacity style={[s.photoAction, s.removeAction]} onPress={() => setField("profilePhoto", null)}><Feather name="trash-2" size={15} color="#DC2626" /><Text style={[s.photoActionText, { color: "#DC2626" }]}>Remove photo</Text></TouchableOpacity></View>
              <Input label="Full Name *" value={form.name} onChangeText={(value) => setField("name", value)} placeholder="Full name" autoCapitalize="words" maxLength={160} />
              <ReadOnlyMobile phone={jobsUser.phone} />
              <Input label="Email" value={form.email} onChangeText={(value) => setField("email", value)} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" maxLength={190} />
              <View style={s.inputGroup}><DobDatePicker label="Date of Birth" value={form.dob} onChange={(value) => setField("dob", value)} placeholder="Select date of birth" /></View>

              {isEmployer ? <>
                <Input label="Company / Business Name *" value={form.company} onChangeText={(value) => setField("company", value)} placeholder="Business name" maxLength={190} />
                <Input label="Contact Person *" value={form.contactPerson} onChangeText={(value) => setField("contactPerson", value)} placeholder="Owner / HR full name" autoCapitalize="words" maxLength={160} />
                <Input label="Industry" value={form.industry} onChangeText={(value) => setField("industry", value)} placeholder="Retail, Restaurant, Construction..." maxLength={120} />
                <Input label="Business Type" value={form.companyType} onChangeText={(value) => setField("companyType", value)} placeholder="Proprietorship, Company, Shop..." maxLength={80} />
                <Input label="Company Size" value={form.companySize} onChangeText={(value) => setField("companySize", value)} placeholder="1–10, 11–50, 51–200..." maxLength={80} />
                <Input label="Business Description" value={form.companyDescription} onChangeText={(value) => setField("companyDescription", value)} placeholder="About your business and hiring needs" multiline maxLength={3000} />
                <Input label="Complete Business Address *" value={form.address} onChangeText={(value) => setField("address", value)} placeholder="Office/shop address" multiline maxLength={1500} />
                <Input label="PIN Code" value={form.pincode} onChangeText={(value) => setField("pincode", value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit PIN code" keyboardType="number-pad" maxLength={6} />
                <Input label="WhatsApp Number" value={form.whatsapp} onChangeText={(value) => setField("whatsapp", value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit number" keyboardType="phone-pad" maxLength={10} />
                <Input label="Website" value={form.website} onChangeText={(value) => setField("website", value)} placeholder="www.company.com" autoCapitalize="none" maxLength={190} />
                <Input label="GST / Business Registration" value={form.gstNo} onChangeText={(value) => setField("gstNo", value.toUpperCase())} placeholder="Optional registration number" maxLength={64} />
                <Input label="Year Established" value={form.yearEstablished} onChangeText={(value) => setField("yearEstablished", value.replace(/\D/g, "").slice(0, 4))} placeholder="YYYY" keyboardType="number-pad" maxLength={4} />
              </> : <>
                <Input label="Qualification *" value={form.qualification} onChangeText={(value) => setField("qualification", value)} placeholder="Highest qualification" maxLength={160} />
                <Input label="Skills" value={form.skills} onChangeText={(value) => setField("skills", value)} placeholder="Your key skills" multiline maxLength={2000} />
                <Text style={s.label}>Current Status</Text><View style={s.chips}>{(["fresher", "student", "unemployed", "employed"] as CurrentStatus[]).map((status) => <TouchableOpacity key={status} style={[s.chip, form.currentStatus === status && s.chipActive]} onPress={() => setField("currentStatus", status)}><Text style={[s.chipText, form.currentStatus === status && s.chipTextActive]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text></TouchableOpacity>)}</View>
                {form.currentStatus === "employed" ? <><Input label="Current Company *" value={form.currentCompany} onChangeText={(value) => setField("currentCompany", value)} placeholder="Company name" maxLength={190} /><Input label="Current Role *" value={form.currentRole} onChangeText={(value) => setField("currentRole", value)} placeholder="Job title" maxLength={160} /></> : null}
                {form.currentStatus === "student" ? <><Input label="College Name *" value={form.collegeName} onChangeText={(value) => setField("collegeName", value)} placeholder="College / institute" maxLength={190} /><Input label="Field of Study *" value={form.fieldOfStudy} onChangeText={(value) => setField("fieldOfStudy", value)} placeholder="Course / specialization" maxLength={190} /></> : null}
                {form.currentStatus !== "fresher" ? <Input label="Work Experience" value={form.experience} onChangeText={(value) => setField("experience", value)} placeholder="Total experience and key work" multiline maxLength={2000} /> : null}
                <Input label="Previous Company" value={form.previousCompany} onChangeText={(value) => setField("previousCompany", value)} placeholder="Previous employer" maxLength={190} />
                <Input label="Previous Role" value={form.previousRole} onChangeText={(value) => setField("previousRole", value)} placeholder="Previous job title" maxLength={160} />
                <Input label="Preferred Job / Career Objective" value={form.about} onChangeText={(value) => setField("about", value)} placeholder="Describe the work you are seeking" multiline maxLength={3000} />
                <Input label="Languages" value={form.languages} onChangeText={(value) => setField("languages", value)} placeholder="Marathi, Hindi, English" maxLength={190} />
                <Input label="Preferred Work Location" value={form.location} onChangeText={(value) => setField("location", value)} placeholder="Badlapur East / West" maxLength={190} />
              </>}
              <View style={s.actions}><TouchableOpacity style={s.secondary} onPress={() => { setForm(formFromUser(jobsUser)); setEditing(false); }}><Text style={s.secondaryText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[s.primary, saving && { opacity: 0.65 }]} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="white" /> : <><Feather name="check" size={15} color="white" /><Text style={s.primaryText}>Save Profile</Text></>}</TouchableOpacity></View>
            </View>
          ) : <>
            <Section title="PERSONAL & VERIFIED DETAILS">{details.personal.map((item) => <Detail key={item.label} {...item} />)}</Section>
            <Section title={isEmployer ? "BUSINESS DETAILS" : "PROFESSIONAL DETAILS"}>{details.professional.map((item) => <Detail key={item.label} {...item} />)}</Section>
            <Text style={s.sectionTitle}>JOB PORTAL ROLE</Text><View style={s.roleCard}><View style={s.roleTop}><View style={s.lockIcon}><Feather name="lock" size={18} color={ORANGE} /></View><View style={{ flex: 1 }}><Text style={s.roleSmall}>ACTIVE ROLE</Text><Text style={s.roleTitle}>{roleLabel}</Text></View><View style={s.lockBadge}><Text style={s.lockBadgeText}>LOCKED</Text></View></View><Text style={s.roleDescription}>Direct switching is disabled to protect jobs, applications and verified identity.</Text>{roleRequest ? <View style={[s.requestStatus, { borderColor: `${requestColor}40`, backgroundColor: `${requestColor}0D` }]}><Text style={[s.requestTitle, { color: requestColor }]}>Role request {roleRequest.status}</Text><Text style={s.requestText}>{roleLabel} → {targetRoleLabel}</Text>{roleRequest.adminNote ? <Text style={s.adminNote}>Admin note: {roleRequest.adminNote}</Text> : null}</View> : <TouchableOpacity style={s.requestButton} onPress={() => setShowRequest(true)}><Feather name="send" size={14} color="white" /><Text style={s.requestButtonText}>Request change to {targetRoleLabel}</Text></TouchableOpacity>}</View>
            <Text style={s.sectionTitle}>ACCOUNT ACTIONS</Text><View style={s.card}><TouchableOpacity style={s.actionRow} onPress={accountActions.requestCivicPortal}><Feather name="repeat" size={16} color={ORANGE} /><View style={{ flex: 1 }}><Text style={s.actionTitle}>Switch to Civic Portal</Text><Text style={s.actionSub}>Open Civic Services directly with the same verified login</Text></View><Feather name="chevron-right" size={17} color="#CBD5E1" /></TouchableOpacity><TouchableOpacity style={s.actionRow} onPress={accountActions.requestLogout}><Feather name="log-out" size={16} color="#DC2626" /><View style={{ flex: 1 }}><Text style={[s.actionTitle, { color: "#DC2626" }]}>Logout from Connect T</Text><Text style={s.actionSub}>Securely clear Civic and Job Portal sessions</Text></View><Feather name="chevron-right" size={17} color="#CBD5E1" /></TouchableOpacity></View>
          </>}
        </AppScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showRequest} transparent animationType="slide" onRequestClose={() => setShowRequest(false)}>
        <KeyboardAvoidingView style={s.modalFlex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}>
          <View style={s.sheetOverlay}><View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <View style={s.handle} /><View style={s.sheetHeader}><View><Text style={s.sheetTitle}>Request Role Correction</Text><Text style={s.sheetSub}>{roleLabel} → {targetRoleLabel}</Text></View><TouchableOpacity style={s.close} onPress={() => setShowRequest(false)}><Feather name="x" size={18} color="#64748B" /></TouchableOpacity></View>
            <AppScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 30 }} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
              <View style={s.warning}><Feather name="alert-triangle" size={15} color="#D97706" /><Text style={s.warningText}>Super Admin approval is required. Existing records remain protected.</Text></View>
              <Input label="Reason for role change *" value={reason} onChangeText={setReason} placeholder="Explain why this correction is required" multiline autoFocus />
              <View style={s.actions}><TouchableOpacity style={s.secondary} onPress={() => setShowRequest(false)}><Text style={s.secondaryText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[s.primary, requestLoading && { opacity: 0.65 }]} onPress={submitRoleRequest} disabled={requestLoading}>{requestLoading ? <ActivityIndicator color="white" /> : <><Feather name="send" size={14} color="white" /><Text style={s.primaryText}>Submit Request</Text></>}</TouchableOpacity></View>
            </AppScrollView>
          </View></View>
        </KeyboardAvoidingView>
      </Modal>
      <ConfirmActionModal visible={!!accountActions.pendingAction} title={accountActions.pendingAction === "logout" ? "Logout from Connect-T?" : "Switch to Civic Portal?"} message={accountActions.pendingAction === "logout" ? "This will securely clear Civic and Job Portal sessions on this device. Your account, jobs and applications will not be deleted." : "Your verified login will remain active and Civic Services will open directly."} confirmLabel={accountActions.pendingAction === "logout" ? "Logout" : "Switch portal"} icon={accountActions.pendingAction === "logout" ? "log-out" : "repeat"} tone={accountActions.pendingAction === "logout" ? "danger" : "primary"} busy={accountActions.busy} onCancel={accountActions.cancelAction} onConfirm={accountActions.runPendingAction} />
      <Notice visible={notice.visible} title={notice.title} message={notice.message} tone={notice.tone} onClose={() => setNotice((current) => ({ ...current, visible: false }))} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG }, flex: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG }, loadingText: { marginTop: 8, color: "#64748B", fontFamily: "Inter_500Medium" },
  header: { paddingHorizontal: 18, paddingBottom: 17, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" }, profileRow: { flexDirection: "row", alignItems: "center", gap: 12 }, avatar: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" }, avatarImage: { width: 58, height: 58, borderRadius: 29 }, avatarText: { color: "white", fontSize: 21, fontFamily: "Inter_700Bold" }, cameraBadge: { position: "absolute", right: 0, bottom: 0, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: ORANGE, borderWidth: 2, borderColor: "white" }, name: { color: "white", fontSize: 19, fontFamily: "Inter_700Bold" }, rolePill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)" }, rolePillText: { color: "white", fontSize: 10, fontFamily: "Inter_700Bold" }, phone: { marginTop: 4, color: "rgba(255,255,255,0.72)", fontSize: 10.5, fontFamily: "Inter_400Regular" }, editButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  content: { padding: 15, gap: 11 }, sectionTitle: { marginTop: 4, marginBottom: -2, color: "#94A3B8", fontSize: 9.8, letterSpacing: 1.1, fontFamily: "Inter_700Bold" }, card: { borderRadius: 18, overflow: "hidden", backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" }, detail: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" }, detailIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED" }, detailLabel: { color: "#94A3B8", fontSize: 9.8, fontFamily: "Inter_400Regular" }, detailValue: { marginTop: 2, color: "#0F172A", fontSize: 12.5, lineHeight: 18, fontFamily: "Inter_700Bold" }, verified: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: "#DCFCE7" }, verifiedText: { color: GREEN, fontSize: 8.5, fontFamily: "Inter_700Bold" },
  formCard: { padding: 15, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" }, inputGroup: { marginBottom: 12 }, label: { marginBottom: 6, color: "#475569", fontSize: 10.5, fontFamily: "Inter_700Bold" }, input: { minHeight: 46, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", color: "#0F172A", fontSize: 12.5, fontFamily: "Inter_500Medium" }, textArea: { minHeight: 102, paddingTop: 12 }, help: { marginTop: 5, color: "#94A3B8", fontSize: 9.5, lineHeight: 14, fontFamily: "Inter_400Regular" }, readOnly: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: 13, backgroundColor: "#F1F5F9" }, readOnlyText: { flex: 1, color: "#475569", fontSize: 12.5, fontFamily: "Inter_700Bold" }, photoActions: { flexDirection: "row", gap: 8, marginBottom: 14 }, photoAction: { flex: 1, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: "#FFF7ED" }, removeAction: { backgroundColor: "#FEF2F2" }, photoActionText: { color: ORANGE, fontSize: 10.5, fontFamily: "Inter_700Bold" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 12 }, chip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: "#F1F5F9" }, chipActive: { backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, chipText: { color: "#64748B", fontSize: 9.8, fontFamily: "Inter_600SemiBold" }, chipTextActive: { color: ORANGE }, actions: { flexDirection: "row", gap: 8, marginTop: 2 }, secondary: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#F1F5F9" }, secondaryText: { color: "#64748B", fontSize: 11.5, fontFamily: "Inter_700Bold" }, primary: { flex: 1.4, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 13, backgroundColor: ORANGE }, primaryText: { color: "white", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  roleCard: { padding: 15, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" }, roleTop: { flexDirection: "row", alignItems: "center", gap: 10 }, lockIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED" }, roleSmall: { color: "#94A3B8", fontSize: 8.8, letterSpacing: 1, fontFamily: "Inter_700Bold" }, roleTitle: { marginTop: 2, color: "#0F172A", fontSize: 15, fontFamily: "Inter_700Bold" }, lockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#F1F5F9" }, lockBadgeText: { color: "#64748B", fontSize: 8.5, fontFamily: "Inter_700Bold" }, roleDescription: { marginTop: 10, color: "#64748B", fontSize: 10.5, lineHeight: 16, fontFamily: "Inter_400Regular" }, requestButton: { marginTop: 12, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 13, backgroundColor: ORANGE }, requestButtonText: { color: "white", fontSize: 11, fontFamily: "Inter_700Bold" }, requestStatus: { marginTop: 12, padding: 11, borderRadius: 13, borderWidth: 1 }, requestTitle: { fontSize: 11, textTransform: "capitalize", fontFamily: "Inter_700Bold" }, requestText: { marginTop: 3, color: "#475569", fontSize: 10.5, fontFamily: "Inter_500Medium" }, adminNote: { marginTop: 5, color: "#64748B", fontSize: 10, fontFamily: "Inter_400Regular" }, actionRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" }, actionTitle: { color: "#0F172A", fontSize: 12, fontFamily: "Inter_700Bold" }, actionSub: { marginTop: 2, color: "#94A3B8", fontSize: 9.8, fontFamily: "Inter_400Regular" },
  modalFlex: { flex: 1 }, sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.48)" }, sheet: { maxHeight: "82%", padding: 17, borderTopLeftRadius: 25, borderTopRightRadius: 25, backgroundColor: "white" }, handle: { width: 42, height: 4, marginBottom: 14, alignSelf: "center", borderRadius: 2, backgroundColor: "#CBD5E1" }, sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, sheetTitle: { color: "#0F172A", fontSize: 17, fontFamily: "Inter_700Bold" }, sheetSub: { marginTop: 2, color: ORANGE, fontSize: 10.5, fontFamily: "Inter_600SemiBold" }, close: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" }, warning: { marginBottom: 12, flexDirection: "row", alignItems: "flex-start", gap: 7, padding: 10, borderRadius: 12, backgroundColor: "#FFFBEB" }, warningText: { flex: 1, color: "#92400E", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 22, backgroundColor: "rgba(15,23,42,0.58)" }, noticeCard: { width: "100%", maxWidth: 340, alignItems: "center", padding: 22, borderRadius: 24, backgroundColor: "white" }, noticeIcon: { width: 56, height: 56, borderRadius: 20, alignItems: "center", justifyContent: "center" }, noticeTitle: { marginTop: 12, color: "#0F172A", fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" }, noticeText: { marginTop: 6, color: "#64748B", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", textAlign: "center" }, noticeButton: { marginTop: 17, minWidth: 110, minHeight: 43, alignItems: "center", justifyContent: "center", borderRadius: 13 }, noticeButtonText: { color: "white", fontSize: 12, fontFamily: "Inter_700Bold" },
});
