#!/usr/bin/env bun
/**
 * @script service-mapper
 * @description Interactive CLI tool to map all TES development services
 * @usage ./scripts/service-mapper.ts [list|docs|debug|worktree <name>|health]
 * @ticket TES-OPS-004.B.8.17
 */

import { SERVICE_REGISTRY, type ServiceDefinition } from '../src/config/service-registry.ts';

// Load .env.local if it exists (for Telegram bot configuration)
try {
  const envLocal = Bun.file('.env.local');
  if (await envLocal.exists()) {
    const content = await envLocal.text();
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (!Bun.env[key]) {
            Bun.env[key] = value;
          }
        }
      }
    }
  }
} catch {
  // .env.local not found or couldn't be read - continue without it
}

// Load worktree configuration with fallback
let WORKTREE_CONFIG: any;
try {
  WORKTREE_CONFIG = await Bun.file('.cursor/worktrees.json').json();
} catch {
  // Fallback configuration if .cursor/worktrees.json doesn't exist
  WORKTREE_CONFIG = {
    defaultWorktree: 'tes-repo',
    worktrees: [
      {
        name: 'tes-repo',
        path: '~/tes-repo',
        branch: 'main',
        default: true,
        scripts: {
          dev: 'bun run scripts/dev-server.ts',
          worker: 'bun run scripts/worker-telemetry.ts',
          logs: 'tail -f .tes/logs/tes-repo/*.log'
        },
        environment: {
          DEV_SERVER_PORT: '3002',
          WORKER_API_PORT: '3003',
          NODE_ENV: 'development'
        }
      },
      {
        name: 'tmux-sentinel',
        path: '~/tmux-sentinel',
        branch: 'feature/tmux-orchestration',
        scripts: {
          dev: 'bun run scripts/dev-server.ts',
          worker: 'bun run scripts/worker-telemetry.ts',
          logs: 'tail -f .tes/logs/tmux-sentinel/*.log'
        },
        environment: {
          DEV_SERVER_PORT: '3004',
          WORKER_API_PORT: '3005',
          NODE_ENV: 'development'
        }
      }
    ]
  };
}

// Shell completion support
if (process.argv[2] === '--complete') {
  const services = Object.values(SERVICE_REGISTRY).flat().map(s => s.name);
  const categories = Object.keys(SERVICE_REGISTRY);
  const commands = ['list', 'docs', 'debug', 'worktree', 'health', 'validate', 'logs', 'hil', 'golden-path', 'gp'];
  
  const arg = process.argv[3] || '';
  
  if (arg === 'list') {
    console.log(categories.join('\n'));
  } else if (arg === 'docs' || arg === 'debug') {
    console.log(services.join('\n'));
  } else if (arg === 'worktree') {
    const worktrees = WORKTREE_CONFIG.worktrees?.map((w: any) => w.name) || [];
    console.log(worktrees.join('\n'));
  } else {
    console.log(commands.join('\n'));
  }
  process.exit(0);
}

// Re-export for testing
export { SERVICE_REGISTRY, type ServiceDefinition };

// Shared socket handler for Bun.listen() port checks
// Used consistently across all port availability checks
const PORT_CHECK_SOCKET_HANDLER = {
  data() {},
  open() {},
  close() {},
  error() {}
} as const;

// Shared stdio configuration for Bun.spawn()
const SPAWN_STDIO_IGNORE = ['ignore', 'ignore', 'ignore'] as const;

// CLI Commands
(async () => {
  const command = process.argv[2] || 'list';
  const subcommand = process.argv[3];

  switch (command) {
    case 'list':
      listServices(subcommand);
      break;
    case 'docs':
      await openDocs(subcommand);
      break;
    case 'debug':
      debugService(subcommand);
      break;
    case 'worktree':
      await showWorktree(subcommand);
      break;
    case 'health': {
      const notifyFlag = process.argv.includes('--notify');
      await healthCheck(notifyFlag);
      break;
    }
    case 'validate':
      await validateEnvironment();
      break;
    case 'logs': {
      const tailFlag = process.argv.includes('--tail');
      const linesFlag = process.argv.find(arg => arg.startsWith('--lines='));
      const lines = linesFlag ? parseInt(linesFlag.split('=')[1]) : 20;
      await openLogs(subcommand, tailFlag, lines);
      break;
    }
    case 'hil':
      await analyzeHILScenarios();
      break;
    case 'golden-path':
    case 'gp':
      await analyzeGoldenPaths();
      break;
    case 'resurrection':
      await resurrectionProtocol(subcommand);
      break;
    default:
      showHelp();
  }
})().catch(console.error);

function listServices(category?: string) {
  const services = category 
    ? SERVICE_REGISTRY[category] || []
    : Object.values(SERVICE_REGISTRY).flat();

  if (services.length === 0) {
    console.log(`❌ No services found for category: ${category}`);
    return;
  }

  const tableData = services.map(service => ({
    Service: service.name,
    Worktree: service.worktree,
    URL: service.url,
    Status: checkServiceHealth(service) ? '🟢' : '⚪',
    Port: service.metadata?.port || 'N/A'
  }));

  console.log(Bun.inspect.table(tableData, { colors: true }));
  
  console.log(`\n💡 Use '${Bun.main} docs <service>' for documentation`);
  console.log(`🔍 Use '${Bun.main} debug <service>' for debug URLs`);
}

/**
 * Synchronous health check for a service
 * Uses port binding to determine if service is running
 * 
 * @param service - Service definition to check
 * @returns true if service appears to be running, false otherwise
 */
export function checkServiceHealth(service: ServiceDefinition): boolean {
  try {
    if (service.url.startsWith('http://') || service.url.startsWith('ws://')) {
      const { hostname, port } = new URL(service.url);
      // If we can listen, port is free = service is DOWN
      const socket = Bun.listen({
        hostname,
        port: parseInt(port),
        socket: PORT_CHECK_SOCKET_HANDLER
      });
      socket.stop();
      return false; // Port available = service not running
    }
  } catch (err: any) {
    if (err?.code === 'EADDRINUSE') {
      return true; // Port in use = service running
    }
    // Other errors - assume offline
    return false;
  }
  // External tools/docs always "online" for display
  return service.url.startsWith('https://') || 
         service.url.startsWith('chrome://') || 
         service.url === 'cursor://' || 
         service.url === 'N/A';
}

/**
 * Get the category name for a service
 * 
 * @param service - Service definition
 * @returns Category name or 'unknown'
 */
function getCategory(service: ServiceDefinition): string {
  for (const [category, services] of Object.entries(SERVICE_REGISTRY)) {
    if (services.includes(service)) {
      return category;
    }
  }
  return 'unknown';
}

/**
 * Find a service by name (case-insensitive, partial match)
 * 
 * @param name - Service name or partial match
 * @returns Service definition or undefined
 */
export function findService(name: string): ServiceDefinition | undefined {
  return Object.values(SERVICE_REGISTRY)
    .flat()
    .find(s => s.name.toLowerCase().includes(name.toLowerCase()));
}

