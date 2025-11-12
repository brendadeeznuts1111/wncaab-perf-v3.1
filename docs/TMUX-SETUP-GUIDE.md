# 🔒 tmux Configuration: Production Setup Guide

## ✅ Files Created

1. **`.tmux.conf.example`** - Production-ready tmux configuration template
2. **`scripts/setup-tmux-sentinel.sh`** - Automated setup script
3. **`scripts/verify-tmux-config.sh`** - Verification script
4. **`.vscode/tasks.json`** - Updated with auto-setup task

---

## 🚀 Quick Setup (One-Time)

### Step 1: Copy tmux Configuration

```bash
# Copy the example config to your home directory
cp .tmux.conf.example ~/.tmux.conf

# Or manually create it:
cat .tmux.conf.example > ~/.tmux.conf
```

### Step 2: Run Setup Script

```bash
# This will:
# - Install tmux plugin manager
# - Install required plugins
# - Create sentinel session
# - Set up 5 windows
# - Configure socket permissions

bun run scripts/setup-tmux-sentinel.sh
```

### Step 3: Reload tmux Config

```bash
# If tmux is already running:
tmux source-file ~/.tmux.conf

# Or restart tmux:
tmux kill-server
tmux new-session -d -s test
```

### Step 4: Verify Setup

```bash
./scripts/verify-tmux-config.sh
```

---

## 📋 Current Status

Based on verification:

| Component | Status | Action Needed |
|-----------|--------|---------------|
| tmux 3.5 | ✅ Installed | None |
| ~/.tmux.conf | ⚠️ Missing | Copy `.tmux.conf.example` to `~/.tmux.conf` |
| Session | ⚠️ Missing | Run `bun run scripts/setup-tmux-sentinel.sh` |
| Socket Permissions | ⚠️ 770 (should be 600) | Will be fixed by setup script |
| Plugin Manager | ⚠️ Missing | Will be installed by setup script |
| VS Code Integration | ✅ Configured | None |

---

## 🎯 Key Features

### Security Hardening
- ✅ Socket permissions locked to `0600`
- ✅ Restrictive umask (`077`)
- ✅ No external commands in status bar
- ✅ Session isolation

### VS Code Integration
- ✅ Auto-attach to `sentinel-${workspaceFolderBasename}` session
- ✅ Auto-setup on folder open (via tasks.json)
- ✅ Terminal profile configured

### Session Management
- ✅ 5 pre-configured windows:
  - Window 1: 🚀 main (development)
  - Window 2: 🛡️ security (monitoring)
  - Window 3: 📊 metrics (dashboard)
  - Window 4: 📝 logs (analysis)
  - Window 5: 💻 shell (Cursor agents)

### Key Bindings
- `Alt+h/j/k/l` - Navigate panes
- `Alt+1-5` - Switch windows
- `Prefix+L` - View security logs
- `Prefix+V` - Run verification
- `Prefix+M` - Monitor metrics
- `Prefix+S` - Backup session
- `Prefix+r` - Reload config

---

## 🔧 Troubleshooting

### Socket Permissions Error

```bash
# Fix manually:
TMUX_SOCKET=$(tmux display-message -p "#{socket_path}")
chmod 600 "$TMUX_SOCKET"
```

### Plugins Not Loading

```bash
# Reinstall plugins:
~/.tmux/plugins/tpm/bin/install_plugins
```

### VS Code Not Auto-Attaching

1. Check `.vscode/settings.json` has `tmux-sentinel` profile
2. Reload Cursor: `Cmd+Shift+P` → "Developer: Reload Window"
3. Open new terminal - should auto-attach

---

## 📝 Next Steps

1. **Copy config**: `cp .tmux.conf.example ~/.tmux.conf`
2. **Run setup**: `bun run scripts/setup-tmux-sentinel.sh`
3. **Verify**: `./scripts/verify-tmux-config.sh`
4. **Open Cursor**: Terminal will auto-attach to session

---

## 🏁 Status: Ready for Setup

All configuration files are in place. Execute the setup steps above to complete the tmux integration.

**Compliance:** TES-NGWS-001.12c ✅


