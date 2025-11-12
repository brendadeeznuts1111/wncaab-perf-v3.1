/**
 * Unified Production Entry Point - TES-NGWS-001.13
 * 
 * Main entry point supporting both NowGoal WebSocket and Goaloo901 polling.
 * Includes match discovery, enhanced error handling, and production metrics.
 * 
 * @module src/index-unified
 */

import { Database } from 'bun:sqlite';
import { TotalMarketPoller } from './pollers/total-market-poller.ts';
import { MatchDiscovery } from './utils/match-discovery.ts';
import { TelegramAlertSystemV2 } from './lib/telegram-alert-system-v2.ts';
import type { TelegramAlert } from './config/telegram-config.ts';

/**
 * Initialize from environment variables
 */
const MATCH_IDS = (process.env.GOALOO_MATCH_IDS || '')
  .split(',')
  .map((id) => parseInt(id.trim()))
  .filter((id) => !isNaN(id));

const DISCOVERY_MODE = process.env.DISCOVERY_MODE === 'true';
const DISCOVERY_RANGE = (process.env.DISCOVERY_RANGE || '663600-663800')
  .split('-')
  .map((n) => parseInt(n.trim()))
  .filter((n) => !isNaN(n));

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '2000');

/**
 * Active pollers map
 */
const activePollers = new Map<number, TotalMarketPoller>();

/**
 * Global database for system metrics
 */
const db = new Database('odds-movements.db');

/**
 * Initialize system metrics schema
 */
