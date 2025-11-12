# Steam Detection Monitoring Guide

## Quick Start

### Option 1: Use the helper script (recommended)
```bash
./watch-steam-detections.sh
```

### Option 2: Direct command
```bash
tail -f logs/headers-index.log | rg "\[STEAM_DETECTED\]|STEAM_PATTERN"
```

### Option 3: Watch console output
```bash
tail -f binary-samples.log | rg "\[STEAM_DETECTED\]"
```

## What to Look For

Steam detections will appear as:
- `[STEAM_DETECTED]` - Console log format
- `STEAM_PATTERN` - RG log format in headers-index.log

## Expected Output Format

```
[STEAM_DETECTED] {STEAM_PATTERN}~[ANALYSIS][nowgoal26.com][DETECTION][STEAM_PATTERN][BUN-V1.3][TES-NGWS-001.11][SteamPatternAnalyzer][#REF:...][TIMESTAMP:...]
```

## Monitoring Tips

1. **Run during active games**: Steam patterns are most likely during live NBA/WNCAAAB games
2. **Check multiple sources**: Monitor both `headers-index.log` (RG format) and console output
3. **Filter by game**: Use additional rg filters to focus on specific games
4. **Count detections**: Use `rg -c "STEAM_PATTERN" logs/headers-index.log` to count total detections

## Related Commands

```bash
# Count total steam detections
rg -c "STEAM_PATTERN" logs/headers-index.log

# View all steam detections (last 50)
rg "STEAM_PATTERN" logs/headers-index.log | tail -50

# Watch with context (5 lines before/after)
tail -f logs/headers-index.log | rg -A 5 -B 5 "STEAM_PATTERN"

# Monitor specific game ID
tail -f logs/headers-index.log | rg "STEAM_PATTERN" | rg "gameId:12345"
```