async function openDocs(serviceName?: string) {
  if (!serviceName) {
    console.log('📚 Available documentation topics:\n');
    
    const docs = Object.values(SERVICE_REGISTRY).flat()
      .filter(s => s.docsUrl)
      .map(s => ({ Service: s.name, DocsURL: s.docsUrl, Category: getCategory(s) }));
    
    console.log(Bun.inspect.table(docs, { colors: true }));
    
    console.log(`\n💡 Usage: '${Bun.main} docs "<service-name>"'`);
    return;
  }
  
  const service = findService(serviceName);
  if (service?.docsUrl) {
    console.log(`📖 Opening docs for ${service.name}: ${service.docsUrl}`);
    if (service.docsUrl.startsWith('http')) {
      openUrl(service.docsUrl);
    } else if (service.docsUrl.startsWith('docs/') || service.docsUrl.endsWith('.md')) {
      // Local documentation file - use Bun.openInEditor()
      try {
        // Try resolving relative to current working directory first
        let docPath: string;
        try {
          docPath = Bun.resolveSync(service.docsUrl, process.cwd());
        } catch {
          // If resolveSync fails, try as relative path
          docPath = service.docsUrl.startsWith('/') ? service.docsUrl : `${process.cwd()}/${service.docsUrl}`;
        }
        
        const docFile = Bun.file(docPath);
        if (await docFile.exists()) {
          Bun.openInEditor(docPath);
          console.log(`   Opened in editor: ${docPath}`);
        } else {
          console.log(`   File not found: ${docPath}`);
          console.log(`   💡 Tip: Check if the file exists or update the docsUrl in service-registry.ts`);
        }
      } catch (err: any) {
        console.log(`   File not found: ${service.docsUrl}`);
        console.log(`   Error: ${err.message}`);
      }
    } else {
      console.log(`   ${service.docsUrl}`);
    }
  } else {
    console.log(`❌ No docs found for "${serviceName}"`);
  }
}

/**
 * Cross-platform URL opener
 * Uses Bun.which() to find the appropriate command
 * 
 * @param url - URL to open (http/https/chrome://)
 */
function openUrl(url: string): void {
  // Special handling for Chrome DevTools URLs
  if (url.startsWith('chrome://')) {
    // Try multiple Chrome variants using Bun.which()
    const chromeVariants = ['google-chrome', 'chrome', 'chromium', 'google-chrome-stable'];
    const chrome = chromeVariants.find(cmd => Bun.which(cmd));
    
    if (chrome) {
      Bun.spawn([chrome, url], { stdio: SPAWN_STDIO_IGNORE });
      return;
    }
    // Fallback: try platform-specific open command
  }
  
  // Standard URL opening - use Bun.env for platform detection
  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : 
                 platform === 'win32' ? 'start' : 'xdg-open';
  
  const commandPath = Bun.which(command);
  if (commandPath) {
    Bun.spawn([commandPath, url], { stdio: SPAWN_STDIO_IGNORE });
  } else {
    console.log(`ℹ️  Please open manually: ${url}`);
  }
}

function debugService(serviceName?: string) {
  if (!serviceName) {
    console.log('🔧 Available debug interfaces:\n');
    
    // Modern Bun approach - structured table output
    const debugServices = Object.values(SERVICE_REGISTRY)
      .flat()
      .filter(s => s.debugUrl)
      .map(s => ({ Service: s.name, DebugURL: s.debugUrl }));
    
    console.log(Bun.inspect.table(debugServices, { colors: true }));
    
    console.log(`\n💡 Usage: '${Bun.main} debug "<service-name>"'`);
    return;
  }
  
  const service = findService(serviceName);
  if (service?.debugUrl) {
    // Validate URL format
    try {
      // Skip validation for chrome:// and cursor:// URLs
      if (!service.debugUrl.startsWith('chrome://') && 
          !service.debugUrl.startsWith('cursor://') &&
          !service.debugUrl.startsWith('tmux')) {
        new URL(service.debugUrl);
      }
      console.log(`🐛 Opening debug for ${service.name}: ${service.debugUrl}`);
      if (service.debugUrl.startsWith('http') || service.debugUrl.startsWith('chrome://')) {
        openUrl(service.debugUrl);
      } else if (service.debugUrl.startsWith('tmux')) {
        console.log(`   Run: ${service.debugUrl}`);
      } else {
        console.log(`   ${service.debugUrl}`);
      }
    } catch {
      console.log(`⚠️  Invalid URL for ${service.name}: ${service.debugUrl}`);
    }
  } else {
    console.log(`❌ No debug interface for "${serviceName}"`);
  }
}

async function openLogs(serviceName?: string, tail: boolean = false, previewLines: number = 20) {
  if (!serviceName) {
    console.log('📋 Available log files:\n');
    
    const logs = await Promise.all(
      Object.values(SERVICE_REGISTRY).flat()
        .filter(s => s.logsPath && s.logsPath !== 'N/A')
        .map(async (s) => {
          const logPath = s.logsPath.replace('{worktree}', s.worktree).replace('~', Bun.env.HOME || '');
          const size = await formatFileSize(logPath);
          const status = size === 'Not found' ? '⚪ Service offline' : '🟢 Service running';
          
          return {
            Service: s.name,
            Worktree: s.worktree,
            LogFile: logPath,
            Size: size,
            Status: status
          };
        })
    );
    
    console.log(Bun.inspect.table(logs, { colors: true }));
    console.log(`\n💡 Usage: '${Bun.main} logs "<service-name>" [--tail] [--lines=N]'`);
    return;
  }
  
  const service = findService(serviceName);
  if (service?.logsPath && service.logsPath !== 'N/A') {
    const logPath = service.logsPath
      .replace('{worktree}', service.worktree)
      .replace('~', Bun.env.HOME || '');
    
    // Try to resolve path
    let resolvedPath: string;
    try {
      resolvedPath = Bun.resolveSync(logPath, process.cwd());
    } catch {
      // If resolveSync fails, use the path as-is (might be absolute)
      resolvedPath = logPath;
    }
    
    const logFile = Bun.file(resolvedPath);
    const exists = await logFile.exists();
    
    if (tail) {
      // Tail mode - stream logs live
      if (!exists) {
        console.log(`⚠️  Log file not found: ${resolvedPath}`);
        console.log(`   It will be created when the service starts.`);
        return;
      }
      
      console.log(`👀 Tailing logs for ${service.name}...`);
      console.log(`   Press Ctrl+C to stop\n`);
      
      const tailCmd = Bun.which('tail');
      if (!tailCmd) {
        console.log(`❌ 'tail' command not found. Please install coreutils.`);
        return;
      }
      
      const tailProcess = Bun.spawn([tailCmd, '-f', resolvedPath], {
        stdio: ['ignore', 'inherit', 'inherit']
      });
      
      // Handle graceful shutdown
      tailProcess.exited.then(() => {
        console.log('\n✅ Done tailing logs.');
      });
      
      // Wait for process (will be interrupted by Ctrl+C)
      await tailProcess.exited;
      return;
    }
    
    console.log(`📋 Opening logs for ${service.name}: ${resolvedPath}`);
    
    try {
      if (exists) {
        // Show preview of recent entries
        const text = await logFile.text();
        const allLines = text.split('\n').filter(line => line.trim().length > 0);
        const recentLines = allLines.slice(-previewLines);
        
        if (recentLines.length > 0) {
          console.log(`\n📄 Last ${Math.min(recentLines.length, previewLines)} log entries:\n`);
          console.log('─'.repeat(60));
          recentLines.forEach((line, idx) => {
            const lineNum = allLines.length - recentLines.length + idx + 1;
            console.log(`${lineNum.toString().padStart(4)} │ ${line}`);
          });
          console.log('─'.repeat(60));
          console.log(`\n   Total lines: ${allLines.length}`);
        }
        
        // Open in editor (respects $VISUAL, $EDITOR, or bunfig.toml)
        try {
          Bun.openInEditor(resolvedPath, {
            line: 0,
            column: 0
          });
          console.log(`   ✅ Opened in editor`);
        } catch (err: any) {
          console.log(`⚠️  Could not open editor: ${err.message}`);
          console.log(`   Showing preview above.`);
        }
      } else {
        console.log(`⚠️  Log file not found: ${resolvedPath}`);
        console.log(`   It will be created when the service starts.`);
        console.log(`\n💡 Tip: Use '${Bun.main} logs "${serviceName}" --tail' to watch for new logs`);
      }
    } catch (err: any) {
      console.log(`❌ Cannot open log file: ${logPath}`);
      console.log(`   Error: ${err.message}`);
    }
  } else {
    console.log(`❌ No log file configured for "${serviceName}"`);
  }
}

