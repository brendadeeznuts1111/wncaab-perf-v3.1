# 🔒 tmux Quick Reference: Common Operations

## 📋 Session Management

### Start/Attach to Session
```bash
# Attach to sentinel session (workspace-aware)
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
tmux attach-session -t "$SESSION_NAME"

# Or use the helper script
./scripts/tmux-attach.sh
```

### Detach (Keep Session Running)
```
Ctrl+b, d
```
**Note:** Default prefix is `Ctrl+b`, not `Ctrl+a` (unless you've changed it)

### View All Sessions
```bash
tmux ls
# or
tmux list-sessions
```

### Kill Session (Emergency)
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
tmux kill-session -t "$SESSION_NAME"
```

---

## 🪟 Window Management

### Switch to Security Window (Window 2)
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
tmux select-window -t "$SESSION_NAME":2

# Or use helper script
./scripts/tmux-security.sh
```

### List Windows
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
tmux list-windows -t "$SESSION_NAME"
```

### Create New Window
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
tmux new-window -t "$SESSION_NAME" -n "new-window"
```

### Kill Window
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
tmux kill-window -t "$SESSION_NAME":2
```

---

## ⌨️ Command Execution

### Execute Command in Shell Pane (Window 5, Pane 1)
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
tmux send-keys -t "$SESSION_NAME":5 "bun run scripts/verify-secrets.ts" Enter

# Or use helper script
./scripts/tmux-exec.sh 5 "bun run scripts/verify-secrets.ts"
```

### Execute Command and Capture Output
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
# Send command
tmux send-keys -t "$SESSION_NAME":5 "bun run scripts/verify-secrets.ts" Enter

# Wait a moment, then capture
sleep 2
tmux capture-pane -t "$SESSION_NAME":5 -p -S -30
```

### Execute Command in Specific Pane
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
# Window 5, Pane 0 (first pane)
tmux send-keys -t "$SESSION_NAME":5.0 "command" Enter

# Window 5, Pane 1 (second pane)
tmux send-keys -t "$SESSION_NAME":5.1 "command" Enter
```

---

## 🔧 Configuration

### Reload Config After Changes
```bash
tmux source-file ~/.tmux.conf
```

### Or use key binding (if configured)
```
Ctrl+b, r
```

---

## 💾 Backup & Recovery

### Backup Session State
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
BACKUP_FILE="/tmp/session-backup-$(date +%Y%m%d%H%M%S)"
tmux list-windows -t "$SESSION_NAME" > "$BACKUP_FILE"
echo "✅ Backup saved to: $BACKUP_FILE"

# Or use helper script
./scripts/tmux-backup.sh
```

### Backup All Panes Content
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
BACKUP_DIR="/tmp/tmux-backups-$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"

for window in $(tmux list-windows -t "$SESSION_NAME" -F "#{window_index}"); do
  for pane in $(tmux list-panes -t "$SESSION_NAME:$window" -F "#{pane_index}"); do
    tmux capture-pane -t "$SESSION_NAME:$window.$pane" -p > "$BACKUP_DIR/pane-$window-$pane.log"
  done
done
```

### Save Buffer to File
```bash
tmux save-buffer - /tmp/tmux-buffer-$(date +%Y%m%d%H%M%S).txt
```

---

## 🔍 Monitoring & Debugging

### View Session Info
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
# Show session details
tmux display-message -t "$SESSION_NAME" -p "#{session_name} #{session_windows} windows"

# Show current window
tmux display-message -t "$SESSION_NAME" -p "#{window_name}"

# Show all panes
tmux list-panes -t "$SESSION_NAME":5 -F "#{pane_index}: #{pane_current_command}"
```

### Monitor Activity
```bash
watch -n 1 'tmux list-sessions -F "#{session_name} #{session_attached} #{session_windows}"'
```

---

## 🚀 Quick Helper Scripts

All scripts use workspace-aware session names automatically:

```bash
# Attach to session
./scripts/tmux-attach.sh

# Execute command
./scripts/tmux-exec.sh 5 "bun run scripts/verify-secrets.ts"

# Switch to security window
./scripts/tmux-security.sh

# Backup session
./scripts/tmux-backup.sh
```

---

## 📝 Common Workflows

### Start Development Session
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
# 1. Attach to session
tmux attach-session -t "$SESSION_NAME"

# 2. Switch to main window
tmux select-window -t "$SESSION_NAME":1

# 3. Start dev server
tmux send-keys -t "$SESSION_NAME":1 "bun run dev" Enter
```

### Monitor Security Logs
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
# 1. Switch to security window
tmux select-window -t "$SESSION_NAME":2

# 2. Tail security logs
tmux send-keys -t "$SESSION_NAME":2 "tail -f logs/headers-index.log | rg 'SECURITY|ERROR|TES-NGWS-001.12c'" Enter
```

### Run Verification
```bash
SESSION_NAME="sentinel-$(basename "$(pwd)" | tr ' ' '-')"
# Execute in shell window
tmux send-keys -t "$SESSION_NAME":5 "bun run scripts/verify-secrets.ts" Enter

# Wait and capture output
sleep 3
tmux capture-pane -t "$SESSION_NAME":5 -p -S -20
```

---

## 🎯 Key Bindings Reference

| Key | Action |
|-----|--------|
| `Ctrl+b, d` | Detach from session |
| `Ctrl+b, r` | Reload config |
| `Alt+h/j/k/l` | Navigate panes |
| `Alt+1-5` | Switch windows |
| `Ctrl+b, L` | View security logs |
| `Ctrl+b, V` | Run verification |
| `Ctrl+b, M` | Monitor metrics |
| `Ctrl+b, S` | Backup session |

---

## ⚠️ Important Notes

1. **Session Name**: Use `sentinel-$(basename "$(pwd)" | tr ' ' '-')` for workspace-aware names
2. **Prefix Key**: Default is `Ctrl+b`, not `Ctrl+a`
3. **Pane Indexing**: Starts at 0 (pane 0, pane 1, etc.)
4. **Window Indexing**: Starts at 1 (window 1, window 2, etc.)
5. **Detaching**: Always detach (`Ctrl+b, d`) instead of closing terminal

---

## 🔗 Related Files

- `~/.tmux.conf` - Main tmux configuration
- `scripts/setup-tmux-sentinel.sh` - Setup script
- `scripts/verify-tmux-config.sh` - Verification script
- `scripts/tmux-attach.sh` - Quick attach helper
- `scripts/tmux-exec.sh` - Command execution helper
- `scripts/tmux-security.sh` - Security window helper
- `scripts/tmux-backup.sh` - Backup helper
- `.vscode/settings.json` - VS Code integration

---

**Quick Tip**: Create aliases in your shell config:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias tma='tmux attach-session -t sentinel-$(basename $(pwd) | tr " " "-")'
alias tml='tmux ls'
alias tmk='tmux kill-session -t sentinel-$(basename $(pwd) | tr " " "-")'
alias tmr='tmux source-file ~/.tmux.conf'
```
