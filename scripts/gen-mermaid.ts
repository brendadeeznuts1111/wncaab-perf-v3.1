/**
 * Mermaid Generator - TES-NGWS-001.9c
 * 
 * Auto-generates Mermaid diagrams from lifecycle state data.
 * Parses lifecycle states and generates state diagrams and hex ring visualizations.
 * 
 * @module scripts/gen-mermaid
 */

import { getLifecycleManager } from "../src/lib/worker-lifecycle-integration.ts";
import { LifecyclePhase } from "../src/lib/tes-lifecycle-manager.ts";

/**
 * Generate state diagram Mermaid code
 */
function generateStateDiagram(): string {
  return `stateDiagram-v2
    [*] --> INIT: WS Upgrade
    INIT --> AUTH: JWT Extract
    AUTH --> ACTIVE: Heartbeat OK
    ACTIVE --> RENEW: 80% TTL
    RENEW --> ACTIVE: New JWT
    ACTIVE --> EVICT: Close/Timeout
    EVICT --> [*]
    
    note right of RENEW: Tension >0.7 triggers
    note left of ACTIVE: Hex-ring viz pulses`;
}

/**
 * Generate hex ring diagram Mermaid code
 */
function generateHexRingDiagram(): string {
  return `graph TB
    %% === CANVAS STYLING ===
    classDef ring0 fill:#1a1a2e,stroke:#2d2d4d,stroke-width:4px,color:#e0e0ff
    classDef ring1 fill:#252545,stroke:#3d3d6d,stroke-width:3px,color:#c0c0ff
    classDef ring2 fill:#303060,stroke:#4d4d8d,stroke-width:2px,color:#a0a0ff
    classDef ring3 fill:#3a3a7a,stroke:#5d5dad,stroke-width:1px,color:#8080ff

    %% === CORE HEX RINGS ===
    subgraph "RING 0: CORE HEXAGON NEXUS"
        CORE[TES Core<br/>v1.3.0]
        class CORE ring0
    end

    subgraph "RING 1: SECURITY HEXAGON LAYER"
        SEC_AUDIT[Security Audit<br/>Real-time Monitoring]
        CRYPTO_NEXUS[Crypto Nexus<br/>AES-256/GCM]
        PROTOCOL_CITADEL[Protocol Citadel<br/>JWT/WS-Sec]
        class SEC_AUDIT,CRYPTO_NEXUS,PROTOCOL_CITADEL ring1
    end

    subgraph "RING 2: PROCESSING HEXAGON LAYER"
        WORKER_MGR[Worker Manager<br/>Pool:8 Threads]
        TICK_ANALYZER[Tick Analyzer<br/>ML Inference]
        DATA_INGEST[Data Ingest<br/>NowGoal WS]
        SETTLEMENT_ENGINE[Settlement Engine<br/>Atomic Tx]
        class WORKER_MGR,TICK_ANALYZER,DATA_INGEST,SETTLEMENT_ENGINE ring2
    end

    subgraph "RING 3: EXTERNAL HEXAGON LAYER"
        REDIS_CLUSTER[Redis Cluster<br/>Pub/Sub Cache]
        METRICS_DASH[Metrics Dashboard<br/>Real-time]
        ALERT_SYSTEM[Alert System<br/>SLO Monitoring]
        EXTERNAL_APIS[External APIs<br/>REST/WebSocket]
        class REDIS_CLUSTER,METRICS_DASH,ALERT_SYSTEM,EXTERNAL_APIS ring3
    end

    %% === TENSION FLOWS ===
    CORE -.->|Quantum Encryption<br/>Tension: HIGH|SEC_AUDIT
    CORE -.->|Zero Trust<br/>Tension: MEDIUM|CRYPTO_NEXUS
    CORE -.->|Protocol Handshake<br/>Tension: LOW|PROTOCOL_CITADEL

    SEC_AUDIT -.->|Security Audit<br/>Tension: CRITICAL|WORKER_MGR
    CRYPTO_NEXUS -.->|Key Rotation<br/>Tension: HIGH|TICK_ANALYZER
    PROTOCOL_CITADEL -.->|WS Subprotocol<br/>Tension: MEDIUM|DATA_INGEST

    WORKER_MGR -.->|Hash Offload<br/>Tension: OPTIMAL|TICK_ANALYZER
    TICK_ANALYZER -.->|Settlement Data<br/>Tension: LOW|SETTLEMENT_ENGINE
    DATA_INGEST -.->|Tick Stream<br/>Tension: VARIABLE|TICK_ANALYZER

    SETTLEMENT_ENGINE -.->|Tx Broadcast<br/>Tension: HIGH|REDIS_CLUSTER
    WORKER_MGR -.->|Performance Metrics<br/>Tension: MONITORED|METRICS_DASH
    SEC_AUDIT -.->|Security Events<br/>Tension: ALERTING|ALERT_SYSTEM`;
}

/**
 * Generate dynamic state diagram from current lifecycle data
 */
