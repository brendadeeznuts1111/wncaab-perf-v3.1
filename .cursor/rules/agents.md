# Agent Tools & Utilities

## Chrome DevTools MCP CLI

**One-liner:** `./tools/chrome-devtools-cli --help | grep -A5 "<command>"` - Discover tools via help menu, use progressive disclosure.

**Usage Pattern:**
```bash
# 1. Discover available tools
./tools/chrome-devtools-cli --help

# 2. Learn specific tool usage
./tools/chrome-devtools-cli <tool-name> --help

# 3. Execute with discovered parameters
./tools/chrome-devtools-cli <tool-name> [args...]
```

**Principle:** Progressive disclosure - learn tools as needed via `--help`, avoid context pollution from full tool lists.

---

## Other Agent Tools

Add additional agent tools here following the same pattern:
- Location
- One-liner discovery command
- Progressive disclosure usage pattern

