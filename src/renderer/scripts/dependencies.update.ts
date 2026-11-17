#!/usr/bin/env bun

import { $, spawnSync } from 'bun';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as readline from 'node:readline/promises';

type Dependency = {
  packageName: string;
  range: string;
  alias: string | null;
};

type Candidate = {
  name: string;
  packageName: string;
  range: string;
  alias: string | null;
  current: string | null;
  latest: string;
};

// Run a command synchronously, inheriting stdio.  Exit on failure.

const run = (command: string, args: string[]): void => {
  const res = spawnSync({
    cmd: [command, ...args],
    stdio: ['inherit', 'inherit', 'inherit']
  });

  if (res.exitCode !== 0) {
    console.error(`Command failed: ${command} ${args.join(' ')}`);

    process.exit(res.exitCode);
  }
};

// Check if a version string is pinned (i.e. starts with a digit) or is a range (i.e. starts with ^, ~, etc.).

const isVersionPinned = (version: string): boolean => {
  return /^\d/.test(version);
};

// Parse a dependency into its components: package name, version range, and optional alias name (e.g.,
// "npm:@scope/pkg@^1.2.3" -> { packageName: "@scope/pkg", range: "^1.2.3", alias: "npm" }).

const parseDependency = (name: string, version: string): Dependency => {
  if (version.startsWith('npm:')) {
    const at = version.lastIndexOf('@');
    const packageName = at > 4 ? version.substring(4, at) : version.substring(4);
    const range = at > 4 ? version.substring(at + 1) : 'latest';

    return { packageName, range, alias: name };
  }

  return { packageName: name, range: version, alias: null };
};

// Compare two semver strings. Return 0 if v1 === v2, a positive number if v1 > v2, and a negative number if v1 < v2.

const compareVersions = (v1: string, v2: string): number => {
  const v1List = v1.split('.').map(Number);
  const v2List = v2.split('.').map(Number);

  for (let i = 0; i < 3; ++i) {
    const v1Part = v1List[i] ?? 0;
    const v2Part = v2List[i] ?? 0;

    if (v1Part !== v2Part) {
      return v1Part - v2Part;
    }
  }

  return 0;
};

// Extract the minimum concrete version from a range string (e.g., "^1.2.3" -> "1.2.3").

const extractVersion = (range: string): string | null => {
  const match = range.match(/(\d+\.\d+\.\d+)/);

  return match?.[1] ?? null;
};

// Build a new version range keeping the original prefix but pointing at a newer version (e.g., ("^6.0.0", "6.0.3") ->
// "^6.0.3").

const buildRange = (oldRange: string, newVersion: string): string => {
  const prefix = oldRange.match(/^[~^><≥≤]+/)?.[0] || '';

  return `${prefix}${newVersion}`;
};

// Check for updates to dependencies in a given directory.

const checkUpdates = async (
  label: string,
  allDependencies: Record<string, string>,
  padEnd: number
): Promise<Candidate[]> => {
  const candidates: Candidate[] = [];

  console.log(`\n${label} dependencies:\n`);

  const entries = Object.entries(allDependencies).filter(([_, version]) => {
    return !isVersionPinned(version);
  });
  const results = await Promise.all(
    entries.map(async ([name, version]) => {
      const dependency = parseDependency(name, version);

      try {
        let latest: string;

        if (name === 'typescript-6') {
          // Special case of a dependency for which we want to stick to the version range, even if a newer major version
          // is available.

          const dependencyVersion =
            await $`npm view ${dependency.packageName}@${dependency.range} version --json`.text();
          const versions = JSON.parse(dependencyVersion.trim());

          latest = Array.isArray(versions) ? versions[versions.length - 1] : versions;
        } else {
          // Retrieve the absolute latest version of the dependency, which may be a major bump.

          const dependencyVersion = await $`npm view ${dependency.packageName} version --json`.text();
          const parsed = JSON.parse(dependencyVersion.trim());

          latest = Array.isArray(parsed) ? parsed[parsed.length - 1] : parsed;
        }

        return {
          name,
          version,
          dependency,
          current: extractVersion(dependency.range),
          latest,
          ok: true as const
        };
      } catch {
        return {
          name,
          ok: false as const
        };
      }
    })
  );

  for (const result of results) {
    if (!result.ok) {
      console.log(`  ⚠️ ${result.name.padEnd(padEnd)} Could not be checked`);

      continue;
    }

    if (result.latest && result.current && compareVersions(result.latest, result.current) > 0) {
      candidates.push({
        name: result.name,
        ...result.dependency,
        current: result.current,
        latest: result.latest
      });

      console.log(`  📦 ${result.name.padEnd(padEnd)} ${result.current} → ${result.latest}`);
    } else {
      console.log(`  ✅ ${result.name.padEnd(padEnd)} ${result.current} (up to date)`);
    }
  }

  // Print pinned dependencies at the end so they are visible but clearly separated.

  const pinned = Object.entries(allDependencies).filter(([_, version]) => {
    return isVersionPinned(version);
  });

  for (const [name, version] of pinned) {
    console.log(`  ⏭️ ${name.padEnd(padEnd)} Pinned (${version})`);
  }

  return candidates;
};

