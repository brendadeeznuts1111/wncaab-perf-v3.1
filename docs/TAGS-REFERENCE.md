# Grepable Tags Quick Reference

**Grepable Tag:** `[#DOCS:tags-reference]`  
**Version:** `1.0.0`

---

## Tag Categories

### Core Documentation Tags

| Category | Pattern | Count | Example |
|----------|---------|-------|---------|
| **COMMANDS** | `[#COMMANDS:*]` | 8 | `[#COMMANDS:server]` |
| **PORT** | `[#PORT:*]` | 6 | `[#PORT:management]` |
| **STATUS** | `[#STATUS:*]` | 5 | `[#STATUS:system]` |
| **TELEGRAM** | `[#TELEGRAM:*]` | 7 | `[#TELEGRAM:alert-system]` |
| **DOCS** | `[#DOCS:*]` | 4 | `[#DOCS:index]` |
| **README** | `[#README:*]` | 1 | `[#README:quick-start]` |

---

## Common Searches

### Find All Tags
```bash
rg '\[#.*?\]' --type md
```

### Find Specific Category
```bash
# Telegram tags
rg '\[#TELEGRAM:.*?\]' --type md

# Command tags
rg '\[#COMMANDS:.*?\]' --type md

# Port tags
rg '\[#PORT:.*?\]' --type md

# Status tags
rg '\[#STATUS:.*?\]' --type md
```

### Find Files by Tag
```bash
# Files containing Telegram tags
rg -l '\[#TELEGRAM:.*?\]' --type md

# Files with command references
rg -l '\[#COMMANDS:.*?\]' --type md
```

### Count Tags by Category
```bash
# Count all tags
rg '\[#.*?\]' --type md | wc -l

# Count by category
rg '\[#TELEGRAM:.*?\]' --type md | wc -l
```

---

## Tag Structure

**Format:** `[#CATEGORY:subcategory]`

**Examples:**
- `[#TELEGRAM:alert-system]` - Main Telegram system tag
- `[#TELEGRAM:config]` - Configuration section
- `[#TELEGRAM:commands]` - Commands section
- `[#COMMANDS:server]` - Server commands
- `[#PORT:management]` - Port management

---

## Usage Examples

### Find Documentation Sections
```bash
# Find all Telegram documentation
rg '\[#TELEGRAM:.*?\]' --type md -B 2

# Find port troubleshooting
rg '\[#PORT:troubleshooting\]' --type md -A 10
```

### Extract Tag List
```bash
# All unique tags
rg '\[#[A-Z]+:[^\]]+\]' --type md -o | sort | uniq

# Tags by file
rg '\[#.*?\]' --type md -o | sort | uniq -c | sort -rn
```

---

## Tag Index

### COMMANDS Tags
- `[#COMMANDS:reference]` - Main command reference
- `[#COMMANDS:server]` - Server management
- `[#COMMANDS:port]` - Port commands
- `[#COMMANDS:monitoring]` - Monitoring commands
- `[#COMMANDS:telegram]` - Telegram commands
- `[#COMMANDS:health]` - Health check commands
- `[#COMMANDS:dev]` - Development commands
- `[#COMMANDS:build]` - Build commands

### PORT Tags
- `[#PORT:management]` - Port management
- `[#PORT:quick-fix]` - Quick fixes
- `[#PORT:commands]` - Port commands
- `[#PORT:config]` - Configuration
- `[#PORT:troubleshooting]` - Troubleshooting
- `[#PORT:utility]` - Port utilities

### STATUS Tags
- `[#STATUS:system]` - System status
- `[#STATUS:current]` - Current status
- `[#STATUS:health]` - Health endpoint
- `[#STATUS:endpoints]` - Monitoring endpoints
- `[#STATUS:checklist]` - Production checklist

### TELEGRAM Tags
- `[#TELEGRAM:alert-system]` - Alert system
- `[#TELEGRAM:config]` - Configuration
- `[#TELEGRAM:alert-types]` - Alert types
- `[#TELEGRAM:features]` - Features
- `[#TELEGRAM:commands]` - Commands
- `[#TELEGRAM:troubleshooting]` - Troubleshooting
- `[#TELEGRAM:implementation]` - Implementation

---

## Semantic Versioning

All tagged documents include version:
- Format: `vMAJOR.MINOR.PATCH`
- Example: `v1.0.0`, `v2.0.0`

Find versions:
```bash
rg 'Version.*v\d+\.\d+\.\d+' --type md
```

---

## Vector Search Ready

Tags are structured for semantic search:
- Consistent format: `[#CATEGORY:subcategory]`
- Hierarchical structure
- Easy to index and search

---

## Version History

- **v1.0.0** - Initial tag reference