function generateDynamicStateDiagram(vizData: Array<{ sessionID: string; phase: LifecyclePhase; tension: number }>): string {
  // Count phases
  const phaseCounts: Record<LifecyclePhase, number> = {
    [LifecyclePhase.INIT]: 0,
    [LifecyclePhase.AUTH]: 0,
    [LifecyclePhase.ACTIVE]: 0,
    [LifecyclePhase.RENEW]: 0,
    [LifecyclePhase.EVICT]: 0,
  };

  vizData.forEach((d) => {
    phaseCounts[d.phase]++;
  });

  // Build diagram with counts
  let diagram = `stateDiagram-v2
    [*] --> INIT: WS Upgrade (${phaseCounts[LifecyclePhase.INIT]} active)
    INIT --> AUTH: JWT Extract
    AUTH --> ACTIVE: Heartbeat OK (${phaseCounts[LifecyclePhase.ACTIVE]} active)
    ACTIVE --> RENEW: 80% TTL (${phaseCounts[LifecyclePhase.RENEW]} active)
    RENEW --> ACTIVE: New JWT
    ACTIVE --> EVICT: Close/Timeout (${phaseCounts[LifecyclePhase.EVICT]} active)
    EVICT --> [*]`;

  // Add tension annotations
  const avgTension = vizData.length > 0
    ? vizData.reduce((sum, d) => sum + d.tension, 0) / vizData.length
    : 0;

  if (avgTension > 0.7) {
    diagram += `\n    note right of ACTIVE: ⚠️ High average tension: ${avgTension.toFixed(3)}`;
  }

  return diagram;
}

/**
 * Update TES-LIFECYCLE-ARCHITECTURE.md with current state
 */
async function updateArchitectureDoc(): Promise<void> {
  const manager = getLifecycleManager();
  const vizData = manager ? manager.exportVizData() : [];

  const stateDiagram = generateStateDiagram();
  const hexRingDiagram = generateHexRingDiagram();
  const dynamicDiagram = generateDynamicStateDiagram(vizData);

  const docContent = `# TES Lifecycle Architecture

**Status**: ✅ **IMPLEMENTED**  
**Version**: TES-NGWS-001.9  
**Date**: ${new Date().toISOString().split('T')[0]}

---

## Overview

TES (Transcendent Edge Sentinel) Lifecycle Architecture provides zero-npm, enterprise-grade state orchestration for WebSocket session management. The system tracks session phases, calculates tension scores, and provides real-time visualization through hex-ring dashboards.

---

## Current State

**Active Sessions**: ${vizData.length}  
**Last Updated**: ${new Date().toISOString()}

---

## Lifecycle Phases

The TES lifecycle consists of five distinct phases:

1. **INIT** - WebSocket upgrade pending
2. **AUTH** - JWT validated
3. **ACTIVE** - Streaming + heartbeats
4. **RENEW** - Subprotocol rotation
5. **EVICT** - Graceful close

---

## State Diagram

\`\`\`mermaid
${stateDiagram}
\`\`\`

---

## Dynamic State Diagram (Current)

\`\`\`mermaid
${dynamicDiagram}
\`\`\`

---

## Hex Ring Architecture

\`\`\`mermaid
${hexRingDiagram}
\`\`\`

---

## Tension Levels

Tension scores range from 0.0 (optimal) to 1.0 (critical). The system uses color-coded indicators:

| Level | Score Range | Color | Description |
|-------|-------------|-------|-------------|
| **OPTIMAL** | 0.0 - 0.3 | \`#2d5aa0\` (Calm Blue) | System operating normally |
| **LOW** | 0.3 - 0.5 | \`#3d7a47\` (Stable Green) | Minor stress, stable |
| **MEDIUM** | 0.5 - 0.7 | \`#8a5a2d\` (Warning Amber) | Elevated stress, monitor |
| **HIGH** | 0.7 - 0.9 | \`#a05a2d\` (High Orange) | Significant stress, alert |
| **CRITICAL** | 0.9 - 1.0 | \`#a02d2d\` (Critical Red) | System overload, evict imminent |

---

## API Endpoints

### GET \`/api/lifecycle/export\`

Export lifecycle visualization data.

**Response**:
\`\`\`json
{
  "data": [
    {
      "sessionID": "uuid-here",
      "phase": "ACTIVE",
      "tension": 0.45
    }
  ],
  "count": 1,
  "timestamp": ${Date.now()}
}
\`\`\`

---

[DOMAIN:nowgoal26.com][SCOPE:LIFECYCLE][META:TES-NGWS-001.9][SEMANTIC:ARCH-VISUALIZATION][TYPE:STATE-ORCHESTRATOR][#REF]{BUN-API:1.3.WORKER-INTROSPECT}
`;

  await Bun.write("docs/TES-LIFECYCLE-ARCHITECTURE.md", docContent);
  console.log("✅ Updated TES-LIFECYCLE-ARCHITECTURE.md");
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes("--watch");

  if (watchMode) {
    console.log("👀 Watching lifecycle state changes...");
    setInterval(async () => {
      await updateArchitectureDoc();
    }, 5000); // Update every 5 seconds
  } else {
    await updateArchitectureDoc();
    console.log("✅ Mermaid diagrams generated");
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { generateStateDiagram, generateHexRingDiagram, generateDynamicStateDiagram, updateArchitectureDoc };

