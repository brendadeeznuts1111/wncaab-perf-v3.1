# WNCAAB Performance Visualization v3.1

Grep-first metrics with schema validation, remote index distribution, and AI-powered immunity.

## Quick Start

```bash
bun install
bun version
bun rules:validate
```

## Version

- **Project**: v3.1.0
- **Bun**: >=1.3.0

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## Features

### 🚀 Performance Optimizations
- **Bun Native APIs**: Optimized use of Bun's native utilities
  - `Bun.escapeHTML()` - High-performance HTML escaping (480 MB/s - 20 GB/s)
  - `Bun.stringWidth()` - Unicode/emoji-aware string width calculation (~6,756x faster than string-width)
  - `Bun.SharedMap` - Zero-copy inter-process communication
  - `Bun.serve()` - High-performance HTTP server (~2.5x faster than Node.js)
  - `Bun.file()` - Optimized file I/O with automatic Range support

### 🔒 Type Safety
- **Full TypeScript Support**: Zero `any` types, proper interfaces throughout
- **Type-Safe Routing**: Bun's native type-safe route parameters
- **Generic Utilities**: Type-safe caching, validation, and API responses

### 📚 Documentation
- **Comprehensive API References**: All Bun native APIs documented with `[#REF]` tags
- **Performance Guides**: Detailed optimization strategies and benchmarks
- **Code Examples**: Real-world usage patterns and best practices

## Documentation

- **[API Reference](./docs/api/)** - Complete Bun API reference and quick guides
- **[Guides](./docs/guides/)** - How-to guides and workflows
- **[Version Docs](./docs/versions/)** - Version-specific feature documentation
- **[Security](./SECURITY.md)** - Security documentation and best practices
- **[Performance](./docs/BUN-PERFORMANCE-OPTIMIZATIONS.md)** - Bun performance optimization guide

See [docs/README.md](./docs/README.md) for full documentation index.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) - Fast all-in-one JavaScript runtime
- **Language**: TypeScript with strict type checking
- **Architecture**: Zero-dependency, Bun-native implementations
