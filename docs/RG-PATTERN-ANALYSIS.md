# TES-OPS-004.B.2.A.9: rg Query Pattern Analysis - Escaped vs Unescaped

**Status:** ✅ **DOCUMENTED**  
**Date:** 2025-11-12  
**Key:** TES-OPS-004.B.2.A.9

## Query Pattern Comparison Table

| Query Type | Cmd Excerpt (Escaped) | Matches / Lines | Meta Tag | HSL Channel Tie-In | Notes |
|------------|----------------------|-----------------|----------|---------------------|-------|
| **Glob Fractured** | `'"[CHANNEL]":\s*"DATA_CHANNEL"' logs/*.log` | **0 matches** | `[META: CHARCLASS]` | Data CH2 #00FF00 | ❌ Unescaped brackets treated as character class |
| **Glob Crystalline** | `'"\[CHANNEL\]":\s*"DATA_CHANNEL"' logs/*.log` | **1 match / 1 line** | `[META: LITERAL]` | Monitor CH4 #FFFF00 | ✅ Escaped brackets match literal `[CHANNEL]` |
| **Corpus Escaped** | `'"\[CHANNEL\]":\s*"(COMMAND\|DATA\|MONITOR)_CHANNEL"' logs/*.log` | **3 unique / 4 lines** | `[META: CORPUS]` | Command CH1 #00FFFF | ✅ Finds all channel types |

## Pattern Analysis

### 1. Glob Fractured (Unescaped - ❌ Doesn't Work)

```bash
rg '"[CHANNEL]":\s*"DATA_CHANNEL"' logs/*.log
```

**Result:** 0 matches

**Why it fails:**
- `[CHANNEL]` is treated as a **character class** in regex
- Matches any single character: C, H, A, N, E, or L
- Does NOT match the literal string `[CHANNEL]`
- The pattern `"[CHANNEL]":` would match `"C":`, `"H":`, `"A":`, etc., but not `"[CHANNEL]":`

**Regex Interpretation:**
```
"[CHANNEL]":  →  " followed by any of [C,H,A,N,E,L] followed by ":
```

### 2. Glob Crystalline (Escaped - ✅ Works)

```bash
rg '"\[CHANNEL\]":\s*"DATA_CHANNEL"' logs/*.log
```

**Result:** 1 match / 1 line

**Why it works:**
- `\[CHANNEL\]` escapes the brackets, making them **literal characters**
- Matches the exact string `[CHANNEL]` in your JSON
- The pattern correctly matches `"[CHANNEL]": "DATA_CHANNEL"`

**Regex Interpretation:**
```
"\[CHANNEL\]":  →  " followed by literal [CHANNEL] followed by ":
```

### 3. Corpus Escaped (All Channels - ✅ Works)

```bash
rg '"\[CHANNEL\]":\s*"(COMMAND|DATA|MONITOR)_CHANNEL"' logs/*.log
```

**Result:** 3 unique channels / 4 total matches

**Channels Found:**
- `COMMAND_CHANNEL` (appears 2x: API Gateway + Worker Pool)
- `DATA_CHANNEL` (appears 1x: Data Processing)
- `MONITOR_CHANNEL` (appears 1x: Monitoring)

**Why it works:**
- Escaped brackets `\[CHANNEL\]` match literal brackets
- Alternation `(COMMAND|DATA|MONITOR)` matches any of the three channel types
- Finds all channel instances across the log file

## Key Takeaways

1. **Always escape brackets** when matching JSON keys with brackets:
   - ❌ Wrong: `[CHANNEL]` (character class)
   - ✅ Right: `\[CHANNEL\]` (literal brackets)

2. **Character class behavior:**
   - `[ABC]` matches any single character: A, B, or C
   - `\[ABC\]` matches the literal string: `[ABC]`

3. **For JSON keys with brackets, use:**
   ```bash
   rg '"\[KEY_NAME\]":' logs/*.log
   ```

4. **For corpus scans with alternation:**
   ```bash
   rg '"\[KEY\]":\s*"(OPTION1|OPTION2|OPTION3)"' logs/*.log
   ```

## Verification Commands

```bash
# Test fractured (should return 0)
rg '"[CHANNEL]":\s*"DATA_CHANNEL"' logs/*.log --stats

# Test crystalline (should return 1)
rg '"\[CHANNEL\]":\s*"DATA_CHANNEL"' logs/*.log --stats

# Test corpus (should return 3+)
rg '"\[CHANNEL\]":\s*"(COMMAND|DATA|MONITOR)_CHANNEL"' logs/*.log --stats
```

## Related Documentation

- `docs/RG-QUERY-EXAMPLES.md` - Complete rg query reference
- `docs/RG-AUDITING.md` - Validated query patterns
- `docs/TES-OPS-004-B-2-A-9-VALIDATION-REPORT.md` - Validation results

[TYPE: RG-PATTERN-ANALYSIS] – Escaped vs Unescaped Patterns Documented; Query Fractures Neutralized.

