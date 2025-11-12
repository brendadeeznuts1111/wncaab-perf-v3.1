/**
 * @file worktree-config.ts
 * @description Worktree detection and configuration for multi-environment development
 * @ticket TES-OPS-004.B.8.16
 */

/**
 * @function detectWorktree
 * @description Detect current worktree name from import.meta.dir
 * @returns Worktree name (e.g., 'tes-repo', 'tmux-sentinel')
 */
export function detectWorktree(): string {
  // Get directory path from import.meta.dir
  // Example: /home/user/tes-repo/scripts or /home/user/tmux-sentinel/scripts
  const dirPath = import.meta.dir;
  
  // Extract worktree name from path
  // Split by '/' and get second-to-last segment (parent of scripts/)
  const parts = dirPath.split('/').filter(Boolean);
  
  // Find the worktree name (typically the parent of scripts/)
  // For scripts/dev-server.ts: parts = ['home', 'user', 'worktree-name', 'scripts']
  // Worktree name is at index -2 (second to last)
  if (parts.length >= 2) {
    const worktreeName = parts[parts.length - 2];
    
    // Validate it's a known worktree
    const knownWorktrees = ['tes-repo', 'tmux-sentinel', 'APPENDIX'];
    if (knownWorktrees.includes(worktreeName)) {
      return worktreeName;
    }
    
    // Fallback: use the directory name
    return worktreeName;
  }
  
  // Fallback to 'tes-repo' if detection fails
  return 'tes-repo';
}

/**
 * @function getWorktreePortOffset
 * @description Get port offset based on worktree name
 * @param worktreeName - Worktree name
 * @returns Port offset (0 for main, 2 for tmux-sentinel)
 */
export function getWorktreePortOffset(worktreeName: string): number {
  const portOffsets: Record<string, number> = {
    'tes-repo': 0,
    'tmux-sentinel': 2,
    'APPENDIX': 0, // Default to main ports
  };
  
  return portOffsets[worktreeName] || 0;
}

/**
 * @function getDevServerPort
 * @description Get dev server port for current worktree
 * @returns Port number (3002 for main, 3004 for tmux-sentinel)
 */
export function getDevServerPort(): number {
  const worktree = detectWorktree();
  const offset = getWorktreePortOffset(worktree);
  const basePort = 3002;
  
  return basePort + offset;
}

/**
 * @function getWorkerApiPort
 * @description Get worker API port for current worktree
 * @returns Port number (3003 for main, 3005 for tmux-sentinel)
 */
export function getWorkerApiPort(): number {
  const worktree = detectWorktree();
  const offset = getWorktreePortOffset(worktree);
  const basePort = 3003;
  
  return basePort + offset;
}

/**
 * @function getTmuxSessionName
 * @description Get tmux session name for current worktree
 * @returns Session name (e.g., 'tes-dev-tes-repo', 'tes-dev-tmux-sentinel')
 */
export function getTmuxSessionName(): string {
  const worktree = detectWorktree();
  return `tes-dev-${worktree}`;
}

/**
 * @function getLogDirectory
 * @description Get log directory for current worktree
 * @returns Log directory path
 */
export function getLogDirectory(): string {
  const worktree = detectWorktree();
  // Use import.meta.dir to get worktree-relative path
  const baseDir = import.meta.dir;
  const worktreeRoot = baseDir.split('/').slice(0, -1).join('/'); // Remove 'scripts'
  
  return `${worktreeRoot}/.tes/logs/${worktree}`;
}

/**
 * @interface WorktreeConfig
 * @description Worktree configuration object
 */
export interface WorktreeConfig {
  name: string;
  devServerPort: number;
  workerApiPort: number;
  tmuxSessionName: string;
  logDirectory: string;
}

/**
 * @function getWorktreeConfig
 * @description Get complete worktree configuration
 * @returns Worktree configuration object
 */
export function getWorktreeConfig(): WorktreeConfig {
  const worktree = detectWorktree();
  
  return {
    name: worktree,
    devServerPort: getDevServerPort(),
    workerApiPort: getWorkerApiPort(),
    tmuxSessionName: getTmuxSessionName(),
    logDirectory: getLogDirectory(),
  };
}