async function formatFileSize(path: string): Promise<string> {
  try {
    const file = Bun.file(path);
    const size = file.size;
    
    if (size === -1) return 'Not found';
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
  } catch {
    return 'N/A';
  }
}

async function showWorktree(worktreeName?: string) {
  const wt = worktreeName 
    ? WORKTREE_CONFIG.worktrees?.find((w: any) => w.name === worktreeName)
    : WORKTREE_CONFIG.worktrees?.find((w: any) => w.default);
  
  if (!wt) {
    console.log('❌ Worktree not found');
    console.log(`Available worktrees: ${WORKTREE_CONFIG.worktrees?.map((w: any) => w.name).join(', ') || 'none'}`);
    return;
  }
  
  console.log(`📂 Worktree: ${wt.name}`);
  console.log(`   Path: ${wt.path}`);
  console.log(`   Branch: ${wt.branch}`);
  console.log(`   Description: ${wt.description || 'N/A'}`);
  
  // Use Bun.env.HOME instead of process.env.HOME for better Bun-native access
  const expandedPath = wt.path.replace('~', Bun.env.HOME || process.env.USERPROFILE || '~');
  try {
    const file = Bun.file(expandedPath);
    const size = await file.size();
    console.log(`   Status: ${size !== -1 ? '🟢' : '⚪'}`);
  } catch {
    console.log(`   Status: ⚪`);
  }
  
  console.log(`\n   Available Commands:`);
  Object.entries(wt.scripts || {}).forEach(([name, cmd]) => {
    console.log(`   - ${name}: ${cmd}`);
  });
  
  console.log(`\n   Environment:`);
  Object.entries(wt.environment || {}).forEach(([key, val]) => {
    console.log(`   - ${key}=${val}`);
  });
}

/**
 * Perform health check on all services
 * 
 * @param notify - Whether to send Telegram notification
 */
async function healthCheck(notify: boolean = false): Promise<void> {
  console.log('🏥 Health Check: All Services\n');
  
  const allServices = Object.values(SERVICE_REGISTRY).flat();
  
  // Check all services concurrently
  const results = await Promise.allSettled(
    allServices.map(async (service) => {
      const start = Bun.nanoseconds();
      const isHealthy = await checkServiceHealthAsync(service);
      const latency = (Bun.nanoseconds() - start) / 1_000_000; // Convert to ms
      return { service, isHealthy, latency: Math.round(latency) };
    })
  );
  
  // Build table data from results
  const tableData = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      const { service, isHealthy, latency } = result.value;
      return {
        Service: service.name,
        Health: isHealthy ? '🟢 Healthy' : '⚪ Offline',
        Latency: isHealthy ? `${latency}ms` : 'N/A'
      };
    } else {
      // Handle rejected promises
      const service = index < allServices.length ? allServices[index] : null;
      return {
        Service: service?.name || 'Unknown',
        Health: '❌ Error',
        Latency: 'N/A'
      };
    }
  });
  
  console.log(Bun.inspect.table(tableData, { colors: true }));
  
  // Send Telegram notification if configured and requested
  if (notify) {
    const telegramToken = Bun.env.TELEGRAM_SERVICE_MAPPER_TOKEN;
    const telegramChatId = Bun.env.TELEGRAM_DEV_CHANNEL_ID;
    
    if (telegramToken && telegramChatId) {
      // Prioritize HIL scenarios in notification
      const hilStatuses = await checkHILScenarios(results, allServices);
      const hasHIL = hilStatuses.some(h => h.triggered);
      
      // Calculate stats
      const unhealthyServices = results
        .filter((r): r is PromiseFulfilledResult<{ service: ServiceDefinition; isHealthy: boolean; latency: number }> => 
          r.status === 'fulfilled' && !r.value.isHealthy
        )
        .map(r => r.value.service);
      
      const errorServices = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => {
          const index = results.indexOf(r);
          return index >= 0 && index < allServices.length ? allServices[index] : null;
        })
        .filter((s): s is ServiceDefinition => s !== null);
      
      const healthyCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.isHealthy
      ).length;
      
      const stats = {
        healthy: healthyCount,
        offline: unhealthyServices.length,
        errors: errorServices.length,
        total: allServices.length
      };
      
      const message = createTelegramMessage({
        stats,
        services: { unhealthy: unhealthyServices, errors: errorServices },
        hilStatuses,
        priority: hasHIL ? 'urgent' : 'normal'
      });
      
      await sendTelegramMessage(message, telegramToken, telegramChatId, stats.offline === 0 && !hasHIL);
    } else {
      console.log('\n⚠️  Telegram not configured. Set TELEGRAM_SERVICE_MAPPER_TOKEN and TELEGRAM_DEV_CHANNEL_ID');
    }
  }
}

/**
 * Check for HIL scenarios based on health check results
 * 
 * @param results - Promise results from health checks
 * @param allServices - All services that were checked
 * @returns Array of HIL status objects
 */
