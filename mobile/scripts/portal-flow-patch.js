const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
function file(name) { return path.join(root, name); }
function edit(name, fn) {
  const p = file(name);
  if (!fs.existsSync(p)) return;
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  if (after !== before) {
    fs.writeFileSync(p, after);
    console.log('[Connect-T] patched ' + name);
  }
}

edit('app/(tabs)/_layout.tsx', s => s.replace(
  '<Tabs tabBar={(props) => isNagarsevak ? <NagarsevakTabBar {...props} /> : <AnimatedTabBar {...props} />} screenOptions={{ headerShown: false, tabBarActiveTintColor: isNagarsevak ? GREEN : ORANGE, tabBarInactiveTintColor: MUTED }}>',
  '<Tabs backBehavior="history" tabBar={(props) => isNagarsevak ? <NagarsevakTabBar {...props} /> : <AnimatedTabBar {...props} />} screenOptions={{ headerShown: false, tabBarActiveTintColor: isNagarsevak ? GREEN : ORANGE, tabBarInactiveTintColor: MUTED }}>'
));

edit('app/jobs/(tabs)/profile.tsx', s => s
  .replace('await logoutJobs();\n    },', 'await logoutJobs();\n      router.replace("/jobs/login" as any);\n    },')
  .replace('\n        { icon: "file-text" as const, label: "Resume Builder", sub: "Create resume from profile", color: "#7C3AED", bg: "#F5F3FF", onPress: () => router.push("/jobs/resume" as any) },', '')
);

console.log('[Connect-T] portal flow patch done');
