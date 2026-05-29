const fs = require("fs");
const path = require("path");
const os = require("os");

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function findFile(root, fileName) {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name === fileName) {
        return full;
      }
    }
  }
  return null;
}

const platform = os.platform();
let binDir = "linux64-bin";
let binaryName = "hermesc";

if (platform === "darwin") binDir = "osx-bin";
if (platform === "win32") {
  binDir = "win64-bin";
  binaryName = "hermesc.exe";
}

const rnRoot = path.dirname(require.resolve("react-native/package.json"));
const targetDir = path.join(rnRoot, "sdks", "hermesc", binDir);
const target = path.join(targetDir, binaryName);

const hermesCompilerRoot = path.dirname(require.resolve("hermes-compiler/package.json"));

const candidates = [
  path.join(hermesCompilerRoot, "hermesc", binDir, binaryName),
  path.join(hermesCompilerRoot, binDir, binaryName),
  path.join(hermesCompilerRoot, "bin", binaryName),
  findFile(hermesCompilerRoot, binaryName),
].filter(Boolean);

const source = candidates.find(exists);

if (!source) {
  console.error("[ensure-hermesc] Cannot find Hermes compiler inside hermes-compiler package.");
  console.error("[ensure-hermesc] Package root:", hermesCompilerRoot);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
fs.chmodSync(target, 0o755);

console.log("[ensure-hermesc] Hermes compiler ready");
console.log("from:", source);
console.log("to:  ", target);
