# TES-NGWS-001.12c: tmux Security Hardening - Complete ✅

**Grepable Tag:** `[#TES-NGWS-001.12c:tmux-security]`  
**Status:** ✅ **IMPLEMENTED & VERIFIED**  
**Date:** 2025-11-11

---

## ✅ Implementation Summary

### **1. Socket Security (600/700 Permissions)**

**Implementation:**
- ✅ Auto-fix script in `~/.tmux.conf` sets socket permissions on server start
- ✅ Socket directory: `700` (drwx------)
- ✅ Socket file: `600` (srw-------)
- ✅ Prevents unauthorized access to tmux sessions

**Location:** `~/.tmux.conf` line 16
```bash
run-shell 'SOCKET_DIR="/tmp/tmux-$(id -u)"; if [ -d "$SOCKET_DIR" ]; then chmod 700 "$SOCKET_DIR" 2>/dev/null; find "$SOCKET_DIR" -type s -exec chmod 600 {} \; 2>/dev/null; fi'
```

---

### **2. Environment Variable Leak Prevention**

**Implementation:**
- ✅ No secrets/tokens in global tmux environment
- ✅ Daily security check validates clean environment
- ✅ Filters out false positives (e.g., `BUN_CONFIG_NO_KEYRING`)

**Verification:**
```bash
tmux showenv -g | grep -Ei "token|secret|password|key"
# Should return empty or only safe variables
```

---

### **3. Status Bar Security (No Command Injection)**

**Implementation:**
- ✅ Status bar uses only safe format strings
- ✅ No backticks or external commands
- ✅ `status-left`: Session name only (`#S`)
- ✅ `status-right`: Date/time only (`%Y-%m-%d %H:%M:%S`)

**Location:** `~/.tmux.conf` lines 19-20
```bash
set -g status-left "#S"
set -g status-right "%H:%M"
```

---

### **4. Session Name Sanitization**

**Problem:** VS Code's `${workspaceFolderBasename}` can contain spaces/newlines, creating malformed session names like `sentinel-Production\nApex-\nPERF\nv3_1\nAPPENDIX`.

**Solution:**
- ✅ **Wrapper Script** (`scripts/tmux-sentinel-wrapper.sh`)
  - Sanitizes workspace folder names
  - Replaces spaces/newlines with hyphens
  - Validates session name format: `^sentinel-[a-zA-Z0-9_-]+$`

- ✅ **VS Code Integration** (`.vscode/settings.json`)
  - Updated to use wrapper script
  - Passes `WORKSPACE_FOLDER` environment variable

- ✅ **tmux Validation Hook** (`~/.tmux.conf`)
  - Warns on invalid session names
  - Prevents malformed sessions

- ✅ **Cleanup Script** (`scripts/cleanup-malformed-sessions.sh`)
  - Removes existing malformed sessions
  - Can be run manually or scheduled

---

### **5. Session Persistence**

**Implementation:**
- ✅ tmux-resurrect plugin: Session state saving
- ✅ tmux-continuum plugin: Auto-save every 15 minutes
- ✅ Auto-restore on server start
- ✅ History limit: 10,000 lines for audit review

**Location:** `~/.tmux.conf` lines 29-36

---

### **6. VS Code Integration**

**Configuration:** `.vscode/settings.json`

**Features:**
- ✅ Auto-attach to `sentinel-${workspaceFolderBasename}` session
- ✅ Persistent sessions enabled
- ✅ Cursor terminal hijacking configured
- ✅ Uses sanitized wrapper script

---

## 🔐 Security Checklist

| Component           | Status         | TES-NGWS-001.12c Compliance |
| ------------------- | -------------- | --------------------------- |
| Socket isolation    | ✅ 600/700      | Required                    |
| Environment leaks   | ✅ Clean        | Required                    |
| Status bar          | ✅ No injection | Required                    |
| Session names       | ✅ Sanitized    | Required                    |
| Plugin persistence  | ✅ Enabled      | Recommended                 |
| VS Code integration | ✅ Working      | Required                    |

---

## 📊 Verification Scripts

### **Daily Security Check**
```bash
./scripts/daily-tmux-security-check.sh
```

