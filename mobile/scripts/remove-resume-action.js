const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app', 'jobs', '(tabs)', 'profile.tsx');

try {
  let text = fs.readFileSync(file, 'utf8');
  const before = text;
  text = text.replace(/\n\s*\{ icon: "file-text" as const, label: "Resume Builder", sub: "Create resume from profile", color: "#7C3AED", bg: "#F5F3FF", onPress: \(\) => router\.push\("\/jobs\/resume" as any\) \},/g, '');
  if (text !== before) {
    fs.writeFileSync(file, text);
    console.log('[Connect-T] Removed Job Portal Resume Builder quick action');
  }
} catch (err) {
  console.warn('[Connect-T] Resume action patch skipped:', err.message);
}
