/**
 * TES-NGWS-001.12c: Bun Runtime tmux Integration
 * Ensures all Bun commands run within tmux context
 */

import { $ as bun$ } from 'bun';

export const TMUX_SESSION = `sentinel-${process.env.WORKSPACE_FOLDER?.split('/').pop() || 'default'}`;

/**
 * Wrapper for Bun.$ that ensures tmux execution
 */
export async function $(command: TemplateStringsArray, ...args: any[]) {
  // If already in tmux, execute directly
  if (process.env.TMUX) {
    return bun$`${command} ...${args}`;
  }

  // Otherwise, execute in tmux session
  const fullCommand = String.raw(command, ...args);
  const escapedCommand = fullCommand.replace(/"/g, '\\"');
  const tmuxCommand = `tmux send-keys -t ${TMUX_SESSION}:5 "${escapedCommand}" Enter`;

  return bun$`${tmuxCommand}`;
}

/**
 * Verify tmux availability before command execution
 */
export async function verifyTmuxContext(): Promise<{
  inTmux: boolean;
  sessionExists: boolean;
  sessionName: string;
}> {
  const inTmux = !!process.env.TMUX;
  let sessionExists = false;

  try {
    await bun$`tmux has-session -t ${TMUX_SESSION} 2>/dev/null`.quiet();
    sessionExists = true;
  } catch {
    sessionExists = false;
  }

  return {
    inTmux,
    sessionExists,
    sessionName: TMUX_SESSION,
  };
}

/**
 * Ensure tmux session exists before any critical operation
 */
export async function enforceTmuxSession(): Promise<void> {
  const context = await verifyTmuxContext();

  if (!context.sessionExists) {
    console.log(`🚨 tmux session ${TMUX_SESSION} not found. Creating...`);
    try {
      await bun$`bun run scripts/tmux-setup-sentinel.sh`.quiet();
    } catch (error) {
      console.error(`❌ Failed to create tmux session: ${error}`);
      throw error;
    }
  }

  if (!context.inTmux) {
    console.log(`💡 Not running in tmux. Use: tmux attach-session -t ${TMUX_SESSION}`);
  }
}
