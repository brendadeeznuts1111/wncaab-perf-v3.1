# Atomic PR Workflow - Unified Branch + PR + Atomic Operations

**Date**: November 09, 2025  
**Status**: ✅ **IMPLEMENTED**  
**Version**: v1.5.0

Unified workflow combining branch creation, PR testing, and atomic operations.

---

## 🚀 **Usage**

### **Basic Command**

```bash
bunx atomic-pr <branch-name> <pr-number|branch-name|url> [options]
```

### **Options**

- `--asan` - Use AddressSanitizer (Linux x64 only)
- `--atomic-config` - Generate atomic config (future)
- `--atomic-commit` - Create atomic commit

---

## 📋 **Workflow Steps**

1. **Branch Management** - Create/checkout branch
2. **PR Testing** - Test PR via `bunx bun-pr`
3. **Atomic Config** - Generate atomic config (optional)
4. **Rule Validation** - Validate all rules
5. **Atomic Commit** - Create atomic commit (optional)

---

## 🎯 **Examples**

### **Basic Workflow**

```bash
# Create branch and test PR
bunx atomic-pr feat/new-feature 1234566
```

### **With ASAN**

```bash
# Test PR with AddressSanitizer
bunx atomic-pr feat/new-feature 1234566 --asan
```

### **With Atomic Commit**

```bash
# Create branch, test PR, and atomic commit
bunx atomic-pr feat/new-feature 1234566 --atomic-commit
```

### **Full Atomic Workflow**

```bash
# Complete atomic workflow
bunx atomic-pr feat/new-feature 1234566 --asan --atomic-config --atomic-commit
```

---

## 🔧 **Implementation**

**File**: `scripts/atomic-pr.js`

- ✅ Branch creation/checkout
- ✅ PR testing via `bunx bun-pr`
- ✅ Rule validation
- ✅ Atomic commit support
- ✅ Error handling

---

## 📊 **Workflow Diagram**

```
┌─────────────────────────────────────────┐
│ bunx atomic-pr <branch> <pr>            │
└──────────────┬──────────────────────────┘
               │
    ┌──────────▼──────────┐
    │ 1. Branch Management│
    │    Create/checkout  │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ 2. PR Testing       │
    │    bunx bun-pr      │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ 3. Atomic Config    │
    │    (optional)       │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ 4. Rule Validation  │
    │    validateAllRules │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ 5. Atomic Commit    │
    │    (optional)       │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │ ✅ Ready for PR     │
    └──────────────────────┘
```

---

## ✅ **Status**

**Implemented**:
- ✅ Branch creation/checkout
- ✅ PR testing integration (non-fatal errors)
- ✅ Rule validation
- ✅ Atomic commit support
- ✅ Error handling (PR failures are non-fatal)

**Future**:
- ⏳ Atomic config generation
- ⏳ Atomic file operations
- ⏳ Rollback support

**Notes**:
- PR testing failures are non-fatal - workflow continues with warnings
- Validation errors are still fatal (ensures code quality)
- Use real PR numbers for actual PR testing

---

**Status**: ✅ **READY FOR USE**

The forge is hot. Atomic PR workflow is operational! 🚀✨💎

