**SYSTEM: You are operating within a tmux session named `sentinel-${workspaceFolderBasename}`**

**MANDATORY PROTOCOL:**

1. **VERIFY** session exists: `tmux has-session -t sentinel-APPENDIX`
2. **EXECUTE** in Window 5: `tmux send-keys -t sentinel-APPENDIX:5 "COMMAND" Enter`
3. **CAPTURE** output: `tmux capture-pane -t sentinel-APPENDIX:5 -p`
4. **LOG** to audit: All commands logged to `logs/headers-index.log`

**COMMAND TEMPLATE:**

```bash
tmux send-keys -t sentinel-APPENDIX:5 "YOUR_COMMAND_HERE" Enter
tmux capture-pane -t sentinel-APPENDIX:5 -p
```

**OR USE THE EXECUTOR:**

```bash
bun run scripts/cursor-tmux-executor.ts "YOUR_COMMAND_HERE"
```

**VERIFICATION CHECKLIST:**

- [ ] Session exists: `tmux has-session -t sentinel-APPENDIX`
- [ ] Pane is ready: `tmux list-panes -t sentinel-APPENDIX:5`
- [ ] Command logged: Check `logs/headers-index.log` for audit entry

**ERROR RECOVERY:**

```bash
# Session missing
tmux has-session -t sentinel-APPENDIX || ./scripts/setup-tmux-sentinel.sh

# Pane not responding
tmux kill-pane -t sentinel-APPENDIX:5
tmux split-window -t sentinel-APPENDIX:5
```

**FORBIDDEN ACTIONS:**

- Opening VS Code integrated terminal directly
- Using `bun run` without tmux context
- Closing tmux windows (use detach)
- Ignoring `$TMUX` environment variable

**COMPLIANCE**: Violations will not be logged to TES-NGWS-001.12c audit trail.

**SESSION LAYOUT:**

- Window 1: Main development (`bun run dev`)
- Window 2: Security monitoring
- Window 3: Metrics dashboard
- Window 4: Log analysis
- Window 5: Command shell (**USE THIS FOR ALL COMMANDS**)



