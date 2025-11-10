# Index & PR System - Quick Reference

## 🚀 **Quick Commands**

### **Index System**

```bash
# Build scan index
bun index:scan

# Build config indexes
bun index:config
bun index:remote
bun index:immunity
bun index:ai-immunity

# Grep indexes
bun grep:config
bun grep:remote
bun grep:immunity
bun grep:ai-immunity
```

### **PR Automation**

```bash
# Create PR branch with validation
bun rules:pr FEATURE-NAME

# Create AI PR branch
bun ai:pr FEATURE-NAME

# Test Bun PR
bun bun:pr <PR-NUMBER>
bun bun:pr --asan <PR-NUMBER>  # Linux x64 only
```

### **Validation**

```bash
# Validate bunfig.toml
bun validate:bunfig

# Validate remote config
bun validate:remote

# Full rules validation
bun rules:validate

# Check versions
bun version
```

---

## 🔧 **System Components**

### **Index Generator**
- **Script**: `scripts/index-generator.ts`
- **Output**: `.scan.index`, `.scan.index.zst`
- **Usage**: `bun index:scan`

### **PR Automation**
- **Rules PR**: `scripts/rules-pr.js` → `bun rules:pr`
- **AI PR**: `scripts/ai-pr.js` → `bun ai:pr`
- **Bun PR**: `scripts/bun-pr-test.ts` → `bun bun:pr`

### **Validation**
- **Bunfig**: `scripts/validate-bunfig.js` → `bun validate:bunfig`
- **Remote**: `scripts/validate-remote.js` → `bun validate:remote`
- **AI Immunity**: `scripts/validate-ai-immunity.js` → `bun audit:ai-immunity`

### **Templates**
- **Index Gen**: `templates/index-gen.js`
- **Config Gen**: `templates/config-gen.js`
- **AI Immunity Gen**: `templates/ai-immunity-gen.js`

### **Git Hooks**
- **Pre-commit**: `.git/hooks/pre-commit` (auto-validates bunfig.toml)

### **CI/CD**
- **Workflow**: `.github/workflows/scan.yml` (ultra-secure scanning)

---

## 📊 **Index Files**

| Index | Purpose | Command |
|-------|---------|---------|
| `.scan.index` | File scan results | `bun index:scan` |
| `.config.index` | Config sections | `bun index:config` |
| `.remote.index` | Remote configs | `bun index:remote` |
| `.immunity.index` | Immunity tags | `bun index:immunity` |
| `.ai-immunity.index` | AI immunity tags | `bun index:ai-immunity` |

---

## ✅ **Workflow Example**

```bash
# 1. Create feature branch
bun rules:pr NEW-FEATURE

# 2. Make changes
# ... edit files ...

# 3. Validate before commit (auto-runs via git hook)
git add .
git commit -m "feat: new feature"
# → Pre-commit hook validates bunfig.toml automatically

# 4. Push and create PR
git push -u origin feat/new-feature
```

---

**Status**: ✅ **System Ready**

