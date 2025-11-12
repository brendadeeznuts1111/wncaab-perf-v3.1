#!/usr/bin/env bun
/**
 * TES-NGWS-001.12c: Cursor-Aware tmux Command Executor
 * Forces Cursor agents to use existing tmux session
 */

import { $ } from "bun";

const WORKSPACE_NAME = process.env.WORKSPACE_FOLDER 
  ? process.env.WORKSPACE_FOLDER.split('/').pop() || 'default'
  : 'default';

const SESSION_NAME = `sentinel-${WORKSPACE_NAME}`;
const TARGET_PANE = process.env.CURSOR_TMUX_PANE || "5";

interface CursorCommand {
  command: string;
  window?: string;
  pane?: string;
  waitFor?: string;
  timeout?: number;
}

class CursorTmuxExecutor {
  private sessionExists: boolean = false;

  async initialize() {
    // Check if session exists
    try {
      const result = await $`tmux has-session -t ${SESSION_NAME} 2>/dev/null`.quiet();
      this.sessionExists = true;
      console.log(`✅ tmux session ${SESSION_NAME} found`);
    } catch {
      console.log(`❌ No tmux session found, creating...`);
      await this.createSession();
    }
  }

  async execute(command: string, options: { window?: string; pane?: string } = {}) {
    const targetWindow = options.window || "5";
    const targetPane = options.pane || "0";
    
    const fullTarget = `${SESSION_NAME}:${targetWindow}.${targetPane}`;
    
    console.log(`🎬 Executing in tmux: ${command}`);
    
    // Escape command for tmux
    const escapedCommand = command.replace(/"/g, '\\"');
    
    // Send keys to specific pane
    try {
      await $`tmux send-keys -t ${fullTarget} "${escapedCommand}" Enter`.quiet();
      
      // Wait a moment for command to execute
      await Bun.sleep(500);
      
      // Capture output for Cursor to consume
      const output = await $`tmux capture-pane -t ${fullTarget} -p -S -20`.text();
      
      return {
        success: true,
        output,
        session: SESSION_NAME,
        window: targetWindow,
        pane: targetPane
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        session: SESSION_NAME,
        window: targetWindow,
        pane: targetPane
      };
    }
  }

  async captureCurrentPane(): Promise<string> {
    const fullTarget = `${SESSION_NAME}:${TARGET_PANE}.0`;
    try {
      return await $`tmux capture-pane -t ${fullTarget} -p`.text();
    } catch {
      return "";
    }
  }

  async waitForPrompt(timeout: number = 30000): Promise<boolean> {
    const fullTarget = `${SESSION_NAME}:${TARGET_PANE}.0`;
    try {
      await $`timeout ${timeout/1000} tmux wait-for sentinel-prompt`.quiet();
      return true;
    } catch {
      return false;
    }
  }

  private async createSession() {
    try {
      // Create session with predefined layout
      await $`tmux new-session -d -s ${SESSION_NAME} -c ${process.cwd()}`.quiet();
      
      // Create windows
      await $`tmux new-window -t ${SESSION_NAME}:1 -n "🚀 main"`.quiet();
      await $`tmux new-window -t ${SESSION_NAME}:2 -n "🛡️ security"`.quiet();
      await $`tmux new-window -t ${SESSION_NAME}:3 -n "📊 metrics"`.quiet();
      await $`tmux new-window -t ${SESSION_NAME}:4 -n "📝 logs"`.quiet();
      await $`tmux new-window -t ${SESSION_NAME}:5 -n "💻 shell"`.quiet();
      
      // Return to shell window
      await $`tmux select-window -t ${SESSION_NAME}:5`.quiet();
      
      this.sessionExists = true;
      console.log(`✅ Created tmux session ${SESSION_NAME} with 5 windows`);
    } catch (error) {
      console.error(`❌ Failed to create tmux session: ${error}`);
      throw error;
    }
  }
}

// CLI interface for Cursor agent
if (import.meta.main) {
  const command = process.argv.slice(2).join(" ");
  
  if (!command) {
    console.error("Usage: bun run scripts/cursor-tmux-executor.ts <command>");
    process.exit(1);
  }
  
  const executor = new CursorTmuxExecutor();
  
  await executor.initialize();
  const result = await executor.execute(command);
  
  console.log("--- TMUX OUTPUT ---");
  console.log(result.output || result.error || "No output captured");
  console.log("--- END OUTPUT ---");
  
  process.exit(result.success ? 0 : 1);
}

export const cursorTmux = new CursorTmuxExecutor();



