#!/usr/bin/env bun
/**
 * @script tmux-tes-dev
 * @description Unified TES development environment orchestrator
 * @usage ./scripts/tmux-tes-dev.ts [attach|kill|status|start]
 * @ticket TES-OPS-004.B.8.16 - Worktree-aware configuration
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { getWorktreeConfig } from '../src/lib/worktree-config.ts';

const exec = promisify(execCallback);

type TmuxCommand = 'attach' | 'kill' | 'status' | 'start';

// ✅ Worktree-aware configuration
const worktreeConfig = getWorktreeConfig();
const SESSION_NAME = worktreeConfig.tmuxSessionName;
const LOG_DIR = worktreeConfig.logDirectory;

// ANSI colors for terminal output
const colors = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

async function runTmuxCommand(args: string[]): Promise<string> {
  try {
    const { stdout } = await exec(`tmux ${args.join(' ')}`);
    return stdout.trim();
  } catch (error: any) {
    if (error.code === 1 && error.stderr.includes('can\'t find session')) {
      return '';
    }
    throw error;
  }
}

async function sessionExists(): Promise<boolean> {
  try {
    const output = await runTmuxCommand(['ls', '-F', '#{session_name}']);
    return output.split('\n').includes(SESSION_NAME);
  } catch {
    return false;
  }
}

async function startSession() {
  console.log(`${colors.blue}🚀 Starting TES Dev Environment...${colors.reset}`);
  
  const workspaceDir = process.cwd();
  
  // Create session (detached) with dev server
  // ✅ Use worktree-specific port via environment variable
  await runTmuxCommand([
    'new-session', '-d', '-s', SESSION_NAME, '-n', 'dev-server',
    '-c', workspaceDir,
    'env', `DEV_SERVER_PORT=${worktreeConfig.devServerPort}`, 
    'bun', 'run', 'scripts/dev-server.ts'
  ]);
  
  // Create telemetry pane (split vertically)
  // ✅ Use worktree-specific port via environment variable
  await runTmuxCommand([
    'split-window', '-v', '-t', `${SESSION_NAME}:0`,
    '-c', workspaceDir,
    'env', `WORKER_API_PORT=${worktreeConfig.workerApiPort}`, 
    'bun', 'run', 'scripts/worker-telemetry-api.ts'
  ]);
  
  // Create logs pane (split horizontally from telemetry pane)
  // Note: We'll create a simple log viewer
  const logCommand = `tail -f ${LOG_DIR}/dev-server.log ${LOG_DIR}/workers.log 2>/dev/null | grep -E "TES|ERROR|WARN" || echo "Log files not found. Logs will appear here when services start."`;
  
  await runTmuxCommand([
    'split-window', '-h', '-t', `${SESSION_NAME}:0.1`,
    '-c', workspaceDir,
    'bash', '-c', logCommand
  ]);
  
  // Layout: Resize panes for better visibility
  // Pane 0 (dev-server): 60% height
  await runTmuxCommand([
    'resize-pane', '-t', `${SESSION_NAME}:0.0`, '-y', '15'
  ]);
  
  // Pane 1 (telemetry): 20% height
  await runTmuxCommand([
    'resize-pane', '-t', `${SESSION_NAME}:0.1`, '-y', '8'
  ]);
  
  // Pane 2 (logs): Remaining space
  
  console.log(`${colors.green}✅ Session "${SESSION_NAME}" started${colors.reset}`);
  console.log(`${colors.yellow}📌 Attach with: ./scripts/tmux-tes-dev.ts attach${colors.reset}`);
  console.log(`${colors.yellow}📊 Dashboard: http://localhost:${worktreeConfig.devServerPort}${colors.reset}`);
}

async function attachSession() {
  const exists = await sessionExists();
  if (!exists) {
    console.log(`${colors.red}❌ Session "${SESSION_NAME}" not running${colors.reset}`);
    console.log(`${colors.yellow}💡 Start with: ./scripts/tmux-tes-dev.ts start${colors.reset}`);
    process.exit(1);
    return;
  }
  
  // Attach interactively (this will block)
  const proc = spawn('tmux', ['attach-session', '-t', SESSION_NAME], {
    stdio: 'inherit'
  });
  
  proc.on('exit', (code) => {
    process.exit(code || 0);
  });
}

async function killSession() {
  const exists = await sessionExists();
  if (!exists) {
    console.log(`${colors.yellow}ℹ️  Session "${SESSION_NAME}" not running${colors.reset}`);
    return;
  }
  
  await runTmuxCommand(['kill-session', '-t', SESSION_NAME]);
  console.log(`${colors.green}🛑 Session "${SESSION_NAME}" killed${colors.reset}`);
}

async function showStatus(): Promise<string> {
  const exists = await sessionExists();
  if (!exists) {
    return JSON.stringify({ online: false, session: SESSION_NAME });
  }
  
  try {
    // Get pane information
    const panesOutput = await runTmuxCommand([
      'list-panes', '-t', SESSION_NAME, '-F', '#{pane_index}:#{pane_title}:#{pane_current_command}'
    ]);
    
    const panes = panesOutput.split('\n').map(line => {
      const [index, title, command] = line.split(':');
      return { index, title: title || `Pane ${index}`, command: command || 'unknown' };
    });
    
    // Check if processes are running
    const devServerRunning = await checkPort(3002);
    const telemetryRunning = await checkPort(3000);
    
    const status = {
      online: true,
      session: SESSION_NAME,
      panes,
      services: {
        devServer: devServerRunning,
        telemetry: telemetryRunning
      }
    };
    
    // Human-readable output
    console.log(`${colors.green}🟢 ${SESSION_NAME}: online${colors.reset}`);
    console.log(`  Panes: ${panes.length}`);
    panes.forEach(pane => {
      console.log(`    ${pane.index}: ${pane.title} (${pane.command})`);
    });
    console.log(`  Services:`);
    console.log(`    Dev Server (3002): ${devServerRunning ? '✅' : '❌'}`);
    console.log(`    Telemetry (3000): ${telemetryRunning ? '✅' : '❌'}`);
    
    return JSON.stringify(status);
  } catch (error: any) {
    return JSON.stringify({ online: true, error: error.message });
  }
}

async function checkPort(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/health`).catch(() => null);
    if (response) return response.ok;
    
    // Fallback: check if port is listening
    const { stdout } = await exec(`lsof -ti:${port} 2>/dev/null || echo ""`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

// CLI
const command = (process.argv[2] || 'status') as TmuxCommand;

switch (command) {
  case 'start':
    startSession().catch(error => {
      console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
      process.exit(1);
    });
    break;
    
  case 'attach':
    attachSession();
    break;
    
  case 'kill':
    killSession().catch(error => {
      console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
      process.exit(1);
    });
    break;
    
  case 'status':
    showStatus().then(output => {
      // JSON output for API consumption
      if (process.argv.includes('--json')) {
        console.log(output);
      }
    }).catch(error => {
      console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
      process.exit(1);
    });
    break;
    
  default:
    console.log(`
Usage: ./scripts/tmux-tes-dev.ts [command]

Commands:
  start   - Create and start new tes-dev session
  attach  - Attach to existing session
  kill    - Terminate session
  status  - Show session status (default)
  
Options:
  --json  - Output status as JSON (for API consumption)
    `);
    process.exit(1);
}
