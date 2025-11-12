/**
 * @file service-registry.ts
 * @description Service registry configuration for TES development ecosystem
 * @ticket TES-OPS-004.B.8.17
 */

export interface ServiceDefinition {
  name: string;
  description: string;
  worktree: string;
  url: string;
  debugUrl?: string;
  docsUrl?: string;
  logsPath: string;
  statusCommand: string;
  metadata?: Record<string, string>;
}

export const SERVICE_REGISTRY: Record<string, ServiceDefinition[]> = {
  'development': [
    {
      name: 'Dev Server',
      description: 'Main HTTP server & API endpoints',
      worktree: 'tes-repo',
      url: 'http://localhost:3002',
      debugUrl: 'http://localhost:3002/api/dev/status',
      docsUrl: 'http://localhost:3002/api/dev/endpoints',
      logsPath: '.tes/logs/tes-repo/dev-server.log',
      statusCommand: 'curl http://localhost:3002/api/dev/health',
      metadata: { type: 'bun.serve', port: '3002' }
    },
    {
      name: 'Worker Telemetry API',
      description: 'Worker snapshot & metrics aggregation',
      worktree: 'tes-repo',
      url: 'http://localhost:3003',
      debugUrl: 'http://localhost:3003/api/workers/registry',
      docsUrl: 'http://localhost:3003/api/workers/registry',
      logsPath: '.tes/logs/tes-repo/worker-telemetry.log',
      statusCommand: 'curl http://localhost:3003/api/workers/registry',
      metadata: { type: 'bun.serve', port: '3003' }
    },
    {
      name: 'Dev Server (Tmux)',
      description: 'Tmux worktree HTTP server',
      worktree: 'tmux-sentinel',
      url: 'http://localhost:3004',
      debugUrl: 'http://localhost:3004/api/dev/status',
      docsUrl: 'http://localhost:3004/api/dev/endpoints',
      logsPath: '.tes/logs/tmux-sentinel/dev-server.log',
      statusCommand: 'curl http://localhost:3004/api/dev/health',
      metadata: { type: 'bun.serve', port: '3004' }
    },
    {
      name: 'Worker Telemetry API (Tmux)',
      description: 'Tmux worktree worker API',
      worktree: 'tmux-sentinel',
      url: 'http://localhost:3005',
      debugUrl: 'http://localhost:3005/api/workers/registry',
      docsUrl: 'http://localhost:3005/api/workers/registry',
      logsPath: '.tes/logs/tmux-sentinel/worker-telemetry.log',
      statusCommand: 'curl http://localhost:3005/api/workers/registry',
      metadata: { type: 'bun.serve', port: '3005' }
    }
  ],
  'websocket': [
    {
      name: 'Status Live Feed',
      description: 'Real-time status WebSocket',
      worktree: 'tes-repo',
      url: 'ws://localhost:3002/api/dev/status/live',
      debugUrl: 'chrome://inspect/#devices',
      docsUrl: 'docs/websockets.md',
      logsPath: '.tes/logs/tes-repo/websocket-status.log',
      statusCommand: 'curl http://localhost:3002/api/dev/status',
      metadata: { type: 'ws', port: '3002' }
    },
    {
      name: 'Worker Updates',
      description: 'Worker snapshot streaming',
      worktree: 'tes-repo',
      url: 'ws://localhost:3003/ws/workers/telemetry',
      debugUrl: 'chrome://inspect/#devices',
      logsPath: '.tes/logs/tes-repo/websocket-workers.log',
      statusCommand: 'curl http://localhost:3003/api/workers/registry',
      metadata: { type: 'ws', port: '3003' }
    },
    {
      name: 'Status Live Feed (Tmux)',
      description: 'Tmux worktree real-time status',
      worktree: 'tmux-sentinel',
      url: 'ws://localhost:3004/api/dev/status/live',
      debugUrl: 'chrome://inspect/#devices',
      logsPath: '.tes/logs/tmux-sentinel/websocket-status.log',
      statusCommand: 'curl http://localhost:3004/api/dev/status',
      metadata: { type: 'ws', port: '3004' }
    }
  ],
  'tools': [
    {
      name: 'Bun Runtime',
      description: 'Bun JavaScript runtime v1.3+',
      worktree: 'global',
      url: 'https://bun.sh',
      docsUrl: 'https://bun.sh/docs',
      debugUrl: 'chrome://inspect',
      logsPath: 'N/A',
      statusCommand: 'bun --version',
      metadata: { version: '1.3.x', features: 'native:wasm,fetch,ffi' }
    },
    {
      name: 'Bun Inspector',
      description: 'Chrome DevTools integration',
      worktree: 'global',
      url: 'https://bun.sh/docs/runtime/debugger',
      debugUrl: 'chrome://inspect',
      docsUrl: 'https://bun.sh/docs/runtime/debugger',
      logsPath: 'N/A',
      statusCommand: 'bun --inspect scripts/dev-server.ts',
      metadata: { inspectorPort: '6499', autoBreak: 'false' }
    },
    {
      name: 'Chrome DevTools',
      description: 'Frontend debugging',
      worktree: 'global',
      url: 'chrome://devtools',
      debugUrl: 'http://localhost:3002',
      docsUrl: 'https://developer.chrome.com/docs/devtools/',
      logsPath: 'N/A',
      statusCommand: 'open -a "Google Chrome" http://localhost:3002',
      metadata: { features: 'network,performance,console,sources' }
    },
    {
      name: 'Cursor IDE',
      description: 'AI-powered editor',
      worktree: 'global',
      url: 'cursor://',
      docsUrl: 'https://cursor.com/docs',
      debugUrl: 'cursor://settings',
      logsPath: 'N/A',
      statusCommand: 'cursor --version',
      metadata: { worktrees: 'enabled', ai: 'enabled' }
    },
    {
      name: 'Tmux',
      description: 'Terminal multiplexer',
      worktree: 'global',
      url: 'https://tmux.github.io',
      debugUrl: 'tmux attach -t tes-dev-{worktree}',
      docsUrl: 'https://github.com/tmux/tmux/wiki',
      logsPath: '.tes/logs/{worktree}/tmux-session.log',
      statusCommand: 'tmux ls',
      metadata: { version: '3.3+', panes: '3', layout: 'main-horizontal' }
    }
  ],
  'orchestration': [
    {
      name: 'Tmux Main Session',
      description: 'Main worktree tmux session',
      worktree: 'tes-repo',
      url: 'N/A',
      debugUrl: 'tmux attach -t tes-dev-tes-repo',
      docsUrl: 'scripts/tmux-tes-dev.ts',
      logsPath: '.tes/logs/tes-repo/tmux-session.log',
      statusCommand: 'tmux has-session -t tes-dev-tes-repo',
      metadata: { panes: '3', layout: 'main-horizontal', port: '3002' }
    },
    {
      name: 'Tmux Feature Session',
      description: 'Tmux worktree tmux session',
      worktree: 'tmux-sentinel',
      url: 'N/A',
      debugUrl: 'tmux attach -t tes-dev-tmux-sentinel',
      docsUrl: 'scripts/tmux-tes-dev.ts',
      logsPath: '.tes/logs/tmux-sentinel/tmux-session.log',
      statusCommand: 'tmux has-session -t tes-dev-tmux-sentinel',
      metadata: { panes: '3', layout: 'main-horizontal', port: '3004' }
    }
  ]
};