**Checks:**
- Socket permissions (600/700)
- Environment variable leaks
- Status bar security
- Session name validation

### **Cleanup Malformed Sessions**
```bash
./scripts/cleanup-malformed-sessions.sh
```

**Action:**
- Scans for malformed sentinel sessions
- Removes sessions with invalid names

---

## 🔍 RG Audit Queries

### **Post-Deploy Compliance Audit**

Run the automated audit script:
```bash
./scripts/audit-tes-ngws-001.12c.sh
```

### **Manual Audit Queries**

#### **1. Monitor Security Events (Real-time)**
```bash
tail -f logs/headers-index.log | rg "\[TES-NGWS-001.12c\]\[SECURITY\]"
```

#### **2. Verify Only Bun.secrets Used in Production**
```bash
rg "\[SECRETS_UPGRADE_V3\].*source:bun_secrets" logs/headers-index.log | wc -l
```

#### **3. Find Any .env Fallback (Should be 0 in Prod)**
```bash
rg "\[FALLBACK_TO_ENV\]" logs/headers-index.log | wc -l
```

#### **4. Generate Compliance Report (Last 24h)**
```bash
rg "\[TES-NGWS-001.12c\]" logs/headers-index.log | awk -F'[][]' '{print $2}' | sort | uniq -c
```

### **tmux-Specific Audit Queries**

#### **Check Socket Permissions**
```bash
ls -ld /tmp/tmux-$(id -u)
find /tmp/tmux-$(id -u) -type s -exec ls -l {} \;
```

#### **Find Malformed Sessions**
```bash
tmux list-sessions -F "#{session_name}" | grep sentinel | grep -vE '^sentinel-[a-zA-Z0-9_-]+$'
```

#### **Check Environment Leaks**
```bash
tmux showenv -g | grep -Ei "token|secret|password|api_key|private_key"
```

#### **Verify Status Bar Security**
```bash
tmux show-options -g status-left
tmux show-options -g status-right
# Should not contain backticks or $(...) commands
```

---

## 🚀 Files Created/Modified

### **New Files:**
1. `scripts/tmux-sentinel-wrapper.sh` - Session name sanitization wrapper
2. `scripts/cleanup-malformed-sessions.sh` - Malformed session cleanup
3. `scripts/daily-tmux-security-check.sh` - Daily security verification

### **Modified Files:**
1. `~/.tmux.conf` - Added socket permissions fix and session validation hook
2. `.vscode/settings.json` - Updated to use wrapper script

---

## 📋 Acceptance Criteria

- [x] **Socket Permissions** ✅
  - Socket directory: `700`
  - Socket file: `600`
  - Auto-fix on server start

- [x] **Environment Security** ✅
  - No secrets in global environment
  - Daily check validates clean state

- [x] **Status Bar Security** ✅
  - No command injection vectors
  - Only safe format strings

- [x] **Session Name Sanitization** ✅
  - Wrapper script sanitizes names
  - tmux hook validates on creation
  - Cleanup script removes malformed sessions

- [x] **VS Code Integration** ✅
  - Auto-attach to sanitized session
  - Persistent sessions enabled

---

## 🔒 Security Benefits

1. **Socket Isolation**: Prevents unauthorized access to tmux sessions
2. **No Leaks**: Environment variables don't expose secrets
3. **Injection Prevention**: Status bar can't execute arbitrary commands
4. **Name Validation**: Prevents malformed session names from causing issues
5. **Audit Trail**: All security checks are scriptable and verifiable

---

## 📚 Related Documentation

- [TMUX-SETUP-GUIDE.md](./docs/TMUX-SETUP-GUIDE.md) - `[#TMUX:setup]`
- [TMUX-QUICK-REFERENCE.md](./docs/TMUX-QUICK-REFERENCE.md) - `[#TMUX:reference]`
- [TES-NGWS-001.12c-BUN-SECRETS.md](./docs/TES-NGWS-001.12c-BUN-SECRETS.md) - `[#TES-NGWS-001.12c:secrets]`

---

## Version History

- **v1.0.0** - Initial tmux security hardening (TES-NGWS-001.12c)
  - Socket permissions auto-fix
  - Session name sanitization
  - Environment leak prevention
  - Status bar security


