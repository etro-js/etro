const fs = require('fs');
const path = require('path');
const { parser } = require('keep-a-changelog');

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

const [
  nodePath,
  scriptPath,
  depName,
  oldVer,
  newVer,
  prNum,
  prUrl,
  isSecurityStr
] = process.argv;

const isSecurity = isSecurityStr === 'true';

if (!depName || !prNum || !prUrl) {
  console.error('Missing required arguments. Usage: node update-changelog.js <depName> <oldVer> <newVer> <prNum> <prUrl> <isSecurity>');
  process.exit(1);
}

try {
  // Read and parse the existing changelog
  const content = fs.readFileSync(changelogPath, 'utf8');
  const changelog = parser(content);

  // Construct the new entry message
  let message = '';
  if (oldVer && newVer && oldVer !== 'undefined' && newVer !== 'undefined') {
    message = `Bump ${depName} from ${oldVer} to ${newVer} ([#${prNum}](${prUrl})).`;
  } else {
    message = `Bump ${depName} ([#${prNum}](${prUrl})).`;
  }

  // Find the "Unreleased" release
  // keep-a-changelog typically looks for a release with no version or date, or explicitly named "Unreleased"
  // We can try to find the first release which should be unreleased if following standard practice
  const unreleased = changelog.releases.find(r => !r.date && (r.version === undefined || r.version === 'Unreleased'));

  if (!unreleased) {
    console.error('Could not find "Unreleased" section in CHANGELOG.md');
    process.exit(1);
  }

  // Determine the type (section) for the change
  // 'changed' or 'security' are the typical types in Keep a Changelog
  const type = isSecurity ? 'security' : 'changed';

  // Check for duplicates in the specific section
  // changes is a Map<string, Change[]> where string is the type
  const existingChanges = unreleased.changes.get(type) || [];
  const isDuplicate = existingChanges.some(change => change.title.trim() === message);

  if (isDuplicate) {
    console.log('Entry already exists in CHANGELOG.md');
    process.exit(0);
  }

  // Add the new change
  unreleased.addChange(type, message);

  // Write back to file
  fs.writeFileSync(changelogPath, changelog.toString());
  console.log('Successfully updated CHANGELOG.md');

} catch (err) {
  console.error('Error updating changelog:', err);
  process.exit(1);
}
