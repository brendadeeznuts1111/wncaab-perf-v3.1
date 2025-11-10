# AI-IMMUNITY INDEXING: Quick Reference Guide

**Grepable Tag**: `[#GUIDE:ai-immunity-indexing:quick-reference]`

**Date**: November 09, 2025  
**Status**: ✅ **PRODUCTION-READY**  
**Version**: v1.4.0

---

## 🚀 **Quick Start**

### **1. Build Index**
```bash
# Build dual-index (grep + semantic)
bun index:ai-immunity --rebuild

# Refresh Grok embeddings only
bun index:ai-immunity --grok-refresh
```

### **2. Semantic Search**
```bash
# Basic semantic hunt
bun semantic:hunt "high confidence linker automation"

# With threshold
bun semantic:hunt "deprecated patterns" --threshold=0.7

# Enhanced version with filtering
bun semantic:hunt:enhanced "query" --min-score=0.8 --limit=5
```

### **3. Hybrid Query**
```bash
# Hybrid grep + semantic
bun hybrid:query "immunity configuration" --grep="AI-IMMUNITY"

# With refresh
bun hybrid:query "query" --grep="pattern" --refresh --threshold=0.6
```

### **4. Validation & Healing**
```bash
# Validate index
bun audit:index

# Enhanced validation
bun audit:index:enhanced
```

### **5. Migration**
```bash
# Migrate from v1.3.2 to v1.4
bun migrate:ai-indexing
```

### **6. Benchmarking**
```bash
# Performance benchmarks
bun benchmark:indexing
```

---

## 📋 **Command Reference**

### **Index Building**
| Command | Description |
|---------|-------------|
| `bun index:ai-immunity` | Build index if missing |
| `bun index:ai-immunity --rebuild` | Force rebuild |
| `bun index:ai-immunity --grok-refresh` | Refresh embeddings only |

### **Semantic Search**
| Command | Description |
|---------|-------------|
| `bun semantic:hunt "query"` | Basic semantic search |
| `bun semantic:hunt "query" --threshold=0.7` | Custom threshold |
| `bun semantic:hunt:enhanced "query" --min-score=0.8` | Enhanced with filters |

### **Hybrid Queries**
| Command | Description |
|---------|-------------|
| `bun hybrid:query "query"` | Hybrid grep + semantic |
| `bun hybrid:query "query" --grep="pattern"` | Custom grep pattern |
| `bun hybrid:query "query" --refresh` | Refresh index first |

### **Validation**
| Command | Description |
|---------|-------------|
| `bun audit:index` | Basic validation |
| `bun audit:index:enhanced` | Enhanced validation with healing |

### **Utilities**
| Command | Description |
|---------|-------------|
| `bun migrate:ai-indexing` | Migrate v1.3.2 → v1.4 |
| `bun benchmark:indexing` | Performance benchmarks |
| `bun grep:ai-immunity` | Grep all AI-immunity tags |
| `bun grep:ai-hoisted` | Grep ai-hoisted tags only |

---

## 🎯 **Common Use Cases**

### **Find High-Confidence Prophecies**
```bash
bun semantic:hunt:enhanced "high confidence" --min-score=0.9 --threshold=0.7
```

### **Search by Linker**
```bash
bun semantic:hunt:enhanced "ai hoisted" --threshold=0.6
```

### **Find Deprecated Patterns**
```bash
bun semantic:hunt "deprecated legacy" --threshold=0.7
```

### **Exact + Fuzzy Search**
```bash
bun hybrid:query "immunity" --grep="AI-IMMUNITY" --threshold=0.6
```

### **Validate Before Commit**
```bash
bun audit:index:enhanced && echo "✅ Index healthy"
```

---

## 📊 **Performance Tips**

1. **Use caching**: Embeddings are cached automatically
2. **Lower threshold**: Use `--threshold=0.6` for more results
3. **Refresh when needed**: Use `--refresh` if index seems stale
4. **Filter results**: Use `--min-score` and `--limit` for precision

---

## 🔧 **Configuration**

Index paths and settings are configured in `bun.yaml`:

```yaml
ai-immunity:
  indexing:
    semantic:
      index:
        grep-path: '.ai-immunity.index'
        semantic-path: '.ai-immunity.semantic'
        enriched-path: '.ai-immunity.enriched.json'
      similarity:
        threshold: 0.85
    validate:
      drift-threshold: 0.95
      auto-heal: true
```

---

## 📁 **Index Files**

- **`.ai-immunity.index`** - Grepable file paths (ripgrep-compatible)
- **`.ai-immunity.semantic`** - JSON with 512-dim embeddings
- **`.ai-immunity.enriched.json`** - Full entries with metadata

---

## 🐛 **Troubleshooting**

### **No matches found**
- Lower threshold: `--threshold=0.6`
- Rebuild index: `bun index:ai-immunity --rebuild`

### **Index not found**
- Build index: `bun index:ai-immunity`
- Check file paths in `bun.yaml`

### **Validation fails**
- Auto-heal: `bun audit:index:enhanced`
- Manual rebuild: `bun index:ai-immunity --rebuild`

---

**Status**: ✅ **PRODUCTION-READY**  
**Last Updated**: November 09, 2025