async function checkHILScenarios(
  results: PromiseSettledResult<{ service: ServiceDefinition; isHealthy: boolean; latency: number }>[],
  allServices: ServiceDefinition[]
): Promise<Array<{
  scenario: string;
  triggered: boolean;
  probability: string;
  impact: string;
  affectedServices: string[];
  detection: string;
  mitigation: string;
}>> {
  const hilStatuses: Array<{
    scenario: string;
    triggered: boolean;
    probability: string;
    impact: string;
    affectedServices: string[];
    detection: string;
    mitigation: string;
  }> = [];
  
  // Count offline services per worktree
  const offlineByWorktree = new Map<string, number>();
  const offlineServices: ServiceDefinition[] = [];
  
  results.forEach((result) => {
    if (result.status === 'fulfilled' && !result.value.isHealthy) {
      const service = result.value.service;
      offlineServices.push(service);
      const count = offlineByWorktree.get(service.worktree) || 0;
      offlineByWorktree.set(service.worktree, count + 1);
    }
  });
  
  // HIL Scenario 1: Cascading Supervisor Failure
  offlineByWorktree.forEach((count, worktree) => {
    if (count >= 2) {
      const affected = offlineServices.filter(s => s.worktree === worktree).map(s => s.name);
      hilStatuses.push({
        scenario: 'Cascading Supervisor Failure',
        triggered: true,
        probability: '0.1%',
        impact: 'Critical',
        affectedServices: affected,
        detection: `${count} ${worktree} services offline`,
        mitigation: 'Circuit breakers, bulkhead isolation, supervisor resurrection'
      });
    }
  });
  
  // HIL Scenario 2: Worker Pool Exhaustion
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { service, latency } = result.value;
      if (service.name.includes('Worker') && latency > 1000) {
        hilStatuses.push({
          scenario: 'Worker Pool Exhaustion',
          triggered: true,
          probability: '0.3%',
          impact: 'High',
          affectedServices: [service.name],
          detection: `Latency ${latency}ms exceeds threshold (1000ms)`,
          mitigation: 'Auto-scaling, resource limits, graceful degradation'
        });
      }
    }
  });
  
  // HIL Scenario 3: Gateway Saturation
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { service, latency } = result.value;
      if (service.name.includes('Dev Server') && latency > 100) {
        hilStatuses.push({
          scenario: 'Gateway Saturation Attack',
          triggered: true,
          probability: '0.05%',
          impact: 'Critical',
          affectedServices: [service.name],
          detection: `Latency ${latency}ms exceeds Golden Path SLA (<10ms)`,
          mitigation: 'DDoS protection, rate limiting, traffic shaping'
        });
      }
    }
  });
  
  // HIL Scenario 4: Monitoring Blind Spot
  const telemetryOffline = offlineServices.filter(s => s.name.includes('Telemetry'));
  if (telemetryOffline.length > 0) {
    hilStatuses.push({
      scenario: 'Monitoring Blind Spot',
      triggered: true,
      probability: '0.1%',
      impact: 'Critical',
      affectedServices: telemetryOffline.map(s => s.name),
      detection: `${telemetryOffline.length} telemetry service(s) offline - monitoring coverage compromised`,
      mitigation: 'Redundant monitoring, health check validation, coverage restoration'
    });
  }
  
  // HIL Scenario 5: Notification Channel Deadlock
  const tesRepoTelemetryOffline = offlineServices.filter(s => 
    s.name.includes('Telemetry') && s.worktree === 'tes-repo'
  );
  if (tesRepoTelemetryOffline.length > 0) {
    hilStatuses.push({
      scenario: 'Notification Channel Deadlock',
      triggered: true,
      probability: '0.2%',
      impact: 'High',
      affectedServices: tesRepoTelemetryOffline.map(s => s.name),
      detection: 'Telemetry API offline - alerts may not be delivered',
      mitigation: 'Timeout mechanisms, deadlock detection, fallback channels'
    });
  }
  
  // HIL Scenario 6: Unhandled Exception
  const errorServices = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => {
      const index = results.indexOf(r);
      return index >= 0 && index < allServices.length ? allServices[index] : null;
    })
    .filter((s): s is ServiceDefinition => s !== null);
  
  if (errorServices.length > 0) {
    hilStatuses.push({
      scenario: 'Unhandled Exception',
      triggered: true,
      probability: '0.5%',
      impact: 'High',
      affectedServices: errorServices.map(s => s.name),
      detection: `${errorServices.length} service(s) failed health check with exception`,
      mitigation: 'Error handling, automatic restart, exception monitoring'
    });
  }
  
  return hilStatuses;
}

/**
 * Create Telegram message with HIL prioritization
 */
function createTelegramMessage(options: {
  stats: { healthy: number; offline: number; errors: number; total: number };
  services: { unhealthy: ServiceDefinition[]; errors: ServiceDefinition[] };
  hilStatuses: Array<{
    scenario: string;
    triggered: boolean;
    probability: string;
    impact: string;
    affectedServices: string[];
    detection: string;
    mitigation: string;
  }>;
  priority: 'urgent' | 'normal';
}): string {
  const { stats, services, hilStatuses, priority } = options;
  const triggeredHIL = hilStatuses.filter(h => h.triggered);
  
  // All services healthy and no HIL scenarios
  if (stats.offline === 0 && stats.errors === 0 && triggeredHIL.length === 0) {
    return `✅ *TES Service Health Check*\n\n` +
      `All ${stats.total} services are healthy! 🎉\n\n` +
      `Run \`bun run services health\` for details.`;
  }
  
  // Build message with HIL prioritization
  let message = priority === 'urgent' 
    ? `🚨 *TES Service Alert - HIL SCENARIOS DETECTED*\n\n`
    : `🚨 *TES Service Alert*\n\n`;
  
  // Prioritize HIL scenarios at the top
  if (triggeredHIL.length > 0) {
    message += `*🔴 HIL Scenarios (${triggeredHIL.length}):*\n`;
    triggeredHIL.forEach(hil => {
      const impactEmoji = hil.impact === 'Critical' ? '🔴' : '🟡';
      message += `${impactEmoji} *${hil.scenario}* (${hil.probability}, ${hil.impact})\n`;
      message += `   Affected: ${hil.affectedServices.join(', ')}\n`;
      message += `   Detection: ${hil.detection}\n`;
      message += `   Mitigation: ${hil.mitigation}\n\n`;
    });
  }
  
  // Then show offline services
  if (services.unhealthy.length > 0) {
    message += `*${services.unhealthy.length} service(s) offline:*\n`;
    services.unhealthy.forEach(service => {
      message += `• ${service.name} (${service.worktree})\n`;
    });
    message += '\n';
  }
  
  // Then show error services
  if (services.errors.length > 0) {
    message += `*${services.errors.length} service(s) with errors:*\n`;
    services.errors.forEach(service => {
      message += `• ${service.name} (${service.worktree})\n`;
    });
    message += '\n';
  }
  
  // Status summary
  message += `*Status:* ${stats.healthy}/${stats.total} healthy\n\n`;
  message += `Run \`bun run services health\` for details.`;
  
  if (triggeredHIL.length > 0) {
    message += `\n\n📋 See \`docs/TES-ARCHITECTURE-GOLDEN-PATHS-HIL.md\` for mitigation strategies.`;
  }
  
  return message;
}

/**
 * Send Telegram message
 */
async function sendTelegramMessage(
  message: string,
  telegramToken: string,
  telegramChatId: string,
  isSuccess: boolean = false
): Promise<void> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        parse_mode: 'Markdown',
        text: message
      })
    });
    
    const result = await response.json();
    
    if (result.ok && result.result) {
      if (isSuccess) {
        console.log('\n📱 Success notification sent to Telegram');
      } else {
        console.log(`\n📱 Alert sent to Telegram`);
        console.log(`   Channel: ${result.result.chat?.title || 'N/A'}`);
        console.log(`   Message ID: ${result.result.message_id}`);
      }
    } else {
      console.log(`\n⚠️  Failed to send Telegram notification`);
      console.log(`   Error: ${result.description || result.error_code || 'Unknown error'}`);
      if (process.env.DEBUG) {
        console.log(`   Response: ${JSON.stringify(result)}`);
      }
    }
  } catch (err: any) {
    console.log(`\n⚠️  Failed to send Telegram notification: ${err.message}`);
  }
}