const updateDependencies = async (dir: string): Promise<void> => {
  const label = path.basename(dir) === 'renderer' ? 'Renderer' : 'Root';
  const packageJsonPath = path.join(dir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const padEnd = Math.max(0, ...Object.keys(allDependencies).map((name) => name.length)) + 1;

  process.chdir(dir);

  const candidates = await checkUpdates(label, allDependencies, padEnd);

  if (candidates.length === 0) {
    console.log(`\n✨ All ${label} dependencies are up to date!`);

    return;
  }

  console.log(`\nSelect the dependencies to update (${label}):`);

  candidates.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  for (const [index, candidate] of candidates.entries()) {
    console.log(
      `  ${(index + 1).toString().padStart(2)}. ${candidate.name.padEnd(padEnd - 1)} ${candidate.current} → ${candidate.latest}`
    );
  }

  console.log(`  ${'a'.padStart(2)}. All`);
  console.log(`  ${'0'.padStart(2)}. Skip`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('\nEnter numbers (comma/space separated), or a/A for all: ')).trim();

  rl.close();

  if (answer === '0' || answer === '') {
    console.log('  Skipped.');

    return;
  }

  let selected: Candidate[];

  if (answer.toLowerCase() === 'a') {
    selected = candidates;
  } else {
    const indices = [
      ...new Set(
        answer
          .split(/[,\s]+/)
          .map(Number)
          .filter((index) => {
            return index > 0 && index <= candidates.length;
          })
      )
    ];

    selected = indices.map((index) => {
      return candidates[index - 1] as Candidate;
    });
  }

  if (selected.length === 0) {
    console.log('  No valid selection. Skipped.');

    return;
  }

  // Update package.json with the selected dependencies.

  for (const item of selected) {
    const newRange = buildRange(item.range, item.latest);
    const newVersion = item.alias ? `npm:${item.packageName}@${newRange}` : newRange;

    if (packageJson.dependencies?.[item.name] !== undefined) {
      packageJson.dependencies[item.name] = newVersion;
    } else if (packageJson.devDependencies?.[item.name] !== undefined) {
      packageJson.devDependencies[item.name] = newVersion;
    }

    console.log(`  ✓ ${item.name}: ${item.range} → ${newRange}`);

    // Keep the peer dependency (e.g., vue) in sync, keeping its own range prefix.

    const peerDependencies = packageJson.peerDependencies;
    const peerRange = peerDependencies?.[item.name];

    if (peerDependencies && peerRange !== undefined) {
      const newPeerRange = buildRange(peerRange, item.latest);

      peerDependencies[item.name] = newPeerRange;

      console.log(`  ✓ ${item.name} (peer): ${peerRange} → ${newPeerRange}`);
    }
  }

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  // Run Bun commands to update dependencies and clean up.

  run('bun', ['clean']);
  fs.rmSync(path.join(dir, 'bun.lock'), { force: true });
  run('bun', ['install']);
  run('bun', ['clean']);

  console.log(`\n✅ ${label} dependencies updated!`);
};

// Update our dependencies in both the root and renderer directories.

console.log('🔍 Dependency Update Checker');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await updateDependencies(path.join(__dirname, '../../..'));
await updateDependencies(path.join(__dirname, '..'));

console.log('\n✅ All done!');
