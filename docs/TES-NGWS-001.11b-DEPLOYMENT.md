# TES-NGWS-001.11b: Production Deployment Complete ✅

## **Status: DEPLOYED & OPERATIONAL**

**Deployment Time:** $(date)  
**New PID:** 27454  
**Restart ID:** restart-1762826964

---

## **✅ Deployment Verification**

### **Process Status**
- ✅ New process running: PID 27454
- ✅ Health endpoint responding: http://localhost:3001/health
- ✅ Active pollers: 1
- ✅ Match ID: 663637
- ✅ No errors detected

### **Steam Detection Algorithm**
- ✅ Tuned thresholds deployed (3% for WNCAAAB)
- ✅ Min rapid changes: 2 (reduced from 3)
- ✅ Time window: 1.5s (extended from 1s)
- ✅ Velocity calculation: Fixed (percentage-based)

---

## **📊 Monitoring Commands**

### **Real-Time Steam Monitoring**
```bash
# Watch for steam detections with colorized output
bash scripts/monitor-steam.sh

# Or simple tail
tail -f logs/headers-index.log | rg "STEAM_DETECTED"
```

### **Health & Metrics**
```bash
# Health check
curl http://localhost:3001/health | jq

# Metrics
curl http://localhost:3001/metrics | jq '.poller'

# Verify restart
bash scripts/verify-restart.sh
```

### **Steam Detection Statistics**
```bash
# Count total detections
rg "\[STEAM_DETECTED\]" logs/headers-index.log | wc -l

# Recent detections
rg "\[STEAM_DETECTED\]" logs/headers-index.log | tail -10

# By game ID
rg "\[STEAM_DETECTED\]" logs/headers-index.log | rg -o "gameId:([0-9]+)" -r '$1' | sort | uniq -c
```

---

## **🎯 Expected Behavior**

### **With Tuned Thresholds (3% for WNCAAAB)**

**Normal Market Conditions:**
- 0-1 steam detections per hour
- Small movements (<3%) filtered out

**Moderate Steam:**
- 2-5 detections per hour
- 3-4% movements detected

**Heavy Steam:**
- 10+ detections per hour
- Sharp money movements caught

---

## **🔄 Restart Commands**

### **Zero-Downtime Restart**
```bash
# Full restart with health checks
bun run restart:sentinel

# Or manual
bash scripts/restart-sentinel.sh
```

### **Quick Restart**
```bash
# Simple restart
bun run restart

# Force restart if stuck
bun run force-restart
```

---

## **📈 Post-Deployment Monitoring**

### **First 5 Minutes**
- Monitor for WebSocket connection
- Watch for first steam detection
- Verify Telegram alerts (if configured)

### **First Hour**
- Track detection rate
- Monitor false positives
- Check alert velocity

### **Ongoing**
- Daily review of detection patterns
- Weekly threshold calibration if needed
- Monitor for system errors

---

## **🔍 Troubleshooting**

### **No Steam Detections After 50+ Polls**

1. **Check if data is flowing:**
   ```bash
   tail -n 200 logs/headers-index.log | rg "XML_PARSE" | tail -10
   ```

2. **Lower threshold temporarily:**
   ```bash
   # Edit src/config/steam-config.ts
   # Change wncaab_prop.velocityThreshold to 0.02
   bun run restart:sentinel
   ```

3. **Check actual velocity in logs:**
   ```bash
   # Extract velocity percentages
   tail -n 1000 logs/headers-index.log | rg "XML_PARSE" | \
     rg -o "oldValue:(\d+\.\d+).*newValue:(\d+\.\d+)" -r '$1,$2' | \
     awk -F, '{if($1>0) print ($2-$1)/$1 * 100}' | sort -n | tail -20
   ```

### **Too Many False Positives**

1. **Increase threshold:**
   ```bash
   # Edit src/config/steam-config.ts
   # Change wncaab_prop.velocityThreshold to 0.04
   bun run restart:sentinel
   ```

2. **Increase min rapid changes:**
   ```bash
   # Change wncaab_prop.minRapidChanges to 3
   bun run restart:sentinel
   ```

---

## **📝 Files Created/Modified**

### **New Files**
- `scripts/restart-sentinel.sh` - Zero-downtime restart script
- `scripts/verify-restart.sh` - Post-restart verification
- `scripts/monitor-steam.sh` - Real-time steam monitoring
- `src/config/steam-config.ts` - Sport-specific thresholds
- `scripts/test-steam-manual.ts` - Manual test script

### **Modified Files**
- `src/lib/steam-pattern-analyzer.ts` - Enhanced detection algorithm
- `package.json` - Added restart commands

---

## **🏁 JIRA Status**

- [x] **TES-NGWS-001.11b: Algorithm Tuning** ✅ COMPLETE
- [x] **TES-NGWS-001.12: Production Deployment** ✅ COMPLETE
- [ ] **TES-NGWS-001.11c: Telegram Integration** 🔜 (next)

---

## **🚀 System Ready**

**The sentinel is now armed with tuned detection thresholds and ready to detect steam movements.**

**Next Steps:**
1. Monitor for first steam detection (expected within 5-15 minutes)
2. Verify Telegram alerts are working (if configured)
3. Review detection patterns after 1 hour
4. Adjust thresholds if needed based on real-world data

**Monitor Command:**
```bash
bash scripts/monitor-steam.sh
```







