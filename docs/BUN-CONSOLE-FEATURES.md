# Bun Console Features for NowGoal WebSocket Monitoring

## Overview

This document describes how Bun's console features are used to enhance debugging and monitoring of the NowGoal WebSocket integration.

## Console Depth Configuration

### Configuration

The `bunfig.toml` file includes console depth configuration for better inspection of nested objects:

```toml
# Console configuration for debugging nested objects
# NowGoalTick and protocol analysis results have nested structures
# Default depth: 2, increase for deeper inspection during debugging
console.depth = 4
```

### Usage

**Default behavior (depth 2):**
```typescript
const tick: NowGoalTick = {
  gameId: "12345",
  market: {
    homeTeam: "Team A",
    league: "WNCAAB"
  }
};
console.log(tick);
// Output: { gameId: '12345', market: { homeTeam: 'Team A', league: [Object] } }
```

**With depth 4 (configured):**
```typescript
console.log(tick);
// Output: { gameId: '12345', market: { homeTeam: 'Team A', league: 'WNCAAB' } }
```

### Override for Single Run

You can override the configured depth for a single run:

```bash
bun --console-depth 6 run src/index.ts
```

### Benefits

- **Better debugging**: See deeper into nested `NowGoalTick` objects
- **Protocol analysis**: Inspect complex protocol analysis results
- **Steam detection**: View full steam pattern analyzer state

## Interactive Monitor (Stdin Reading)

### Overview

The interactive monitor uses Bun's `console` as an `AsyncIterable` to read commands from stdin while monitoring WebSocket data.

### Usage

```bash
# Start interactive monitor
bun run monitor:nowgoal
# or
bun run monitor:ws
```

### Commands

| Command | Description |
|---------|-------------|
| `stats` | Show monitoring statistics (uptime, message rate, steam detections) |
| `steam` | Show recent steam detection count and timing |
| `verbose` | Toggle verbose logging (show all ticks) |
| `quiet` | Enable quiet mode (errors only) |
| `clear` | Clear console |
| `help` | Show help message |
| `exit` | Exit monitor gracefully |

### Example Session

```bash
$ bun run monitor:nowgoal
🚀 Starting Interactive NowGoal WebSocket Monitor
📝 Type "help" for commands, "exit" to quit

✅ Connected to NowGoal WebSocket

> stats

📊 Monitor Statistics:
  Uptime: 45s
  Total Messages: 1234
  Message Rate: 27.42 msg/s
  Steam Detections: 3
  Last Steam: 12s ago
  Verbose Mode: OFF

> verbose
✅ Verbose mode: ON

> help

📋 Interactive Monitor Commands:
  stats    - Show monitoring statistics
  steam    - Show recent steam detections
  verbose  - Toggle verbose logging
  quiet    - Toggle quiet mode (errors only)
  clear    - Clear console
  help     - Show this help message
  exit     - Exit monitor

> exit
🛑 Shutting down monitor...
```

### Implementation

The interactive monitor uses Bun's stdin reading feature:

```typescript
// Read commands from stdin
for await (const line of console) {
  await this.handleCommand(line);
  console.write('> ');
}
```

### Benefits

- **Real-time monitoring**: Monitor WebSocket data while issuing commands
- **Dynamic control**: Toggle verbose mode, check stats without restarting
- **Production debugging**: Inspect live data flow interactively
- **Performance metrics**: Track message rates and steam detection frequency

## Integration Points

### NowGoalTick Logging

With `console.depth = 4`, logging `NowGoalTick` objects shows full structure:

```typescript
console.log('📊 Steam detected:', tick);
// Shows full nested structure including market.league, market.homeTeam, etc.
```

### Protocol Analysis

Complex protocol analysis results are fully visible:

```typescript
const analysis = NowGoalProtocolAnalyzer.analyzeDetailed(data);
console.log('Protocol analysis:', analysis);
// Shows full metadata, decoded content, confidence scores
```

### Steam Pattern Analyzer

Steam detection state is inspectable:

```typescript
const analyzer = new SteamPatternAnalyzer();
// After processing ticks, internal state is visible in logs
```

## Best Practices

1. **Development**: Use `console.depth = 4` or higher for debugging
2. **Production**: Keep default depth (2) for performance
3. **Interactive debugging**: Use `monitor:nowgoal` for live inspection
4. **CLI override**: Use `--console-depth` for one-off deep inspection

## Related Documentation

- [Bun Console Documentation](https://bun.sh/docs/api/console)
- [NowGoal WebSocket Integration](./TES-NGWS-001.md)
- [Steam Pattern Detection](./STEAM-DETECTION-MONITORING.md)

