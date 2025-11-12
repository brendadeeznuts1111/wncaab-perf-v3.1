# TES-NGWS-001.12c: Cron Jobs Configuration

**Grepable Tag:** `[#TES-NGWS-001.12c:cron]`  
**Purpose:** Automated security maintenance tasks

---

## Cron Jobs

### **Installation**

```bash
# Copy cron jobs to crontab
crontab -l > /tmp/current-crontab 2>/dev/null || true
cat scripts/cron-tes-ngws-001.12c.txt >> /tmp/current-crontab
crontab /tmp/current-crontab
rm /tmp/current-crontab

# Verify installation
crontab -l | grep TES-NGWS-001.12c
```

### **Cron Schedule**

#### **Daily (2:00 AM) - tmux Security Check**
```bash
0 2 * * * cd /opt/sentinel && ./scripts/daily-tmux-security-check.sh >> logs/security-audit.log 2>&1
```

**Purpose:**
- Verify socket permissions (600/700)
- Check for environment variable leaks
- Validate status bar security
- Check for malformed session names

**Logs:** `logs/security-audit.log`

---

#### **Weekly (Sunday 3:00 AM) - tmux Session Cleanup**
```bash
0 3 * * 0 cd /opt/sentinel && ./scripts/fix-tmux-session-names.sh >> logs/security-audit.log 2>&1
```

**Purpose:**
- Remove malformed sentinel sessions
- Fix socket permissions
- Clean up orphaned sessions

**Logs:** `logs/security-audit.log`

---

#### **Monthly (1st of month, 4:00 AM) - Secret Rotation**
```bash
0 4 1 * * cd /opt/sentinel && [ -n "$NEW_TELEGRAM_BOT_TOKEN" ] && bun run scripts/rotate-secrets-atomic.ts >> logs/security-audit.log 2>&1 || echo "Skipping rotation: NEW_TELEGRAM_BOT_TOKEN not set" >> logs/security-audit.log
```

**Purpose:**
- Rotate Telegram bot token atomically
- Create backup of old token
- Verify rotation success
- Log rotation event

**Logs:** 
- `logs/security-audit.log` (rotation process)
- `logs/secret-rotation.log` (rotation events)
- `tmp/secret-backup.json` (token backup)

**Note:** Requires `NEW_TELEGRAM_BOT_TOKEN` environment variable. Set in crontab or use systemd environment file. For manual rotation, see below.

---

## Manual Execution

### **Daily Check**
```bash
cd /opt/sentinel
./scripts/daily-tmux-security-check.sh
```

### **Weekly Cleanup**
```bash
cd /opt/sentinel
./scripts/fix-tmux-session-names.sh
```

### **Monthly Rotation**
```bash
cd /opt/sentinel
NEW_TELEGRAM_BOT_TOKEN="your_new_token_here" bun run scripts/rotate-secrets-atomic.ts
```

---

## Log Monitoring

### **View Security Audit Log**
```bash
tail -f logs/security-audit.log
```

### **View Secret Rotation Log**
```bash
tail -f logs/secret-rotation.log
```

### **Check Recent Cron Executions**
```bash
grep TES-NGWS-001.12c /var/log/cron.log
# Or on macOS:
grep TES-NGWS-001.12c /var/log/system.log
```

---

## Troubleshooting

### **Cron Not Running**

1. Check cron service:
   ```bash
   # macOS
   sudo launchctl list | grep cron
   
   # Linux
   sudo systemctl status cron
   ```

2. Verify cron permissions:
   ```bash
   ls -la scripts/daily-tmux-security-check.sh
   chmod +x scripts/*.sh
   ```

3. Check cron logs:
   ```bash
   # macOS
   log show --predicate 'process == "cron"' --last 1h
   
   # Linux
   grep CRON /var/log/syslog
   ```

### **Scripts Failing**

1. Check script paths:
   ```bash
   # Ensure scripts are executable
   chmod +x scripts/daily-tmux-security-check.sh
   chmod +x scripts/fix-tmux-session-names.sh
   ```

2. Verify working directory:
   ```bash
   # Scripts assume /opt/sentinel
   # Adjust paths in cron jobs if different
   ```

3. Check dependencies:
   ```bash
   # Ensure bun is in PATH
   which bun
   ```

---

## Security Considerations

1. **Log File Permissions**: Ensure `logs/security-audit.log` has restricted permissions
   ```bash
   chmod 600 logs/security-audit.log
   ```

2. **Secret Backup**: `tmp/secret-backup.json` contains sensitive data
   ```bash
   chmod 600 tmp/secret-backup.json
   ```

3. **Cron Environment**: Cron jobs run with minimal environment
   - Ensure full paths are used
   - Set PATH explicitly if needed
   - Use absolute paths for scripts

---

## Related Documentation

- [TES-NGWS-001.12c-BUN-SECRETS.md](./docs/TES-NGWS-001.12c-BUN-SECRETS.md) - Secret management
- [TES-NGWS-001.12c-TMUX-SECURITY.md](./docs/TES-NGWS-001.12c-TMUX-SECURITY.md) - tmux security
- [SECURE-TOKEN-MANAGEMENT.md](./docs/SECURE-TOKEN-MANAGEMENT.md) - Token rotation guide

---

## Version History

- **v1.0.0** - Initial cron configuration (TES-NGWS-001.12c)

