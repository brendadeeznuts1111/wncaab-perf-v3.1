# Bun PR Testing Integration

**Date**: November 09, 2025  
**Status**: ✅ **IMPLEMENTED**  
**Version**: v1.4.0

Integration with `bunx bun-pr` for testing Bun pull requests and branches.

---

## 🚀 Usage

### **How It Works**

`bunx bun-pr` downloads the release build from the pull request and adds it to `$PATH` as `bun-${pr-number}`. You can then run the build with `bun-${pr-number}`.

### **Basic Commands (Direct bunx bun-pr)**

```bash
# Test PR by number
bunx bun-pr <pr-number>

# Test PR by branch name
bunx bun-pr <branch-name>

# Test PR by URL
bunx bun-pr "https://github.com/oven-sh/bun/pull/1234566"

# Test with AddressSanitizer (Linux x64 only)
# Note: --asan flag comes BEFORE the PR number
bunx bun-pr --asan <pr-number>

# After installation, use the binary
bun-1234566 --version
```

### **Example Workflow**

```bash
# 1. Install PR build
bunx bun-pr 1234566

# 2. PR build is now available as bun-1234566
bun-1234566 --version

# 3. Use the PR build for testing
bun-1234566 run index:scan
bun-1234566 test
```

### **Using Our Wrapper Script**

```bash
# Using our wrapper script
bun bun:pr <pr-number>
bun bun:pr <branch-name>
bun bun:pr "https://github.com/oven-sh/bun/pull/1234566"

# With AddressSanitizer
bun bun:pr-asan <pr-number>

# With version check
bun bun:pr-version <pr-number>
```

---

## 📋 Implementation

### **Wrapper Script**

**File**: `scripts/bun-pr-test.ts`

- ✅ Integrates with `bunx bun-pr`
- ✅ Supports PR number, branch name, or URL
- ✅ AddressSanitizer flag support
- ✅ Version checking after install
- ✅ Error handling and reporting

### **Package.json Scripts**

```json
{
  "scripts": {
    "bun:pr": "bun run scripts/bun-pr-test.ts",
    "bun:pr-asan": "bun run scripts/bun-pr-test.ts --asan",
    "bun:pr-version": "bun run scripts/bun-pr-test.ts --version"
  }
}
```

---

## 🎯 Use Cases

### **1. Test Bun PR Before Merging**

```bash
# Test a specific PR
bun bun:pr 1234566

# Verify it works
bun-1234566 --version
```

### **2. Test with AddressSanitizer (Linux x64)**

```bash
# Test PR with ASAN for memory safety
bun bun:pr-asan 1234566
```

### **3. Test Branch Before PR**

```bash
# Test a branch directly
bun bun:pr feature-branch-name
```

### **4. Test from GitHub URL**

```bash
# Test directly from GitHub PR URL
bun bun:pr "https://github.com/oven-sh/bun/pull/1234566"
```

---

## ⚠️ **Platform Limitations**

- **AddressSanitizer (`--asan`)**: Linux x64 only
- **Binary naming**: Installed as `bun-<pr-number>` for PR numbers
- **Version check**: May fail if binary name doesn't match expected pattern

---

## ✅ **Status**

**Implemented**:
- ✅ Bun PR test wrapper script
- ✅ Package.json scripts
- ✅ Error handling
- ✅ Version checking
- ✅ Documentation

**Ready for**:
- ✅ Testing Bun PRs before merging
- ✅ CI/CD integration
- ✅ Development workflow

---

**Status**: ✅ **IMPLEMENTED & READY**

The forge is hot. Bun PR testing is integrated. Ready for use! 🚀✨💎