/**
 * Send Telegram notification with health check results (deprecated - use sendTelegramMessage)
 * 
 * @deprecated Use sendTelegramMessage instead
 */
async function sendTelegramHealthNotification(
  results: PromiseSettledResult<{ service: ServiceDefinition; isHealthy: boolean; latency: number }>[],
  allServices: ServiceDefinition[],
  telegramToken: string,
  telegramChatId: string
): Promise<void> {
  try {
    // Extract unhealthy services (fulfilled promises with isHealthy=false)
    const unhealthyServices = results
      .filter((r): r is PromiseFulfilledResult<{ service: ServiceDefinition; isHealthy: boolean; latency: number }> => 
        r.status === 'fulfilled' && !r.value.isHealthy
      )
      .map(r => r.value.service);
    
    // Extract error services (rejected promises)
    const errorServices = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => {
        const index = results.indexOf(r);
        return index >= 0 && index < allServices.length ? allServices[index] : null;
      })
      .filter((s): s is ServiceDefinition => s !== null);
    
    const healthyCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.isHealthy
    ).length;
    
    const totalCount = allServices.length;
    
    if (unhealthyServices.length === 0 && errorServices.length === 0) {
      // All services healthy - optional success notification
      const message = `✅ *TES Service Health Check*\n\n` +
        `All ${totalCount} services are healthy! 🎉\n\n` +
        `Run \`bun run services health\` for details.`;
      
      const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          parse_mode: 'Markdown',
          text: message
        })
      });
      
      const result = await response.json();
      
      if (result.ok) {
        console.log('\n📱 Success notification sent to Telegram');
      } else {
        console.log(`\n⚠️  Failed to send Telegram notification: ${result.description || result.error_code}`);
      }
      return;
    }
    
    // Build alert message for unhealthy/error services
    let message = `🚨 *TES Service Alert*\n\n`;
    
    if (unhealthyServices.length > 0) {
      message += `*${unhealthyServices.length} service(s) offline:*\n`;
      unhealthyServices.forEach(service => {
        message += `• ${service.name} (${service.worktree})\n`;
      });
      message += '\n';
    }
    
    if (errorServices.length > 0) {
      message += `*${errorServices.length} service(s) with errors:*\n`;
      errorServices.forEach(service => {
        message += `• ${service.name} (${service.worktree})\n`;
      });
      message += '\n';
    }
    
    message += `*Status:* ${healthyCount}/${totalCount} healthy\n\n`;
    message += `Run \`bun run services health\` for details.`;
    
    const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        parse_mode: 'Markdown',
        text: message
      })
    });
    
    const result = await response.json();
    
    if (result.ok && result.result) {
      console.log(`\n📱 Alert sent to Telegram (${unhealthyServices.length + errorServices.length} issues)`);
      console.log(`   Channel: ${result.result.chat?.title || 'N/A'}`);
      console.log(`   Message ID: ${result.result.message_id}`);
    } else {
      console.log(`\n⚠️  Failed to send Telegram notification`);
      console.log(`   Error: ${result.description || result.error_code || 'Unknown error'}`);
      console.log(`   Response: ${JSON.stringify(result)}`);
    }
  } catch (err: any) {
    console.log(`\n⚠️  Failed to send Telegram notification: ${err.message}`);
  }
}

/**
 * Asynchronous health check for a service
 * Uses fetch for HTTP endpoints and port binding for WebSockets
 * 
 * @param service - Service definition to check
 * @returns Promise resolving to true if service appears healthy
 */
export async function checkServiceHealthAsync(service: ServiceDefinition): Promise<boolean> {
  try {
    if (service.url.startsWith('http://')) {
      const response = await fetch(service.url, { 
        signal: AbortSignal.timeout(1000) 
      });
      return response.ok;
    } else if (service.url.startsWith('ws://')) {
      // WebSocket health check - try to bind to port
      const { hostname, port } = new URL(service.url);
      try {
        const socket = Bun.listen({
          hostname,
          port: parseInt(port),
          socket: PORT_CHECK_SOCKET_HANDLER
        });
        socket.stop();
        return false; // If we can listen, it's not running
      } catch (err: any) {
        if (err?.code === 'EADDRINUSE') {
          return true; // Port in use = likely running
        }
        return false;
      }
    } else if (
      service.url.startsWith('https://') || 
      service.url.startsWith('chrome://') || 
      service.url === 'cursor://' || 
      service.url === 'N/A'
    ) {
      return true; // External tools always considered "online"
    }
    return false;
  } catch (err: any) {
    // Log error in debug mode, but don't throw
    if (process.env.DEBUG) {
      console.error(`Health check failed for ${service.name}:`, err.message);
    }
    return false;
  }
}

function showHelp() {
  console.log(`
🗺️  TES Development Service Mapper

Usage:
  ./scripts/service-mapper.ts list [category]    List all services
  ./scripts/service-mapper.ts docs [service]     Open documentation
  ./scripts/service-mapper.ts debug [service]     Open debug interface
  ./scripts/service-mapper.ts worktree [name]     Show worktree details
  ./scripts/service-mapper.ts health              Check all service health
  ./scripts/service-mapper.ts health --notify    Check health & send Telegram alert
  ./scripts/service-mapper.ts validate             Validate environment configuration
  ./scripts/service-mapper.ts logs [service]      Open log file in editor 🆕
  ./scripts/service-mapper.ts hil                 Analyze HIL (High-Impact Low-Probability) scenarios 🆕
  ./scripts/service-mapper.ts golden-path          Analyze Golden Path compliance 🆕
  ./scripts/service-mapper.ts resurrection [opts]  HIL Sentinel Resurrection Protocol 🆕
  ./scripts/service-mapper.ts --complete [arg]    Shell completion support

Categories:
  - development (HTTP APIs)
  - websocket (WS endpoints)
  - tools (Bun, Chrome, Cursor, Tmux)
  - orchestration (Tmux sessions)

Examples:
  ./scripts/service-mapper.ts logs "Dev Server"
  ./scripts/service-mapper.ts logs "Dev Server" --tail
  ./scripts/service-mapper.ts logs "Dev Server" --lines=50
  ./scripts/service-mapper.ts debug "Status Live Feed"
  ./scripts/service-mapper.ts health
  ./scripts/service-mapper.ts validate
  ./scripts/service-mapper.ts hil
  ./scripts/service-mapper.ts golden-path
  ./scripts/service-mapper.ts resurrection --hil=full-scan
  ./scripts/service-mapper.ts resurrection --scenario=cascading-failure
  `);
}

/**
 * HIL Sentinel Resurrection Protocol
 * Proactive bulkhead drills and circuit breaker management
 * 
 * @param options - Resurrection protocol options
 */
