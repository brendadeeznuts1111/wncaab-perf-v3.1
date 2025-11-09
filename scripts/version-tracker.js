/**
 * Version Tracker - Bun Release Notes Integration
 * 
 * Tracks Bun versions and integrates release notes with project versions
 */

async function getProjectVersion() {
  try {
    const pkg = await Bun.file('package.json').json();
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function getBunVersion() {
  try {
    const { $ } = await import('bun');
    const result = await $`bun --version`.quiet();
    return result.stdout.toString().trim();
  } catch {
    return 'unknown';
  }
}

async function getBunEngineRequirement() {
  try {
    const pkg = await Bun.file('package.json').json();
    return pkg.engines?.bun || '>=1.3.0';
  } catch {
    return '>=1.3.0';
  }
}

async function checkBunReleaseNotes() {
  try {
    const notes = await Bun.file('BUN-RELEASE-NOTES-ENHANCED.md');
    return await notes.exists();
  } catch {
    return false;
  }
}

async function displayVersionInfo() {
  const projectVersion = await getProjectVersion();
  const bunVersion = await getBunVersion();
  const bunRequirement = await getBunEngineRequirement();
  const hasReleaseNotes = await checkBunReleaseNotes();

  console.log('📊 Version Information\n');
  console.log(`Project Version: ${projectVersion}`);
  console.log(`Bun Version (Installed): ${bunVersion}`);
  console.log(`Bun Requirement: ${bunRequirement}`);
  console.log(`Release Notes: ${hasReleaseNotes ? '✅ Available' : '❌ Not found'}`);
  
  if (hasReleaseNotes) {
    console.log('\n📋 See BUN-RELEASE-NOTES-ENHANCED.md for latest Bun release notes');
  }
  
  console.log('\n📝 See CHANGELOG.md for project release history');
}

if (import.meta.main) {
  displayVersionInfo().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { getProjectVersion, getBunVersion, getBunEngineRequirement, displayVersionInfo };

