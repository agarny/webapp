#!/usr/bin/env bun

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Current version from our package.json file.

const scriptDirName = path.dirname(fileURLToPath(import.meta.url));
const oldVersion = (JSON.parse(fs.readFileSync(`${scriptDirName}/../package.json`, 'utf8')) as { version: string })
  .version;

const [oldMajorVersion, oldMinorVersion, oldPatchVersion] = oldVersion.split('.');

if (oldMajorVersion === undefined || oldMinorVersion === undefined || oldPatchVersion === undefined) {
  throw new Error(`Failed to parse version '${oldVersion}'.`);
}

// Determine the new version based on the current version and the current date.

const now = new Date();
const dateTimeParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Pacific/Auckland',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).formatToParts(now);
const datePart = (type: Intl.DateTimeFormatPartTypes): string => {
  const part = dateTimeParts.find((candidate) => {
    return candidate.type === type;
  });

  if (!part) {
    throw new Error(`Failed to find date part '${type}' in the formatted date parts.`);
  }

  return part.value;
};

const newMajorVersion = oldMajorVersion;
const newMinorVersion = `${datePart('year')}${datePart('month')}${datePart('day')}`;
let newPatchVersion = 0;

if (oldMinorVersion === newMinorVersion) {
  newPatchVersion = parseInt(oldPatchVersion, 10) + 1;
}

const newVersion = `${newMajorVersion}.${newMinorVersion}.${newPatchVersion}`;

// Update our package.json files.

const updatePackageJsonFile = (filePath: string): void => {
  const contents = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { version: string };

  contents.version = newVersion;

  fs.writeFileSync(filePath, `${JSON.stringify(contents, null, 2)}\n`);
};

updatePackageJsonFile(`${scriptDirName}/../../../package.json`);
updatePackageJsonFile(`${scriptDirName}/../package.json`);

// Display the old and new versions.

console.log(`\x1b[1mOld version:\x1b[0m ${oldVersion}`);
console.log(`\x1b[1mNew version:\x1b[0m ${newVersion}`);