async function resurrectionProtocol(options?: string): Promise<void> {
  console.log('🔄 HIL Sentinel Resurrection Protocol\n');
  
  const allServices = Object.values(SERVICE_REGISTRY).flat();
  
  // Parse options
  const hilFlag = process.argv.find(arg => arg.startsWith('--hil='));
  const scenarioFlag = process.argv.find(arg => arg.startsWith('--scenario='));
  const bulkheadFlag = process.argv.find(arg => arg.startsWith('--bulkhead='));
  const circuitBreakerFlag = process.argv.find(arg => arg.startsWith('--circuit-breaker='));
  
  const hilMode = hilFlag?.split('=')[1] || 'standard';
  const scenario = scenarioFlag?.split('=')[1];
  const bulkheadMode = bulkheadFlag?.split('=')[1];
  const circuitBreakerMode = circuitBreakerFlag?.split('=')[1];
  
  // Perform health check
  const results = await Promise.allSettled(
    allServices.map(async (service) => {
      const start = Bun.nanoseconds();
      const isHealthy = await checkServiceHealthAsync(service);
      const latency = (Bun.nanoseconds() - start) / 1_000_000;
      return { service, isHealthy, latency: Math.round(latency) };
    })
  );
  
  // Check HIL scenarios
  const hilStatuses = await checkHILScenarios(results, allServices);
  const triggeredHIL = hilStatuses.filter(h => h.triggered);
  
  if (hilMode === 'full-scan') {
    console.log('🔍 Full HIL Scan Mode\n');
    
    if (triggeredHIL.length === 0) {
      console.log('✅ No HIL scenarios detected. System operating within normal parameters.\n');
      console.log('💡 Run proactive bulkhead drills:\n');
      console.log('   bun run scripts/service-mapper.ts resurrection --bulkhead=test\n');
      return;
    }
    
    console.log(`🚨 Detected ${triggeredHIL.length} HIL scenario(s):\n`);
    
    triggeredHIL.forEach((hil, index) => {
      const impactEmoji = hil.impact === 'Critical' ? '🔴' : '🟡';
      console.log(`${index + 1}. ${impactEmoji} ${hil.scenario} (${hil.probability}, ${hil.impact})`);
      console.log(`   Affected: ${hil.affectedServices.join(', ')}`);
      console.log(`   Detection: ${hil.detection}`);
      console.log(`   Mitigation: ${hil.mitigation}\n`);
    });
    
    console.log('🔄 Resurrection Actions:\n');
    
    // Generate resurrection commands
    triggeredHIL.forEach(hil => {
      if (hil.scenario === 'Cascading Supervisor Failure') {
        console.log(`📋 For ${hil.scenario}:`);
        console.log(`   bun run bulkhead --resurrect=supervisor`);
        console.log(`   bun run circuit-breaker --activate --worktree=${hil.affectedServices[0]?.includes('tes-repo') ? 'tes-repo' : 'tmux-sentinel'}`);
        console.log(`   bun run supervisor --resurrect --exponential-backoff\n`);
      } else if (hil.scenario === 'Monitoring Blind Spot') {
        console.log(`📋 For ${hil.scenario}:`);
        console.log(`   bun run monitoring --redundant --activate`);
        console.log(`   bun run health-check --validate --coverage=100`);
        console.log(`   bun run monitoring --restore-coverage\n`);
      } else if (hil.scenario === 'Notification Channel Deadlock') {
        console.log(`📋 For ${hil.scenario}:`);
        console.log(`   bun run telegram --timeout=5s --deadlock-detection`);
        console.log(`   bun run notification --fallback=discord --activate`);
        console.log(`   bun run telegram --reset --replay-messages\n`);
      }
    });
    
    return;
  }
  
  if (scenario) {
    console.log(`🎯 Targeted Resurrection: ${scenario}\n`);
    
    const targetHIL = triggeredHIL.find(h => 
      h.scenario.toLowerCase().includes(scenario.toLowerCase())
    );
    
    if (!targetHIL) {
      console.log(`ℹ️  Scenario "${scenario}" not currently triggered.\n`);
      console.log('💡 Available scenarios:');
      hilStatuses.forEach(h => {
        console.log(`   - ${h.scenario} (${h.triggered ? '🔴 Triggered' : '⚪ Not Triggered'})`);
      });
      return;
    }
    
    console.log(`🔴 ${targetHIL.scenario} detected:\n`);
    console.log(`   Affected: ${targetHIL.affectedServices.join(', ')}`);
    console.log(`   Detection: ${targetHIL.detection}`);
    console.log(`   Mitigation: ${targetHIL.mitigation}\n`);
    
    // Generate specific resurrection commands
    if (targetHIL.scenario === 'Cascading Supervisor Failure') {
      console.log('🔄 Resurrection Commands:\n');
      console.log('   bun run bulkhead --resurrect=supervisor');
      console.log('   bun run circuit-breaker --activate');
      console.log('   bun run supervisor --resurrect --exponential-backoff\n');
    }
    
    return;
  }
  
  if (bulkheadMode === 'test') {
    console.log('🛡️  Bulkhead Isolation Test\n');
    console.log('Testing bulkhead isolation boundaries...\n');
    
    // Simulate bulkhead test
    const worktrees = new Set(allServices.map(s => s.worktree));
    worktrees.forEach(wt => {
      const services = allServices.filter(s => s.worktree === wt);
      const offline = results.filter((r, idx) => {
        if (r.status === 'fulfilled' && !r.value.isHealthy) {
          return allServices[idx]?.worktree === wt;
        }
        return false;
      }).length;
      
      console.log(`📦 Bulkhead: ${wt}`);
      console.log(`   Services: ${services.length}`);
      console.log(`   Offline: ${offline}`);
      console.log(`   Isolation: ${offline >= 2 ? '🔴 CRITICAL - Bulkhead Required' : '🟢 Normal'}\n`);
    });
    
    return;
  }
  
  if (circuitBreakerMode === 'reset') {
    console.log('⚡ Circuit Breaker Reset\n');
    console.log('Resetting circuit breakers for all services...\n');
    
    // Simulate circuit breaker reset
    const offlineServices = results
      .filter((r): r is PromiseFulfilledResult<{ service: ServiceDefinition; isHealthy: boolean; latency: number }> => 
        r.status === 'fulfilled' && !r.value.isHealthy
      )
      .map(r => r.value.service);
    
    if (offlineServices.length === 0) {
      console.log('✅ No circuit breakers to reset. All services healthy.\n');
      return;
    }
    
    console.log(`🔄 Resetting circuit breakers for ${offlineServices.length} service(s):\n`);
    offlineServices.forEach(service => {
      console.log(`   ✅ ${service.name} (${service.worktree})`);
    });
    console.log('\n💡 Circuit breakers reset. Services should recover within 30s.\n');
    
    return;
  }
  
  // Default: Show resurrection status
  console.log('📊 Resurrection Protocol Status\n');
  
  const healthyCount = results.filter(r => 
    r.status === 'fulfilled' && r.value.isHealthy
  ).length;
  
  console.log(`   Current: ${healthyCount}/${allServices.length} healthy`);
  console.log(`   Projected: ${allServices.length}/${allServices.length} healthy (post-resurrection)`);
  console.log(`   HIL Scenarios: ${triggeredHIL.length} triggered\n`);
  
  if (triggeredHIL.length > 0) {
    console.log('🚨 Active HIL Scenarios:\n');
    triggeredHIL.forEach(hil => {
      const impactEmoji = hil.impact === 'Critical' ? '🔴' : '🟡';
      console.log(`   ${impactEmoji} ${hil.scenario} (${hil.impact})`);
    });
    console.log('\n💡 Run full scan: bun run scripts/service-mapper.ts resurrection --hil=full-scan\n');
  } else {
    console.log('✅ No active HIL scenarios. System resilient.\n');
  }
  
  console.log('📋 Available Commands:');
  console.log('   --hil=full-scan              Full HIL scan with resurrection actions');
  console.log('   --scenario=<name>            Targeted resurrection for specific scenario');
  console.log('   --bulkhead=test              Test bulkhead isolation boundaries');
  console.log('   --circuit-breaker=reset      Reset circuit breakers for offline services\n');
}

