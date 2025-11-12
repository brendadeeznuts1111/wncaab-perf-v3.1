# rg Query Examples for TES Thread/Channel Metadata

**TES-OPS-004.B.2.A.8**: Thread/Channel Context Metadata Queries

## Log Format

Logs are written as JSON objects with the following structure:
```json
{
  "[TES_EVENT]": "worker:assigned",
  "[TIMESTAMP]": 1733808000000,
  "[ISO_TIME]": "2025-12-10T12:00:00.000Z",
  "[USER]": "user",
  "[THREAD_GROUP]": "WORKER_POOL",
  "[THREAD_ID]": "0x3001",
  "[CHANNEL]": "COMMAND_CHANNEL",
  "[HSL]": "#FF006E",
  "[SIGNED]": "uuid-...",
  ...
}
```

## rg Query Examples

### Find All API Gateway Events

```bash
# Search for API_GATEWAY thread group in JSON logs (specify file directly)
rg '"\[THREAD_GROUP\]":\s*"API_GATEWAY"' logs/worker-events.log

# Or search all log files in directory
rg '"\[THREAD_GROUP\]":\s*"API_GATEWAY"' logs/*.log

# Alternative: Search for API Gateway thread ID range (0x2000-0x2FFF)
rg '"\[THREAD_ID\]":\s*"0x2[0-9a-fA-F]{3}"' logs/worker-events.log

# Find specific API Gateway thread (0x2001)
rg '"\[THREAD_ID\]":\s*"0x2001"' logs/worker-events.log
```

### Find Worker Pool Operations

```bash
# Search for WORKER_POOL thread group
rg '"\[THREAD_GROUP\]":\s*"WORKER_POOL"' logs/worker-events.log

# Find worker pool thread ID (0x3001)
rg '"\[THREAD_ID\]":\s*"0x3001"' logs/worker-events.log

# Find worker assignment events
rg '"\[TES_EVENT\]":\s*"worker:assigned"' logs/worker-events.log

# Find worker termination events
rg '"\[TES_EVENT\]":\s*"worker:terminated"' logs/worker-events.log
```

### Find Data Channel Events

```bash
# Search for DATA_CHANNEL in JSON logs
rg '"\[CHANNEL\]":\s*"DATA_CHANNEL"' logs/worker-events.log --context=3

# Find data processing thread group (0x4000-0x4FFF)
rg '"\[THREAD_ID\]":\s*"0x4[0-9a-fA-F]{3}"' logs/worker-events.log --context=3

# Find validation events (uses DATA_CHANNEL)
rg '"\[TES_EVENT\]":\s*"VALIDATION_START"' logs/worker-events.log --context=3
```

### Find Monitoring Events

```bash
# Search for MONITORING thread group
rg '"\[THREAD_GROUP\]":\s*"MONITORING"' logs/worker-events.log

# Find monitor channel events
rg '"\[CHANNEL\]":\s*"MONITOR_CHANNEL"' logs/worker-events.log

# Find channel notifications
rg '"\[TES_EVENT\]":\s*"CHANNEL_NOTIFY"' logs/worker-events.log

# Find monitoring thread IDs (0x5000-0x5FFF)
rg '"\[THREAD_ID\]":\s*"0x5[0-9a-fA-F]{3}"' logs/worker-events.log
```

### Advanced Queries

#### Find Events by HSL Color

```bash
# Find API Gateway events (Purple #8338EC)
rg '"\[HSL\]":\s*"#8338EC"' logs/worker-events.log

# Find Worker Pool events (Pink #FF006E)
rg '"\[HSL\]":\s*"#FF006E"' logs/worker-events.log

# Find Data Processing events (Orange #FB5607)
rg '"\[HSL\]":\s*"#FB5607"' logs/worker-events.log

# Find Monitoring events (Green #38B000)
rg '"\[HSL\]":\s*"#38B000"' logs/worker-events.log
```

