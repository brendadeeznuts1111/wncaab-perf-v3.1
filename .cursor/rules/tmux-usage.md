# 🔒 TES-NGWS-001.12c: tmux Session Enforcement (MANDATORY)

**ALL TERMINAL COMMANDS MUST EXECUTE IN TMUX SESSION `sentinel-${workspaceFolderBasename}`**

## Agent Protocol:

1. **VERIFY** session exists: `tmux has-session -t sentinel-APPENDIX`

2. **EXECUTE** in Window 5: `tmux send-keys -t sentinel-APPENDIX:5 "COMMAND" Enter`

3. **CAPTURE** output: `tmux capture-pane -t sentinel-APPENDIX:5 -p`

4. **LOG** to audit: All commands logged to `logs/headers-index.log`

## Forbidden Actions:

- ❌ Opening new terminal tabs/windows

- ❌ Using `bun run` without tmux context

- ❌ Closing tmux windows (use detach: `Ctrl+a, d`)

- ❌ Ignoring `$TMUX` environment variable

## Error Recovery:

```bash
# Session missing
tmux has-session -t sentinel-APPENDIX || ./scripts/setup-tmux-sentinel.sh

# Pane not responding
tmux kill-pane -t sentinel-APPENDIX:5
tmux split-window -t sentinel-APPENDIX:5
```

## Session Layout:

- **Window 1** (`🚀 main`): Main development (`bun run dev`)
- **Window 2** (`🛡️ security`): Security monitoring
- **Window 3** (`📊 metrics`): Metrics dashboard
- **Window 4** (`📝 logs`): Log analysis
- **Window 5** (`💻 shell`): **Cursor agents use this window**

## Compliance:

Violations will not be logged to TES-NGWS-001.12c audit trail.

**NEVER** open new terminals. **ALWAYS** use tmux.