function initializeMetricsSchema(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS system_metrics (
      metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      active_pollers INTEGER,
      total_moves_detected INTEGER,
      avg_latency_ms REAL,
      error_count INTEGER,
      alerts_sent INTEGER,
      alerts_pinned INTEGER
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON system_metrics(timestamp DESC)`);
}

/**
 * Start a poller for a specific match
 * 
 * @param matchId - Match ID to poll
 * @param interval - Polling interval in milliseconds
 * @param alerts - Telegram alert system instance
 */
function startPoller(matchId: number, interval: number, alerts: TelegramAlertSystemV2): void {
  if (activePollers.has(matchId)) {
    console.log(`⚠️  Poller for match ${matchId} already exists`);
    return;
  }

  try {
    const poller = new TotalMarketPoller(matchId);
    activePollers.set(matchId, poller);
    poller.start(interval);

    console.log(`🚀 Poller started for match ${matchId}`);

    // Send Telegram notification
    alerts
      .sendTelegramAlert({
        type: 'PERFORMANCE' as const,
        severity: 'INFO',
        title: 'Match Monitoring Started',
        message: `Started monitoring match ${matchId}`,
        metadata: { matchId, interval },
        timestamp: Date.now(),
      })
      .catch(console.error);
  } catch (error) {
    console.error(`❌ Failed to start poller for match ${matchId}:`, error);
  }
}

/**
 * Send actionable startup alert with system health and restart pattern detection
 * 
 * Analyzes system state, recent activity, and restart patterns to provide
 * actionable information instead of generic "system started" messages.
 */
async function sendActionableStartupAlert(
  alerts: TelegramAlertSystemV2,
  db: Database,
  activePollersCount: number = 0
): Promise<void> {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  
  // Check for recent restarts (startups within last hour)
  let recentRestarts = 0;
  let lastStartupTime: number | null = null;
  try {
    // Check system_metrics for recent entries (indicates recent activity)
    const recentMetrics = db.prepare(`
      SELECT timestamp, active_pollers 
      FROM system_metrics 
      WHERE timestamp > ? 
      ORDER BY timestamp DESC 
      LIMIT 10
    `).all(oneHourAgo) as Array<{ timestamp: number; active_pollers: number }>;
    
    // Count restarts by detecting gaps in metrics (suggests restart)
    if (recentMetrics.length > 0) {
      lastStartupTime = recentMetrics[recentMetrics.length - 1].timestamp;
      // If we have metrics from last hour, count potential restarts
      recentRestarts = recentMetrics.length;
    }
  } catch (error) {
    // Table might not exist yet or no metrics
    console.warn('[Startup Alert] Could not check restart history:', error);
  }
  
  // Get recent activity metrics
  let recentMoves = 0;
  let recentAlerts = 0;
  let recentErrors = 0;
  try {
    const movesStmt = db.prepare('SELECT COUNT(*) as count FROM total_movements WHERE timestamp > ?');
    const movesResult = movesStmt.get(oneHourAgo) as { count: number };
    recentMoves = movesResult?.count || 0;
    
    const metricsStmt = db.prepare(`
      SELECT 
        SUM(total_moves_detected) as moves,
        SUM(alerts_sent) as alerts,
        SUM(error_count) as errors
      FROM system_metrics 
      WHERE timestamp > ?
    `);
    const metricsResult = metricsStmt.get(oneHourAgo) as {
      moves: number | null;
      alerts: number | null;
      errors: number | null;
    };
    recentAlerts = metricsResult?.alerts || 0;
    recentErrors = metricsResult?.errors || 0;
  } catch (error) {
    // Tables might not exist yet
  }
  
  // Determine severity and action items
  const isRestartPattern = recentRestarts >= 3; // 3+ restarts in last hour
  const hasRecentErrors = recentErrors > 10;
  const timeSinceLastStartup = lastStartupTime ? now - lastStartupTime : null;
  const minutesSinceLastStartup = timeSinceLastStartup ? Math.floor(timeSinceLastStartup / 60000) : null;
  
  let severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO';
  let actionItems: string[] = [];
  let statusEmoji = '✅';
  
  if (isRestartPattern) {
    severity = 'CRITICAL';
    statusEmoji = '🚨';
    actionItems.push(`⚠️ RESTART PATTERN DETECTED: ${recentRestarts} restarts in last hour`);
    actionItems.push('🔍 ACTION REQUIRED: Check logs for crash/error patterns');
    actionItems.push('📋 Investigate: Process manager, memory limits, error logs');
  } else if (hasRecentErrors) {
    severity = 'WARNING';
    statusEmoji = '⚠️';
    actionItems.push(`⚠️ HIGH ERROR RATE: ${recentErrors} errors in last hour`);
    actionItems.push('🔍 ACTION: Review error logs and API connectivity');
  } else if (minutesSinceLastStartup !== null && minutesSinceLastStartup < 5) {
    severity = 'WARNING';
    statusEmoji = '⚠️';
    actionItems.push(`⚠️ RECENT RESTART: Last startup ${minutesSinceLastStartup} minutes ago`);
    actionItems.push('🔍 ACTION: Monitor for stability issues');
  } else {
    actionItems.push('✅ System startup normal - no action needed');
  }
  
  // Get system health metrics
  const memUsage = process.memoryUsage();
  const memUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
  const memTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
  
  // Build actionable message
  const messageParts = [
    `${statusEmoji} <b>System Status: ${isRestartPattern ? 'RESTART PATTERN' : 'OPERATIONAL'}</b>`,
    '',
    '<b>📊 Current State:</b>',
    `• Active Pollers: ${activePollersCount}`,
    `• Match IDs: ${MATCH_IDS.length > 0 ? MATCH_IDS.join(', ') : 'Discovery Mode'}`,
    `• Mode: ${DISCOVERY_MODE ? 'DISCOVERY' : 'NORMAL'}`,
    `• Memory: ${memUsedMB} MB / ${memTotalMB} MB`,
    `• PID: ${process.pid}`,
    '',
    '<b>📈 Recent Activity (Last Hour):</b>',
    `• Movements Detected: ${recentMoves}`,
    `• Alerts Sent: ${recentAlerts}`,
    `• Errors: ${recentErrors}`,
    ...(lastStartupTime ? [`• Last Startup: ${minutesSinceLastStartup !== null ? `${minutesSinceLastStartup} min ago` : 'Unknown'}`] : []),
    '',
    '<b>🎯 Action Items:</b>',
    ...actionItems.map(item => `• ${item}`),
    '',
    '<b>🔗 Quick Links:</b>',
    `• Health: http://localhost:${process.env.PORT || '3001'}/health`,
    `• Metrics: http://localhost:${process.env.PORT || '3001'}/metrics`,
  ];
  
  await alerts.sendTelegramAlert({
    type: 'PERFORMANCE' as const,
    severity,
    title: isRestartPattern ? '🚨 System Restart Pattern Detected' : 'System Startup',
    message: messageParts.join('\n'),
    metadata: {
      version: '2.0.0',
      mode: DISCOVERY_MODE ? 'DISCOVERY' : 'NORMAL',
      matches: MATCH_IDS.length > 0 ? MATCH_IDS.join(',') : 'N/A',
      activePollers: activePollersCount,
      recentRestarts,
      recentMoves,
      recentAlerts,
      recentErrors,
      memoryMB: parseFloat(memUsedMB),
      pid: process.pid,
      isRestartPattern,
      minutesSinceLastStartup,
    },
    timestamp: now,
  });
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Unified Live Odds Pipeline...\n');

  // Bun automatically loads .env file, so these should already be available
  // But we'll validate they exist (check Bun.secrets first, then .env)
  const hasToken = Bun.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const hasSupergroupId = process.env.TELEGRAM_SUPERGROUP_ID || Bun.env.TELEGRAM_SUPERGROUP_ID;
  
  if (!hasToken || !hasSupergroupId) {
    console.error('❌ Missing required configuration:');
    if (!hasToken) {
      console.error('   - TELEGRAM_BOT_TOKEN (not found in Bun.secrets or .env)');
    }
    if (!hasSupergroupId) {
      console.error('   - TELEGRAM_SUPERGROUP_ID (not found in environment)');
    }
    console.error('\n💡 Tip: Run `bun run setup:telegram` to configure .env');
    console.error('   Or use Bun.secrets: bun run scripts/setup-telegram-secret.ts');
    process.exit(1);
  }

  // Initialize database schema
  initializeMetricsSchema();

  console.log(`📊 Configuration:`);
  const tokenSource = Bun.env.TELEGRAM_BOT_TOKEN ? "Bun.secrets" : ".env";
  const tokenPreview = (Bun.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "").substring(0, 10);
  console.log(`   - Bot Token: ${tokenPreview}... (source: ${tokenSource})`);
  console.log(`   - Supergroup ID: ${hasSupergroupId}`);
  console.log(`   - Discovery Mode: ${DISCOVERY_MODE ? 'enabled' : 'disabled'}`);
  if (DISCOVERY_MODE && DISCOVERY_RANGE.length === 2) {
    console.log(`   - Discovery Range: ${DISCOVERY_RANGE[0]} to ${DISCOVERY_RANGE[1]}`);
  }
  console.log(`   - Match IDs: ${MATCH_IDS.length > 0 ? MATCH_IDS.join(', ') : 'none (using discovery)'}`);
  console.log(`   - Polling interval: ${POLL_INTERVAL}ms\n`);

  // Initialize Telegram alerts
  let alerts: TelegramAlertSystemV2;
  try {
    alerts = new TelegramAlertSystemV2();
  } catch (error) {
    console.error('❌ Failed to initialize Telegram alerts:', error);
    process.exit(1);
  }

  // Health check & diagnostics server
  Bun.serve({
    port: parseInt(process.env.PORT || '3001'),
    async fetch(req) {
      const url = new URL(req.url);

      // Health check
      if (url.pathname === '/health') {
        try {
          const stmt = db.prepare('SELECT COUNT(*) as count FROM total_movements WHERE timestamp > ?');
          const recentMoves = stmt.get(Date.now() - 3600000) as { count: number }; // Last hour

          const status = {
            status: 'operational',
            timestamp: Date.now(),
            uptime: process.uptime(),
            active_pollers: activePollers.size,
            match_ids: Array.from(activePollers.keys()),
            recent_moves: recentMoves?.count || 0,
            discovery_mode: DISCOVERY_MODE,
            env: {
              poll_interval: POLL_INTERVAL,
              max_retries: process.env.MAX_RETRIES || '3',
              telegram_configured: !!process.env.TELEGRAM_BOT_TOKEN,
            },
          };

          return new Response(JSON.stringify(status, null, 2), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(
            JSON.stringify({
              status: 'error',
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Match discovery endpoint
      if (url.pathname === '/discover') {
        const start = parseInt(url.searchParams.get('start') || DISCOVERY_RANGE[0]?.toString() || '663600');
        const end = parseInt(url.searchParams.get('end') || DISCOVERY_RANGE[1]?.toString() || '663800');
        const concurrency = parseInt(url.searchParams.get('concurrency') || '5');

        const discovery = new MatchDiscovery();
        const matches = await discovery.scanRange(start, end, concurrency);
        const active = discovery.getActiveMatches();

        return new Response(
          JSON.stringify(
            {
              scanned: `${start}-${end}`,
              total_checked: matches.length,
              active_matches: active,
              timestamp: Date.now(),
            },
            null,
            2
          ),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // System metrics endpoint
      if (url.pathname === '/metrics') {
        try {
          const stmt = db.prepare(`
            SELECT 
              COUNT(*) as total_moves,
              AVG(steam_index) as avg_steam,
              MAX(ABS(line_movement)) as max_line_move,
              COUNT(DISTINCT match_id) as unique_matches
            FROM total_movements 
            WHERE timestamp > ?
          `);
          const metrics = stmt.get(Date.now() - 86400000) as {
            total_moves: number;
            avg_steam: number;
            max_line_move: number;
            unique_matches: number;
          }; // Last 24h

          // Add poller metrics
          const pollerMetrics = Array.from(activePollers.values()).reduce(
            (acc, poller) => {
              acc.polls += poller.metrics.polls;
              acc.inserts += poller.metrics.inserts;
              acc.errors += poller.metrics.errors;
              acc.alerts += poller.metrics.alerts;
              acc.pinned += poller.metrics.pinned;
              return acc;
            },
            { polls: 0, inserts: 0, errors: 0, alerts: 0, pinned: 0 }
          );

          return new Response(
            JSON.stringify(
              {
                ...metrics,
                poller: pollerMetrics,
                active_pollers: activePollers.size,
                timestamp: Date.now(),
              },
              null,
              2
            ),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Diagnostics endpoint
      if (url.pathname === '/diagnostics') {
        return new Response(
          JSON.stringify(
            {
              memory: process.memoryUsage(),
              uptime: process.uptime(),
              active_pollers: activePollers.size,
              match_ids: Array.from(activePollers.keys()),
              discovery_mode: DISCOVERY_MODE,
              timestamp: Date.now(),
            },
            null,
            2
          ),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (url.pathname === '/') {
        return new Response(
          JSON.stringify({
            service: 'Unified Live Odds Pipeline',
            version: '2.0.0',
            endpoints: {
              health: '/health',
              discover: '/discover?start=663600&end=663800',
              metrics: '/metrics',
              diagnostics: '/diagnostics',
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  const port = process.env.PORT || '3001';
  console.log(`🏥 Health check: http://localhost:${port}/health`);
  console.log(`🔍 Discovery: http://localhost:${port}/discover?start=663600&end=663800`);
  console.log(`📊 Metrics: http://localhost:${port}/metrics`);
  console.log(`📊 Diagnostics: http://localhost:${port}/diagnostics\n`);

  // Discovery mode
  if (DISCOVERY_MODE) {
    console.log('🎯 Running in DISCOVERY MODE');
    const discovery = new MatchDiscovery();
    await discovery.loadFromDisk();

    if (DISCOVERY_RANGE.length === 2) {
      const matches = await discovery.scanRange(DISCOVERY_RANGE[0], DISCOVERY_RANGE[1], 5);
      const active = discovery.getActiveMatches();

      console.log(`✅ Found ${active.length} active matches`);
      active.forEach((m) => console.log(`  • ${m.matchId}: ${m.teams?.home} vs ${m.teams?.away}`));

      // Start polling only active matches
      active.forEach((m) => {
        startPoller(m.matchId, POLL_INTERVAL, alerts);
      });

      await discovery.saveToDisk();
    } else {
      console.error('❌ Invalid DISCOVERY_RANGE format. Expected: "start-end"');
      process.exit(1);
    }
  } else if (MATCH_IDS.length > 0) {
    // Normal mode: use configured match IDs
    console.log(`🎯 Starting pollers for ${MATCH_IDS.length} configured matches`);

    MATCH_IDS.forEach((matchId) => {
      startPoller(matchId, POLL_INTERVAL, alerts);
    });
  } else {
    const msg = '❌ No MATCH_IDS configured and DISCOVERY_MODE=false';
    console.error(msg);
    await alerts
      .sendTelegramAlert({
        type: 'SECURITY' as const,
        severity: 'CRITICAL',
        title: 'Configuration Error',
        message: msg,
        metadata: { env: Object.keys(process.env).filter((k) => k.startsWith('GOALOO') || k.startsWith('DISCOVERY')) },
        timestamp: Date.now(),
      })
      .catch(console.error);
    process.exit(1);
  }

  if (activePollers.size === 0) {
    console.error('❌ No pollers started. Exiting.');
    process.exit(1);
  }

  console.log(`\n✅ All systems operational. Monitoring ${activePollers.size} match(es).\n`);

  // Send improved startup notification with actionable information
  // Send after pollers are initialized so we have accurate counts
  await sendActionableStartupAlert(alerts, db, activePollers.size).catch(console.error);

  // Metrics collection (every minute)
  setInterval(() => {
    try {
      const totalInserts = Array.from(activePollers.values()).reduce(
        (sum, p) => sum + p.metrics.inserts,
        0
      );
      const totalErrors = Array.from(activePollers.values()).reduce(
        (sum, p) => sum + p.metrics.errors,
        0
      );
      const totalAlerts = Array.from(activePollers.values()).reduce(
        (sum, p) => sum + p.metrics.alerts,
        0
      );
      const totalPinned = Array.from(activePollers.values()).reduce(
        (sum, p) => sum + p.metrics.pinned,
        0
      );

      db.run(
        `INSERT INTO system_metrics (timestamp, active_pollers, total_moves_detected, avg_latency_ms, error_count, alerts_sent, alerts_pinned)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        Date.now(),
        activePollers.size,
        totalInserts,
        0, // avg_latency_ms - would need to track this
        totalErrors,
        totalAlerts,
        totalPinned
      );
    } catch (error) {
      console.error('[Metrics] Failed to record metrics:', error);
    }
  }, 60000); // Every minute

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Initiating graceful shutdown...');

    try {
      await alerts.sendTelegramAlert({
        type: 'SECURITY' as const,
        severity: 'WARNING',
        title: 'System Shutdown',
        message: `Shutting down ${activePollers.size} active pollers`,
        metadata: {
          uptime: process.uptime(),
          totalPollers: activePollers.size,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      // Ignore shutdown errors
    }

    for (const [matchId, poller] of activePollers) {
      poller.stop();
      poller.close();
    }

    db.close();
    console.log('✅ All pollers stopped. Exiting.');
    setTimeout(() => process.exit(0), 1000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Run if executed directly
if (import.meta.main) {
  main().catch(async (error) => {
    console.error('💥 Fatal error during startup:', error);
    
    // Try to send alert if Telegram is configured
    try {
      const alerts = new TelegramAlertSystemV2();
      await alerts.sendTelegramAlert({
        type: 'SECURITY' as const,
        severity: 'CRITICAL',
        title: 'Startup Failure',
        message: error instanceof Error ? error.message : String(error),
        metadata: {
          stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
        },
        timestamp: Date.now(),
      });
    } catch (alertError) {
      // Ignore alert errors during fatal startup
    }
    
    process.exit(1);
  });
}

