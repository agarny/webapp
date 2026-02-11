import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Current version from our package.json file.

const scriptDirName = path.dirname(fileURLToPath(import.meta.url));
const oldVersion = JSON.parse(fs.readFileSync(`${scriptDirName}/../package.json`)).version;

const oldVersionParts = oldVersion.split('.');
const oldMajorVersion = oldVersionParts[0];
const oldMinorVersion = oldVersionParts[1];
const oldPatchVersion = oldVersionParts[2];

// Determine the new version based on the current version and the current date.

const now = new Date().toISOString().split('T')[0].replace(/-/g, '');

const newMajorVersion = oldMajorVersion;
const newMinorVersion = now;
let newPatchVersion = 0;

if (oldMinorVersion === newMinorVersion) {
  newPatchVersion = parseInt(oldPatchVersion, 10) + 1;
}

const newVersion = `${newMajorVersion}.${newMinorVersion}.${newPatchVersion}`;

// Update our package.json files.

const updatePackageJsonFile = (filePath) => {
  const contents = JSON.parse(fs.readFileSync(filePath));

  contents.version = newVersion;

  fs.writeFileSync(filePath, `${JSON.stringify(contents, null, 2)}\n`);
};

updatePackageJsonFile(`${scriptDirName}/../../../package.json`);
updatePackageJsonFile(`${scriptDirName}/../package.json`);

// Display the old and new versions.

console.log(`\x1b[1mOld version:\x1b[0m ${oldVersion}`);
console.log(`\x1b[1mNew version:\x1b[0m ${newVersion}`);
