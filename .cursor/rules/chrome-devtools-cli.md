# Chrome DevTools MCP CLI

**Location:** `./tools/chrome-devtools-cli`

**Usage:** Progressive disclosure via help menu - discover tools as needed without context pollution.

```bash
# Discover available tools
./tools/chrome-devtools-cli --help

# Learn specific tool usage
./tools/chrome-devtools-cli <tool-name> --help

# Execute with progressive discovery
./tools/chrome-devtools-cli <tool-name> [args...]
```

**Principle:** Use `--help` to discover capabilities on-demand. No need to memorize all tools upfront.

