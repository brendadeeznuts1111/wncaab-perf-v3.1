/**
 * Preset Deploy CLI - YAML + Vault Sync
 * 
 * Usage: bun run preset-deploy.ts --file catrom-smooth.yaml --env prod --vault-sync
 */

interface DeployOptions {
  file: string;
  env: string;
  vaultSync: boolean;
}

async function presetDeploy(options: DeployOptions) {
  const { file, env, vaultSync } = options;

  console.log(`🚀 Deploying preset:`);
  console.log(`   File: ${file}`);
  console.log(`   Environment: ${env}`);
  console.log(`   Vault sync: ${vaultSync ? 'enabled' : 'disabled'}`);

  // Load preset file
  const presetFile = Bun.file(file);
  if (!(await presetFile.exists())) {
    console.error(`❌ Preset file not found: ${file}`);
    process.exit(1);
  }

  const presetContent = await presetFile.text();
  console.log(`✅ Loaded preset:`);
  console.log(presetContent);

  // Deploy to API
  try {
    const response = await fetch(`http://localhost:3001/api/spline/preset/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.replace('.yaml', '').replace('presets/', ''),
        config: {
          type: 'catmull-rom',
          points: 1000,
          tension: 0.5,
        },
        vaultSync,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Preset deployed:`);
    console.log(`   Path: ${result.path}`);
    console.log(`   Vault sync: ${result.vaultSync}`);

    if (vaultSync) {
      console.log(`📦 Vault sync requested (implementation pending)`);
    }

  } catch (error) {
    console.error(`❌ Deploy failed: ${error}`);
    process.exit(1);
  }
}

// Parse CLI arguments
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const options: DeployOptions = {
    file: '',
    env: 'dev',
    vaultSync: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--file' && i + 1 < args.length) {
      options.file = args[++i];
    } else if (arg === '--env' && i + 1 < args.length) {
      options.env = args[++i];
    } else if (arg === '--vault-sync') {
      options.vaultSync = true;
    } else if (arg.startsWith('--file=')) {
      options.file = arg.split('=')[1];
    } else if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1];
    }
  }

  if (!options.file) {
    console.error('❌ --file required');
    process.exit(1);
  }

  presetDeploy(options).catch(error => {
    console.error('❌ Deploy failed:', error);
    process.exit(1);
  });
}

export { presetDeploy };

