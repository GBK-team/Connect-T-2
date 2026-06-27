const fs = require("fs");
const path = require("path");

const targets = [
  {
    root: "mobile",
    login: "mobile/app/login.tsx",
    auth: "mobile/context/AuthContext.tsx",
    lang: "mobile/context/LanguageContext.tsx",
    component: "mobile/components/DobDatePicker.tsx",
  },
  {
    root: "artifacts/janseva",
    login: "artifacts/janseva/app/login.tsx",
    auth: "artifacts/janseva/context/AuthContext.tsx",
    lang: "artifacts/janseva/context/LanguageContext.tsx",
    component: "artifacts/janseva/components/DobDatePicker.tsx",
  },
];

function exists(file) {
  return fs.existsSync(path.join(process.cwd(), file));
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
  console.log("✅ Updated", file);
}

function copyComponent(src, dest) {
  if (!exists(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("✅ Copied", dest);
}

function patchLogin(file) {
  if (!exists(file)) return;

  let c = read(file);

  if (!c.includes('import DobDatePicker from "@/components/DobDatePicker";')) {
    c = c.replace(
      'import TopShade from "@/components/TopShade";',
      'import TopShade from "@/components/TopShade";\nimport DobDatePicker from "@/components/DobDatePicker";'
    );
  }

  if (!c.includes("function calculateAgeFromDob")) {
    c = c.replace(
      'type LoginStep = "form" | "otp";',
      `type LoginStep = "form" | "otp";

function calculateAgeFromDob(dob: string) {
  if (!dob) return null;

  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age--;
  }

  return age;
}`
    );
  }

  c = c.replace(
    '  const [regAge, setRegAge] = useState("");',
    '  const [regDob, setRegDob] = useState("");'
  );

  c = c.replace(
    `    const ageNum = parseInt(regAge, 10);

    if (!regAge || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setError(t("enterValidAge"));
      return;
    }`,
    `    const ageNum = calculateAgeFromDob(regDob);

    if (!regDob || ageNum === null || ageNum < 1 || ageNum > 120) {
      setError(t("selectValidDob"));
      return;
    }`
  );

  c = c.replace(
    '        age: parseInt(regAge, 10),',
    '        age: calculateAgeFromDob(regDob) || undefined,\n        dateOfBirth: regDob,'
  );

  c = c.replace(
    `      <Text style={s.fieldLabel}>{t("age")}</Text>

      <TextInput
        style={s.input}
        placeholder={t("enterAge")}
        placeholderTextColor="#94A3B8"
        keyboardType="number-pad"
        maxLength={3}
        value={regAge}
        onChangeText={setRegAge}
      />`,
    `      <DobDatePicker
        label={t("dateOfBirth")}
        required
        value={regDob}
        onChange={setRegDob}
        placeholder={t("selectDateOfBirth")}
      />`
  );

  write(file, c);
}

function patchAuth(file) {
  if (!exists(file)) return;

  let c = read(file);

  if (!c.includes("dateOfBirth?: string;")) {
    c = c.replace(
      "  age?: number;\n  email?: string;",
      "  age?: number;\n  dateOfBirth?: string;\n  email?: string;"
    );
  }

  write(file, c);
}

function patchLanguage(file) {
  if (!exists(file)) return;

  let c = read(file);

  c = c.replaceAll('age: "Age"', 'age: "Date of Birth"');
  c = c.replaceAll('enterAge: "Enter age"', 'enterAge: "Select date of birth"');
  c = c.replaceAll('enterValidAge: "Enter a valid age (1–120)"', 'enterValidAge: "Please select a valid date of birth"');

  c = c.replaceAll('age: "उम्र"', 'age: "जन्म तिथि"');
  c = c.replaceAll('enterAge: "उम्र दर्ज करें"', 'enterAge: "जन्म तिथि चुनें"');
  c = c.replaceAll('enterValidAge: "मान्य उम्र दर्ज करें"', 'enterValidAge: "कृपया मान्य जन्म तिथि चुनें"');

  c = c.replaceAll('age: "वय"', 'age: "जन्म तारीख"');
  c = c.replaceAll('enterAge: "वय प्रविष्ट करा"', 'enterAge: "जन्म तारीख निवडा"');
  c = c.replaceAll('enterValidAge: "मान्य वय प्रविष्ट करा"', 'enterValidAge: "कृपया मान्य जन्म तारीख निवडा"');

  const additions = {
    en: [
      ['dateOfBirth', 'Date of Birth'],
      ['selectDateOfBirth', 'Select date of birth'],
      ['selectValidDob', 'Please select a valid date of birth'],
    ],
    hi: [
      ['dateOfBirth', 'जन्म तिथि'],
      ['selectDateOfBirth', 'जन्म तिथि चुनें'],
      ['selectValidDob', 'कृपया मान्य जन्म तिथि चुनें'],
    ],
    mr: [
      ['dateOfBirth', 'जन्म तारीख'],
      ['selectDateOfBirth', 'जन्म तारीख निवडा'],
      ['selectValidDob', 'कृपया मान्य जन्म तारीख निवडा'],
    ],
  };

  for (const [lang, entries] of Object.entries(additions)) {
    for (const [key, value] of entries) {
      if (!c.includes(`${key}:`)) {
        const marker = lang === "en"
          ? '    enterPhoneNumber: "Enter phone number",'
          : lang === "hi"
            ? '    enterPhoneNumber: "फोन नंबर दर्ज करें",'
            : '    enterPhoneNumber: "फोन नंबर प्रविष्ट करा",';

        if (c.includes(marker)) {
          c = c.replace(marker, `${marker}\n    ${key}: "${value}",`);
        }
      }
    }
  }

  write(file, c);
}

for (const target of targets) {
  if (!exists(target.root)) continue;

  patchLogin(target.login);
  patchAuth(target.auth);
  patchLanguage(target.lang);

  if (target.root !== "mobile") {
    copyComponent("mobile/components/DobDatePicker.tsx", target.component);
  }
}

console.log("✅ DOB date picker patch complete");