#### Find Events by Time Range

```bash
# Find events in last hour (using ISO_TIME)
rg '"\[ISO_TIME\]":\s*"2025-12-10T1[0-9]:"' logs/

# Find events by timestamp (Unix milliseconds)
rg '"\[TIMESTAMP\]":\s*1[0-9]{12}' logs/
```

#### Combine Filters

```bash
# Find API Gateway auth failures
rg '"\[THREAD_GROUP\]":\s*"API_GATEWAY".*"\[TES_EVENT\]":\s*".*auth_failed"' logs/ --multiline

# Find worker operations with errors
rg '"\[THREAD_GROUP\]":\s*"WORKER_POOL".*"error"' logs/ --multiline

# Find validation events in data channel
rg '"\[CHANNEL\]":\s*"DATA_CHANNEL".*"\[TES_EVENT\]":\s*"VALIDATION"' logs/ --multiline
```

### JSON-Aware Queries (Using jq + rg)

For more complex queries, combine `rg` with `jq`:

```bash
# Extract all thread groups
rg -o '"\[THREAD_GROUP\]":\s*"([^"]+)"' logs/ | sort | uniq -c

# Count events by thread group
cat logs/worker-events.log | jq -r '.["THREAD_GROUP"]' | sort | uniq -c

# Find events with specific thread ID and show full context
rg '"\[THREAD_ID\]":\s*"0x3001"' logs/ -A 10 -B 2
```

### Performance Tips

1. **Use `--stats`** to see match counts without output:
   ```bash
   rg '"\[THREAD_GROUP\]":\s*"API_GATEWAY"' logs/ --stats
   ```

2. **Use `--json`** for programmatic processing:
   ```bash
   rg '"\[THREAD_ID\]":\s*"0x3001"' logs/ --json | jq 'select(.type == "match")'
   ```

3. **Limit search to specific log files**:
   ```bash
   rg '"\[CHANNEL\]":\s*"DATA_CHANNEL"' logs/worker-events.log
   ```

4. **Use `--type-add`** for custom file types:
   ```bash
   rg --type-add 'log:*.log' -tlog '"\[THREAD_GROUP\]"' logs/
   ```

## Thread ID Ranges Reference

- **0x1000-0x1FFF**: Core System (Blue #3A86FF)
- **0x2000-0x2FFF**: API Gateway (Purple #8338EC)
- **0x3000-0x3FFF**: Worker Pool (Pink #FF006E)
- **0x4000-0x4FFF**: Data Processing (Orange #FB5607)
- **0x5000-0x5FFF**: Monitoring (Green #38B000)
- **0x6000-0x8FFF**: External Services (Purple #9D4EDD)

## Channel Types

- **COMMAND_CHANNEL**: Command/control operations
- **DATA_CHANNEL**: Data processing operations
- **EVENT_CHANNEL**: Event notifications
- **MONITOR_CHANNEL**: Monitoring and telemetry

## Example Output

```bash
$ rg '"\[THREAD_GROUP\]":\s*"API_GATEWAY"' logs/worker-events.log

2025-12-10T12:00:00.000Z {
  "[TES_EVENT]": "worker:registry:auth_failed",
  "[TIMESTAMP]": 1733808000000,
  "[ISO_TIME]": "2025-12-10T12:00:00.000Z",
  "[USER]": "user",
  "[THREAD_GROUP]": "API_GATEWAY",
  "[THREAD_ID]": "0x2001",
  "[CHANNEL]": "COMMAND_CHANNEL",
  "[HSL]": "#8338EC",
  "[SIGNED]": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "reason": "Missing or invalid X-TES-Dev-Token"
}
```

## See Also

- `docs/TES-OPS-004-B-2-A-8-EXECUTION-LOG.md` - Full implementation details
- `lib/production-utils.ts` - Logging implementation
- `src/config/version-registry-loader.ts` - Validation hooks

