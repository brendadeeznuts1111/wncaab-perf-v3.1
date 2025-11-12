# WNCAAB Performance Visualization v3.1

> **High-performance Bun-native dev server** with type-safe APIs, comprehensive documentation, and zero-dependency architecture. Features grep-first metrics, schema validation, remote index distribution, and AI-powered immunity.

[![Bun](https://img.shields.io/badge/Bun-1.3.0+-00d4aa?style=flat-square&logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen?style=flat-square)](package.json)
[![Production Ready](https://img.shields.io/badge/Production-Ready-success?style=flat-square)](docs/PRODUCTION-RUNBOOK.md)
[![Security](https://img.shields.io/badge/Security-Hardened-blue?style=flat-square)](SECURITY.md)
[![Telegram](https://img.shields.io/badge/Telegram-Alerts-0088cc?style=flat-square&logo=telegram)](docs/TELEGRAM.md)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)](#-process-status)

## 🚀 Getting Started

**Grepable Tag:** `[#README:getting-started]`  
**Version:** `3.1.0`

### Prerequisites

- **Bun** >= 1.3.0 ([Install Bun](https://bun.sh/docs/installation))
- **Node.js** (optional, for compatibility)
- **Telegram Bot Token** (for alert system - get from [@BotFather](https://t.me/BotFather))

### Installation

```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/wncaab-perf-v3.1.git
cd wncaab-perf-v3.1

# Install dependencies (Bun only - zero dependencies!)
bun install

# Setup Telegram bot (interactive)
bun run setup:telegram

# Or setup securely with Bun.secrets (production)
bun run scripts/setup-telegram-secret.ts --token "your_token_here"
```

### Quick Start

```bash
# Development mode
bun dev                    # Start dev server with HMR (port 3002)

# Production mode
bun run start              # Start live odds monitoring (port 3001)
bun run start:unified      # Alias for start

# Activate Worker Telemetry Suite (optional but recommended)
./scripts/activate-telemetry.sh  # Start Worker Telemetry API (port 3000)

# Verify setup
bun run verify:production  # Check production readiness
bun run test:telegram      # Test Telegram alerts

# Check version
bun version                # Display version info
```

### Development Setup

**Grepable Tag:** `[#README:development-setup]`  
**Ticket:** TES-OPS-004.B.8.16

This project uses **Cursor worktrees** for isolated, concurrent development across multiple environments. Each worktree runs independent services on distinct ports to prevent conflicts.

#### Worktree Architecture

| Worktree | Branch | Dev Port | Worker Port | Tmux Session |
|----------|--------|----------|-------------|--------------|
| `tes-repo` | `main` | 3002 | 3003 | `tes-dev-tes-repo` |
| `tmux-sentinel` | `feature/tmux-sentinel` | 3004 | 3005 | `tes-dev-tmux-sentinel` |

#### Quick Setup

```bash
# Setup main worktree
cd ~/tes-repo
bun run scripts/setup-worktree.ts tes-repo

# Setup tmux-sentinel worktree
cd ~/tmux-sentinel
bun run ../tes-repo/scripts/setup-worktree.ts tmux-sentinel

# Validate configuration
bun run scripts/validate-worktrees.ts
```

#### Starting Worktrees

```bash
# Start main worktree
cd ~/tes-repo
bun run scripts/tmux-tes-dev.ts start
# Dashboard: http://localhost:3002

# Start tmux-sentinel worktree (concurrent)
cd ~/tmux-sentinel
bun run scripts/tmux-tes-dev.ts start
# Dashboard: http://localhost:3004
```

#### Features

- ✅ **Port Isolation**: Zero conflicts when running multiple worktrees
- ✅ **Log Isolation**: Each worktree writes to `.tes/logs/{worktree-name}/`
- ✅ **Tmux Sessions**: Worktree-specific session names (`tes-dev-{worktree-name}`)
- ✅ **Environment Variables**: Auto-created `.env.worktree` files per worktree
- ✅ **Setup Automation**: One command initializes everything

#### Validation

```bash
# Validate all worktrees
bun run scripts/validate-worktrees.ts

# Expected output:
# 🔍 Validating TES worktrees...
# 🌳 tes-repo:
#    ✅ Log dir: ~/tes-repo/.tes/logs/tes-repo
#    ✅ Port 3002 available
#    ✅ Worker API port 3003 (+1 offset)
# 🌳 tmux-sentinel:
#    ✅ Log dir: ~/tmux-sentinel/.tes/logs/tmux-sentinel
#    ✅ Port 3004 available
#    ✅ Worker API port 3005 (+1 offset)
# 🎉 All worktrees validated successfully!
```

> **📖 See [docs/worktrees.md](./docs/worktrees.md) for complete worktree documentation**  
> **📖 See [docs/ADR-007-worktree-strategy.md](./docs/ADR-007-worktree-strategy.md) for architecture details**

### Worker Telemetry API Activation

The Worker Telemetry API provides advanced worker monitoring, snapshot downloads, and real-time telemetry. It's **optional** but **highly recommended** for production environments.

**Quick Activation:**

```bash
# Automated activation (recommended - integrates with tmux)
./scripts/activate-telemetry.sh

# Manual activation
bun run scripts/worker-telemetry-api.ts

# Verify it's running
curl http://localhost:3000/api/workers/registry
```

**tmux Integration:**

The Worker Telemetry API is fully integrated with tmux session management (TES-NGWS-001.12c):

- ✅ Runs in the same tmux session as the dev server (`sentinel-${workspace}`)
- ✅ Uses dedicated window: `📡 telemetry` (window 2)
- ✅ Automatic session/window creation if needed
- ✅ Process detection and cleanup of non-tmux processes

**tmux Management Commands:**

```bash
# Attach to telemetry window
./scripts/tmux-telemetry.sh attach

# Check status
./scripts/tmux-telemetry.sh status

# View logs
./scripts/tmux-telemetry.sh logs

# Stop the API
./scripts/tmux-telemetry.sh stop

# Manual tmux commands
tmux attach-session -t sentinel-APPENDIX        # Attach to session
tmux select-window -t sentinel-APPENDIX:2       # Switch to telemetry window
tmux capture-pane -t sentinel-APPENDIX:2 -p     # View window output
```

**Features Enabled:**
- ✅ Worker snapshot downloads (`/api/workers/snapshot/:id`)
- ✅ Real-time telemetry WebSocket (`/ws/workers/telemetry`)
- ✅ Worker registry API (`/api/workers/registry`)
- ✅ Worker scaling API (`/api/workers/scale`)

**Dashboard Integration:**
- Worker Registry modal shows timing information (start time, end time, time online, time on wall)
- One-click snapshot downloads for each worker
- Graceful error handling with helpful resolution messages

**Note:** The dev server works perfectly without the Worker Telemetry API. Worker features are automatically disabled if the API is not running, with clear error messages guiding you to activate it.

### First-Time Setup

```bash
# 1. Setup production environment
bun run setup:production

# 2. Configure Telegram bot
bun run setup:telegram

# 3. Verify configuration
bun run verify:production

# 4. Start the system
bun run start

# 5. Check health
curl http://localhost:3001/health
```

### Process Management

```bash
# Start sentinel process
bun run start:sentinel

# Restart gracefully
bun run restart:sentinel

# Stop process
bun run stop

# Check port status
bun run check:port

# Verify restart
bun run verify:restart
```

> **📖 See [COMMANDS.md](./COMMANDS.md) for complete command reference**  
> **📖 See [PORT.md](./PORT.md) for port management**  
> **📖 See [docs/TELEGRAM.md](./docs/TELEGRAM.md) for Telegram setup**  
> **📖 See [docs/PRODUCTION-RUNBOOK.md](./docs/PRODUCTION-RUNBOOK.md) for production deployment**

## 🚀 Unified Developer Portal & API

**Grepable Tag:** `[#README:dev-portal]`  
**Port:** `3002`  
**Dashboard:** http://localhost:3002

The unified developer portal provides a centralized dashboard and API for monitoring, debugging, and managing all system components.

### Quick Access

```bash
# Start the dev portal
bun dev                    # Start dev server (port 3002)

# Or explicitly
bun run dev:server         # Start dev server

# Open dashboard in browser
open http://localhost:3002
```

### HTML Dashboard

The unified dashboard provides:
- **Real-time monitoring** - Auto-refreshing status indicators
- **Color-coded health** - Visual status indicators (green/yellow/red)
- **Direct API links** - Clickable endpoints for testing
- **Worker telemetry** - Live worker status and metrics
- **System overview** - Complete system health at a glance

**Access:** http://localhost:3002

### API Endpoints

#### **Dev API** (Port 3002)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | HTML dashboard |
| `/api/dev/endpoints` | GET | List all API endpoints |
| `/api/dev/endpoints/check` | GET | Check all endpoints with header metadata |
| `/api/dev/configs` | GET | Show all configs (bunfig.toml, bun-ai.toml) |
| `/api/dev/colors` | GET | Get color palette and usage stats |
| `/api/dev/workers` | GET | Worker telemetry |
| `/api/dev/status` | GET | Complete system status |
| `/api/dev/metrics` | GET | Server metrics (pendingRequests, pendingWebSockets) |
| `/api/dev/event-loop` | GET | Event loop monitoring metrics |

#### **Worker API** (Port 3000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workers/registry` | GET | Live worker state |
| `/api/workers/scale` | POST | Manual worker scaling |
| `/api/workers/snapshot/:id` | GET | Download heap snapshot |
| `/ws/workers/telemetry` | WS | Live telemetry stream |

#### **Spline API** (Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/spline/render` | GET | Render spline path |
| `/api/spline/predict` | POST | Predict next points |
| `/api/spline/preset/store` | POST | Store preset |
| `/ws/spline-live` | WS | Live spline streaming |

#### **TES Lifecycle API** (Port 3002)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/lifecycle/health` | GET | TES lifecycle health check |
| `/api/lifecycle/export` | GET | Export lifecycle visualization data |
| `/tes-dashboard.html` | GET | TES lifecycle dashboard (hex-ring visualization) |

#### **Bookmaker Registry API** (Port 3002)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bookmakers` | GET | Get all bookmakers |
| `/api/bookmakers/:id` | GET | Get bookmaker by ID |
| `/api/bookmakers` | POST | Create new bookmaker |
| `/api/bookmakers/:id/flags/:flag` | PATCH | Update bookmaker feature flag |
| `/api/bookmakers/:id/rollout` | PATCH | Update bookmaker rollout |
| `/api/registry/bookmakers` | GET | List all bookmakers with R2 URLs |
| `/api/registry/profile/:bookieId` | GET | Get bookmaker profile |
| `/registry` | GET | Bookmaker registry dashboard (HTML) |
| `/tiers` | GET | Tier distribution dashboard (HTML) |

### Usage Examples

```bash
# View system status
curl http://localhost:3002/api/dev/status | jq

# Check all endpoints
curl http://localhost:3002/api/dev/endpoints | jq

# View worker telemetry
curl http://localhost:3002/api/dev/workers | jq

# Monitor event loop
curl http://localhost:3002/api/dev/event-loop | jq

# Get server metrics
curl http://localhost:3002/api/dev/metrics | jq

# View configs
curl http://localhost:3002/api/dev/configs | jq
```

### Features

- **Unified Dashboard** - Single interface for all services
- **Real-time Monitoring** - Live updates and status indicators
- **API Discovery** - Auto-discovered endpoints with documentation
- **Config Management** - View and validate all configurations
- **Worker Telemetry** - Monitor worker pool health and performance
- **Event Loop Monitoring** - Track event loop health and performance
- **Lifecycle Visualization** - TES lifecycle hex-ring dashboard

> **📖 See [docs/guides/DEV-SERVER.md](./docs/guides/DEV-SERVER.md) for detailed documentation**  
> **📖 See [docs/DEVELOPER-PORTAL-QUICK-REFERENCE.md](./docs/DEVELOPER-PORTAL-QUICK-REFERENCE.md) for quick reference**

---

## ✨ Features

### 🎯 Performance Optimizations
- **Bun Native APIs**: Optimized use of Bun's native utilities
  - `Bun.escapeHTML()` - High-performance HTML escaping (480 MB/s - 20 GB/s on M1X)
  - `Bun.stringWidth()` - Unicode/emoji-aware string width (~6,756x faster than string-width)
  - `Bun.SharedMap` - Zero-copy inter-process communication
  - `Bun.serve()` - High-performance HTTP server (~2.5x faster than Node.js)
  - `Bun.file()` - Optimized file I/O with automatic Range support

### 🔒 Security & Hardening
- **Security Headers**: Comprehensive HTTP security headers on all HTML routes
  - Content-Security-Policy (CSP) - XSS protection
  - X-Frame-Options - Clickjacking prevention
  - X-Content-Type-Options - MIME sniffing prevention
  - Referrer-Policy - Referrer control
  - Permissions-Policy - Browser feature restrictions
  - HSTS - HTTPS enforcement (production)
- **Rate Limiting**: Per-IP rate limiting for dashboard endpoints
  - Dashboard: 60 requests/minute (configurable)
  - API: 1000 requests/minute (configurable)
  - Sliding window algorithm with automatic cleanup
- **Input Sanitization**: All user-controlled content escaped using `Bun.escapeHTML()`
- **Secure Error Pages**: Production-safe error handling with security headers
- **Bun.secrets Integration**: OS-native credential storage for sensitive data
- **CSRF Protection**: Cross-site request forgery protection for API endpoints

### 🔒 Type Safety
- **Full TypeScript Support**: Zero `any` types, proper interfaces throughout
- **Type-Safe Routing**: Bun's native type-safe route parameters
- **Generic Utilities**: Type-safe caching, validation, and API responses

### 📚 Documentation

**Deployment & Operations:**
- **[Pre-Deployment Checklist](./docs/DEPLOY-CHECKLIST.md)** - Quick reference for safe deployments
- **[TES-NGWS-001.5 Retrospective](./docs/TES-NGWS-001.5-RETROSPECTIVE.md)** - Lessons learned and improvements
- **[Full Deployment Guide](./docs/TES-DEPLOY-001-FULL-INTERACTIVE-SETUP.md)** - Comprehensive deployment documentation
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
- **[Production Runbook](./docs/PRODUCTION-RUNBOOK.md)** - Production deployment guide for live odds pipeline
- **[Security](./SECURITY.md)** - Security documentation and best practices
- **[Dashboard Security](./docs/DASHBOARD-SECURITY-HARDENING.md)** - Dashboard security hardening guide
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
  - **Security Hardening**: All HTML routes protected with security headers and rate limiting
  - **Dashboard**: Unified API, config, and worker telemetry dashboard
  - **TES Dashboard**: Lifecycle visualization with hex-ring architecture
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

## 📊 Process Status

**Grepable Tag:** `[#README:process-status]`

### Current Process Information

```bash
# Check if process is running
bun run check:port

# View process details
lsof -ti:3001 && ps -p $(lsof -ti:3001) -o pid,comm,etime,command

# Check health endpoint
curl http://localhost:3001/health | jq
```

### Process Management

| Command | Description |
|---------|-------------|
| `bun run start` | Start live odds monitoring |
| `bun run start:sentinel` | Start as background sentinel |
| `bun run restart:sentinel` | Graceful restart |
| `bun run stop` | Stop process on port 3001 |
| `bun run check:port` | Check port availability |
| `bun run verify:restart` | Verify restart success |

### Health Monitoring

- **Health Endpoint**: `http://localhost:3001/health`
- **Metrics Endpoint**: `http://localhost:3001/metrics`
- **Diagnostics**: `http://localhost:3001/diagnostics`

See [STATUS.md](./STATUS.md) for detailed system status information.

---

## 🤝 Contributing

**Grepable Tag:** `[#README:contributing]`

We welcome contributions! This project follows best practices for security, performance, and maintainability.

### How to Contribute

1. **Fork the Repository**
   ```bash
   git clone https://github.com/brendadeeznuts1111/wncaab-perf-v3.1.git
   cd wncaab-perf-v3.1
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow TypeScript best practices
   - Use Bun-native APIs when possible
   - Add grepable tags for documentation
   - Update relevant documentation

4. **Test Your Changes**
   ```bash
   # Run validations
   bun run validate:all
   
   # Test Telegram integration (if applicable)
   bun run test:telegram
   
   # Verify production readiness
   bun run verify:production
   ```

5. **Commit Your Changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```
   
   **Commit Message Format:**
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `perf:` - Performance improvements
   - `refactor:` - Code refactoring
   - `test:` - Test additions/changes
   - `chore:` - Maintenance tasks

6. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Contribution Guidelines

- **Code Style**: TypeScript with strict type checking
- **Documentation**: Add grepable tags `[#TAG:category]` for searchability
- **Security**: Never hardcode tokens or secrets
- **Performance**: Prefer Bun-native APIs over Node.js alternatives
- **Testing**: Test all changes before submitting PR

### Security Considerations

- ⚠️ **Never commit** `.env` files or secrets
- ✅ Use `Bun.secrets` for production token storage
- ✅ Follow [SECURITY.md](./SECURITY.md) guidelines
- ✅ Report security issues privately

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the project's coding standards

### Questions?

- **Issues**: [GitHub Issues](https://github.com/brendadeeznuts1111/wncaab-perf-v3.1/issues)
- **Discussions**: [GitHub Discussions](https://github.com/brendadeeznuts1111/wncaab-perf-v3.1/discussions)
- **Documentation**: [docs/README.md](./docs/README.md)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: [GitHub](https://github.com/brendadeeznuts1111/wncaab-perf-v3.1)
- **Issues**: [GitHub Issues](https://github.com/brendadeeznuts1111/wncaab-perf-v3.1/issues)
- **Documentation**: [docs/README.md](./docs/README.md)

---

**Built with ❤️ using [Bun](https://bun.sh)**