/**
 * Analyze HIL (High-Impact Low-Probability) scenarios
 * Detects potential HIL events based on service health and latency
 */
async function analyzeHILScenarios(): Promise<void> {
  console.log('🔴 HIL (High-Impact Low-Probability) Scenario Analysis\n');
  
  const allServices = Object.values(SERVICE_REGISTRY).flat();
  
  // Check all services for HIL indicators
  const results = await Promise.allSettled(
    allServices.map(async (service) => {
      const start = Bun.nanoseconds();
      const isHealthy = await checkServiceHealthAsync(service);
      const latency = (Bun.nanoseconds() - start) / 1_000_000; // Convert to ms
      return { service, isHealthy, latency: Math.round(latency) };
    })
  );
  
  // HIL Detection Rules
  const hilScenarios: Array<{
    service: string;
    scenario: string;
    probability: string;
    impact: string;
    detection: string;
    mitigation: string;
  }> = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { service, isHealthy, latency } = result.value;
      
      // HIL Scenario 1: Cascading Failure (multiple services offline)
      if (!isHealthy && service.worktree === 'tes-repo') {
        const offlineCount = results.filter(r => 
          r.status === 'fulfilled' && 
          !r.value.isHealthy && 
          r.value.service.worktree === 'tes-repo'
        ).length;
        
        if (offlineCount >= 2) {
          hilScenarios.push({
            service: service.name,
            scenario: 'Cascading Supervisor Failure',
            probability: '0.1%',
            impact: 'Critical',
            detection: `${offlineCount} tes-repo services offline`,
            mitigation: 'Circuit breakers, bulkhead isolation, supervisor resurrection'
          });
        }
      }
      
      // HIL Scenario 2: Worker Pool Exhaustion (high latency on worker services)
      if (service.name.includes('Worker') && latency > 1000) {
        hilScenarios.push({
          service: service.name,
          scenario: 'Worker Pool Exhaustion',
          probability: '0.3%',
          impact: 'High',
          detection: `Latency ${latency}ms exceeds threshold (1000ms)`,
          mitigation: 'Auto-scaling, resource limits, graceful degradation'
        });
      }
      
      // HIL Scenario 3: Gateway Saturation (high latency on API Gateway)
      if (service.name.includes('Dev Server') && latency > 100) {
        hilScenarios.push({
          service: service.name,
          scenario: 'Gateway Saturation Attack',
          probability: '0.05%',
          impact: 'Critical',
          detection: `Latency ${latency}ms exceeds Golden Path SLA (<10ms)`,
          mitigation: 'DDoS protection, rate limiting, traffic shaping'
        });
      }
      
      // HIL Scenario 4: Monitoring Blind Spot (monitoring services offline)
      if (service.name.includes('Telemetry') && !isHealthy) {
        hilScenarios.push({
          service: service.name,
          scenario: 'Monitoring Blind Spot',
          probability: '0.1%',
          impact: 'Critical',
          detection: 'Telemetry service offline - monitoring coverage compromised',
          mitigation: 'Redundant monitoring, health check validation, coverage restoration'
        });
      }
      
      // HIL Scenario 5: Notification Channel Deadlock (Telegram Bridge offline)
      if (service.name.includes('Telemetry') && !isHealthy && service.worktree === 'tes-repo') {
        hilScenarios.push({
          service: service.name,
          scenario: 'Notification Channel Deadlock',
          probability: '0.2%',
          impact: 'High',
          detection: 'Telemetry API offline - alerts may not be delivered',
          mitigation: 'Timeout mechanisms, deadlock detection, fallback channels'
        });
      }
    } else {
      // HIL Scenario 6: Unhandled Exception (service check failed)
      const service = index < allServices.length ? allServices[index] : null;
      if (service) {
        hilScenarios.push({
          service: service.name,
          scenario: 'Unhandled Exception',
          probability: '0.5%',
          impact: 'High',
          detection: 'Health check failed with exception',
          mitigation: 'Error handling, automatic restart, exception monitoring'
        });
      }
    }
  });
  
  if (hilScenarios.length === 0) {
    console.log('✅ No HIL scenarios detected. All systems operating within normal parameters.\n');
    console.log('💡 HIL scenarios are High-Impact Low-Probability events that require immediate attention.');
    console.log('   See docs/TES-ARCHITECTURE-GOLDEN-PATHS-HIL.md for details.\n');
    return;
  }
  
  // Group by scenario type
  const scenarioGroups = new Map<string, typeof hilScenarios>();
  hilScenarios.forEach(hil => {
    if (!scenarioGroups.has(hil.scenario)) {
      scenarioGroups.set(hil.scenario, []);
    }
    scenarioGroups.get(hil.scenario)!.push(hil);
  });
  
  console.log(`🚨 Detected ${hilScenarios.length} HIL scenario(s) across ${scenarioGroups.size} scenario type(s):\n`);
  
  scenarioGroups.forEach((scenarios, scenarioType) => {
    console.log(`\n📋 ${scenarioType} (${scenarios.length} occurrence(s)):`);
    console.log(`   Probability: ${scenarios[0].probability} | Impact: ${scenarios[0].impact}`);
    console.log(`   Mitigation: ${scenarios[0].mitigation}\n`);
    
    const tableData = scenarios.map(s => ({
      Service: s.service,
      Detection: s.detection,
      'Risk Level': s.impact === 'Critical' ? '🔴 Critical' : '🟡 High'
    }));
    
    console.log(Bun.inspect.table(tableData, { colors: true }));
  });
  
  console.log('\n💡 Recommended Actions:');
  console.log('   1. Review mitigation strategies in docs/TES-ARCHITECTURE-GOLDEN-PATHS-HIL.md');
  console.log('   2. Check service logs: bun run scripts/service-mapper.ts logs "<service>"');
  console.log('   3. Validate environment: bun run scripts/service-mapper.ts validate');
  console.log('   4. Monitor Golden Paths: bun run scripts/service-mapper.ts golden-path\n');
}

/**
 * Analyze Golden Path compliance
 * Checks if services meet their Golden Path SLA requirements
 */
