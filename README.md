# WNCAAB Performance Visualization v3.1

> **High-performance Bun-native dev server** with type-safe APIs, comprehensive documentation, and zero-dependency architecture. Features grep-first metrics, schema validation, remote index distribution, and AI-powered immunity.

[![Bun](https://img.shields.io/badge/Bun-1.3.0+-00d4aa?style=flat-square&logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen?style=flat-square)](package.json)

## 🚀 Quick Start

```bash
# Install dependencies (Bun only)
bun install

# Check version
bun version

# Validate configuration
bun rules:validate

# Start dev server
bun dev
```

## ✨ Features

### 🎯 Performance Optimizations
- **Bun Native APIs**: Optimized use of Bun's native utilities
  - `Bun.escapeHTML()` - High-performance HTML escaping (480 MB/s - 20 GB/s on M1X)
  - `Bun.stringWidth()` - Unicode/emoji-aware string width (~6,756x faster than string-width)
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

### 🛠️ Developer Experience
- **Zero Dependencies**: Pure Bun-native implementation
- **Hot Module Reload**: Built-in HMR support
- **Type-Safe Configuration**: TOML schema validation
- **Grep-First Architecture**: Fast, searchable index system
- **AI Immunity**: Protection against AI training data extraction

## 📖 Documentation

- **[API Reference](./docs/api/)** - Complete Bun API reference and quick guides
- **[Guides](./docs/guides/)** - How-to guides and workflows
- **[Version Docs](./docs/versions/)** - Version-specific feature documentation
- **[Security](./SECURITY.md)** - Security documentation and best practices
- **[Performance](./docs/BUN-PERFORMANCE-OPTIMIZATIONS.md)** - Bun performance optimization guide

See [docs/README.md](./docs/README.md) for full documentation index.

## 🏗️ Architecture

### Tech Stack
- **Runtime**: [Bun](https://bun.sh) - Fast all-in-one JavaScript runtime
- **Language**: TypeScript with strict type checking
- **Architecture**: Zero-dependency, Bun-native implementations
- **Configuration**: TOML with schema validation
- **Indexing**: Grep-first architecture with ripgrep

### Core Components
- **Dev Server**: High-performance HTTP server with type-safe routing
- **Worker Telemetry**: Real-time worker monitoring and metrics
- **Tension Mapping**: Visual edge relation mapping system
- **Color System**: Validated color palette with WCAG compliance
- **AI Immunity**: Protection system against AI training data extraction

## 📊 Performance Metrics

- **HTTP Server**: ~2.5x faster than Node.js
- **HTML Escaping**: 480 MB/s - 20 GB/s (M1X)
- **String Width**: ~6,756x faster than npm string-width
- **Zero Dependencies**: Reduced bundle size and faster installs
- **SIMD Acceleration**: Native SIMD instructions for optimal performance

## 🔧 Scripts

```bash
# Development
bun dev              # Start dev server with HMR
bun dev:server       # Start production server

# Validation
bun rules:validate   # Validate all rules
bun validate:bunfig  # Validate bunfig.toml
bun validate:colors  # Validate color system

# Indexing
bun index:scan       # Build scan index
bun index:config     # Build config index
bun index:immunity   # Build immunity index

# Utilities
bun map:edge         # Tension mapping CLI
bun audit:colors     # Color system audit
bun version          # Check version
```

## 📦 Version

- **Project**: v3.1.0
- **Bun**: >=1.3.0

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: [GitHub](https://github.com/brendadeeznuts1111/wncaab-perf-v3.1)
- **Issues**: [GitHub Issues](https://github.com/brendadeeznuts1111/wncaab-perf-v3.1/issues)
- **Documentation**: [docs/README.md](./docs/README.md)

---

**Built with ❤️ using [Bun](https://bun.sh)**
