// Regenerates THIRD_PARTY_LICENSES.md from the components that ship in the app:
// npm production dependencies (bundled into the web UI) and the Rust normal
// dependencies for the Windows target (compiled into the executable).
// Run from anywhere: node scripts/generate-third-party-licenses.mjs
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = 'x86_64-pc-windows-msvc';
const OVERRIDES = join(ROOT, 'scripts', 'license-overrides');
const LICENSE_FILE = /^(LICEN[CS]E|COPYING|NOTICE)([-._].*)?$/i;

function licenseFiles(dir) {
  return readdirSync(dir)
    .filter((f) => LICENSE_FILE.test(f) && !/\.spdx$/i.test(f) && statSync(join(dir, f)).isFile())
    .sort()
    .map((name) => ({
      name,
      text: readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n').trim(),
    }));
}

// Some crates are published without their license file. Their upstream copy, fetched at the
// commit the crate was packaged from, lives under scripts/license-overrides/<name>-<version>/.
function packageLicenseFiles(pkg) {
  const files = licenseFiles(pkg.dir);
  if (files.length > 0) return files;
  const override = join(OVERRIDES, `${pkg.name}-${pkg.version}`);
  return existsSync(override) ? licenseFiles(override) : [];
}

function declaredLicense(license) {
  return typeof license === 'string' ? license : JSON.stringify(license ?? '');
}

function npmPackages() {
  let out;
  try {
    out = execSync('npm ls --omit=dev --all --json', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch (err) {
    // npm exits non-zero for peer warnings, but the JSON is still on stdout.
    out = err.stdout;
  }
  const found = new Map();
  const walk = (deps = {}) => {
    for (const [name, dep] of Object.entries(deps)) {
      // Optional packages for other platforms are listed but not installed; they are not bundled.
      if (!dep.path) continue;
      const key = `${name}@${dep.version}`;
      if (!found.has(key)) {
        const pkg = JSON.parse(readFileSync(join(dep.path, 'package.json'), 'utf8'));
        found.set(key, {
          ecosystem: 'npm',
          name,
          version: dep.version,
          declared: declaredLicense(pkg.license),
          dir: dep.path,
        });
      }
      walk(dep.dependencies);
    }
  };
  walk(JSON.parse(out).dependencies);
  return [...found.values()];
}

function cargoPackages() {
  const meta = JSON.parse(
    execSync(`cargo metadata --format-version 1 --filter-platform ${TARGET}`, {
      cwd: join(ROOT, 'src-tauri'),
      encoding: 'utf8',
      maxBuffer: 1 << 28,
    }),
  );
  const packages = new Map(meta.packages.map((p) => [p.id, p]));
  const nodes = new Map(meta.resolve.nodes.map((n) => [n.id, n]));
  // Follow only normal (non-dev, non-build) edges: those are the crates linked into the executable.
  const normal = new Set();
  const queue = [meta.resolve.root];
  while (queue.length) {
    const id = queue.pop();
    for (const dep of nodes.get(id).deps) {
      if (dep.dep_kinds.some((k) => k.kind === null) && !normal.has(dep.pkg)) {
        normal.add(dep.pkg);
        queue.push(dep.pkg);
      }
    }
  }
  return [...normal].map((id) => {
    const pkg = packages.get(id);
    return {
      ecosystem: 'cargo',
      name: pkg.name,
      version: pkg.version,
      declared: declaredLicense(pkg.license),
      dir: dirname(pkg.manifest_path),
    };
  });
}

const packages = [...npmPackages(), ...cargoPackages()].sort(
  (a, b) => a.ecosystem.localeCompare(b.ecosystem) || a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
);

const groups = new Map(); // normalized text hash -> { text, members: Set<string> }
const components = [];
const missing = [];

for (const pkg of packages) {
  const label = `${pkg.name} ${pkg.version}`;
  const files = packageLicenseFiles(pkg);
  if (files.length === 0) {
    missing.push({ ...pkg, label });
    continue;
  }
  const entry = { ...pkg, label, notices: [] };
  for (const file of files) {
    const copyrights = [];
    const body = [];
    for (const line of file.text.split('\n')) {
      // Match a capitalized notice only, so lowercase prose in license definitions stays in the text.
      // Keep Apache-style template placeholders such as "Copyright [yyyy] ..." inside the text too.
      if (/^\s*(Copyright\b|©)/.test(line) && !line.includes('[')) copyrights.push(line.trim());
      else body.push(line);
    }
    const text = body.join('\n').trim();
    const key = createHash('sha256').update(text.replace(/\s+/g, ' ')).digest('hex');
    if (!groups.has(key)) groups.set(key, { text, members: new Set() });
    groups.get(key).members.add(label);
    entry.notices.push({ file: file.name, copyrights, key });
  }
  components.push(entry);
}

const textIds = new Map();
[...groups.entries()]
  .sort((a, b) => b[1].members.size - a[1].members.size)
  .forEach(([key], i) => textIds.set(key, i + 1));

const date = new Date().toISOString().slice(0, 10);
const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const out = [];
out.push('# Third-party licenses');
out.push('');
out.push(
  `KANAO Remove AI ${version} includes the components listed below. Generated by \`scripts/generate-third-party-licenses.mjs\` on ${date}.`,
);
out.push('');
out.push(
  `Scope: npm production dependencies (bundled into the web UI) and Rust normal dependencies for \`${TARGET}\` (compiled into the executable). Build-only tools are not included.`,
);
out.push('');
out.push('## Components');
out.push('');
for (const c of components) {
  out.push(`- **${c.name}** ${c.version} (${c.ecosystem}, declared: ${c.declared || 'unknown'})`);
  for (const n of c.notices) {
    out.push(`  - ${n.file}: license text ${textIds.get(n.key)}`);
    for (const cp of n.copyrights) out.push(`    - ${cp}`);
  }
}
out.push('');
out.push('## Needs manual review');
out.push('');
if (missing.length === 0) {
  out.push('None. Every component includes a license file.');
} else {
  out.push('These components have no license file in their package. Add the notice by hand before distribution.');
  out.push('');
  for (const m of missing) out.push(`- **${m.name}** ${m.version} (${m.ecosystem}, declared: ${m.declared || 'unknown'})`);
}
out.push('');
out.push('## License texts');
for (const [key, group] of [...groups.entries()].sort((a, b) => textIds.get(a[0]) - textIds.get(b[0]))) {
  const members = [...group.members].sort();
  out.push('');
  out.push(`### License text ${textIds.get(key)} (${members.length} component${members.length === 1 ? '' : 's'})`);
  out.push('');
  out.push(`Used by: ${members.join(', ')}`);
  out.push('');
  out.push('```text');
  out.push(group.text);
  out.push('```');
}
out.push('');

writeFileSync(join(ROOT, 'THIRD_PARTY_LICENSES.md'), out.join('\n'), 'utf8');
console.log(
  `components: ${components.length}, license texts: ${groups.size}, needs manual review: ${missing.length}`,
);