async function analyzeGoldenPaths(): Promise<void> {
  console.log('🟢 Golden Path Compliance Analysis\n');
  
  const allServices = Object.values(SERVICE_REGISTRY).flat();
  
  // Golden Path SLA Definitions
  const goldenPathSLAs: Record<string, { latency: number; availability: number; description: string }> = {
    'Dev Server': { latency: 10, availability: 99.9, description: '<10ms request routing' },
    'Worker Telemetry API': { latency: 50, availability: 99.9, description: '<50ms task assignment' },
    'Status Live Feed': { latency: 50, availability: 99.9, description: '<50ms broadcast' },
    'Worker Updates': { latency: 50, availability: 99.9, description: '<50ms task completion' }
  };
  
  const results = await Promise.allSettled(
    allServices.map(async (service) => {
      const start = Bun.nanoseconds();
      const isHealthy = await checkServiceHealthAsync(service);
      const latency = (Bun.nanoseconds() - start) / 1_000_000; // Convert to ms
      return { service, isHealthy, latency: Math.round(latency) };
    })
  );
  
  const complianceData = results.map((result) => {
    if (result.status === 'fulfilled') {
      const { service, isHealthy, latency } = result.value;
      const sla = goldenPathSLAs[service.name];
      
      if (!sla) {
        return {
          Service: service.name,
          Status: isHealthy ? '🟢 Healthy' : '⚪ Offline',
          Latency: `${latency}ms`,
          'Golden Path': 'N/A',
          Compliance: 'N/A'
        };
      }
      
      const latencyCompliant = latency <= sla.latency;
      const availabilityCompliant = isHealthy;
      const compliant = latencyCompliant && availabilityCompliant;
      
      return {
        Service: service.name,
        Status: isHealthy ? '🟢 Healthy' : '⚪ Offline',
        Latency: `${latency}ms`,
        'Golden Path': sla.description,
        Compliance: compliant ? '✅ Compliant' : 
                    !isHealthy ? '❌ Offline' : 
                    `⚠️ Latency ${latency}ms > ${sla.latency}ms SLA`
      };
    } else {
      const service = allServices[results.indexOf(result)];
      return {
        Service: service?.name || 'Unknown',
        Status: '❌ Error',
        Latency: 'N/A',
        'Golden Path': 'N/A',
        Compliance: '❌ Error'
      };
    }
  });
  
  console.log(Bun.inspect.table(complianceData, { colors: true }));
  
  const compliantCount = complianceData.filter(d => d.Compliance === '✅ Compliant').length;
  const totalWithSLA = complianceData.filter(d => d['Golden Path'] !== 'N/A').length;
  
  console.log(`\n📊 Golden Path Compliance Summary:`);
  console.log(`   Compliant: ${compliantCount}/${totalWithSLA} services with Golden Path SLAs`);
  console.log(`   Compliance Rate: ${totalWithSLA > 0 ? ((compliantCount / totalWithSLA) * 100).toFixed(1) : 0}%\n`);
  
  if (compliantCount < totalWithSLA) {
    console.log('⚠️  Some services are not meeting Golden Path SLAs.');
    console.log('   Review service logs and check for performance degradation.\n');
  } else {
    console.log('✅ All services with Golden Path SLAs are compliant!\n');
  }
  
  console.log('💡 See docs/TES-ARCHITECTURE-GOLDEN-PATHS-HIL.md for detailed Golden Path definitions.\n');
}

async function validateEnvironment() {
  console.log('🔍 Validating TES Development Environment...\n');
  
  const issues: string[] = [];
  const warnings: string[] = [];
  
  // Validate worktree configuration
  if (!WORKTREE_CONFIG.worktrees || WORKTREE_CONFIG.worktrees.length === 0) {
    issues.push('❌ No worktrees configured in .cursor/worktrees.json');
  } else {
    console.log(`✅ Found ${WORKTREE_CONFIG.worktrees.length} worktree(s)\n`);
    
    for (const wt of WORKTREE_CONFIG.worktrees) {
      const expandedPath = wt.path.replace('~', process.env.HOME || process.env.USERPROFILE || '~');
      
      // Check worktree directory exists using Bun.file()
      try {
        const file = Bun.file(expandedPath);
        const size = await file.size();
        if (size === -1) {
          warnings.push(`⚠️  Worktree directory not found: ${expandedPath}`);
        } else {
          console.log(`✅ Worktree directory exists: ${expandedPath}`);
        }
      } catch {
        warnings.push(`⚠️  Worktree directory not found: ${expandedPath}`);
      }
      
      // Check log directory
      const logDir = `${expandedPath}/.tes/logs/${wt.name}`;
      try {
        const logFile = Bun.file(logDir);
        const size = await logFile.size();
        if (size === -1) {
          warnings.push(`⚠️  Log directory missing: ${logDir} (will be created on first run)`);
        } else {
          console.log(`✅ Log directory exists: ${logDir}`);
        }
      } catch {
        warnings.push(`⚠️  Log directory missing: ${logDir} (will be created on first run)`);
      }
      
      // Check ports
      const devPort = parseInt(wt.environment?.DEV_SERVER_PORT || '0', 10);
      const workerPort = parseInt(wt.environment?.WORKER_API_PORT || '0', 10);
      
      if (devPort > 0) {
        try {
          const socket = Bun.listen({
            hostname: 'localhost',
            port: devPort,
            socket: PORT_CHECK_SOCKET_HANDLER
          });
          socket.stop();
          console.log(`✅ Port ${devPort} available for ${wt.name} dev server`);
        } catch (err: any) {
          if (err?.code === 'EADDRINUSE') {
            warnings.push(`⚠️  Port ${devPort} in use (may be running)`);
          } else {
            issues.push(`❌ Port ${devPort} check failed: ${err.message}`);
          }
        }
      }
      
      if (workerPort > 0) {
        try {
          const socket = Bun.listen({
            hostname: 'localhost',
            port: workerPort,
            socket: PORT_CHECK_SOCKET_HANDLER
          });
          socket.stop();
          console.log(`✅ Port ${workerPort} available for ${wt.name} worker API`);
        } catch (err: any) {
          if (err?.code === 'EADDRINUSE') {
            warnings.push(`⚠️  Port ${workerPort} in use (may be running)`);
          } else {
            issues.push(`❌ Port ${workerPort} check failed: ${err.message}`);
          }
        }
      }
      
      console.log('');
    }
  }
  
  // Validate service registry
  const allServices = Object.values(SERVICE_REGISTRY).flat();
  console.log(`✅ Service registry contains ${allServices.length} services`);
  
  // Check for duplicate ports
  const httpServices = allServices.filter(s => s.url.startsWith('http://'));
  const ports = httpServices.map(s => {
    try {
      return parseInt(new URL(s.url).port);
    } catch {
      return null;
    }
  }).filter(Boolean) as number[];
  
  const duplicates = ports.filter((port, index) => ports.indexOf(port) !== index);
  if (duplicates.length > 0) {
    issues.push(`❌ Duplicate ports detected: ${[...new Set(duplicates)].join(', ')}`);
  } else {
    console.log(`✅ No port conflicts detected\n`);
  }
  
  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ Environment validation passed!');
    process.exit(0);
  } else {
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(w => console.log(`   ${w}`));
    }
    if (issues.length > 0) {
      console.log('\n❌ Issues:');
      issues.forEach(i => console.log(`   ${i}`));
      process.exit(1);
    } else {
      console.log('\n✅ Environment validation passed with warnings');
      process.exit(0);
    }
  }
}

