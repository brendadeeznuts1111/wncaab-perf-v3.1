#!/usr/bin/env bun
/**
 * CLI Output Absorption Hook - Graph Propagation (v1.4)
 * 
 * CLI command: bun absorb:cli-output <edge.json>
 * 
 * Absorbs CLI edge mapping outputs into graph propagation system.
 * Self-absorbed metadata ensures zero runtime drift.
 */

import { mapEdgeRelation } from '../macros/tension-map.ts';

interface AbsorbedEdge {
  hex: string;
  opacity: number;
  width: number;
  meta: {
    relation: string;
    conflict: number;
    entropy: number;
    tension: number;
    absorbedBy: string;
    visualNote: string;
    absorbedAt: string;
  };
}

async function absorbCliOutput(inputPath: string): Promise<AbsorbedEdge> {
  let edgeData: ReturnType<typeof mapEdgeRelation>;
  
  if (inputPath === '-' || !inputPath) {
    // Read from stdin (piped input)
    const stdin = await Bun.stdin.text();
    edgeData = JSON.parse(stdin);
  } else {
    // Read from file
    const content = await Bun.file(inputPath).text();
    edgeData = JSON.parse(content);
  }
  
  // Validate structure
  if (!edgeData.hex || typeof edgeData.opacity !== 'number' || typeof edgeData.width !== 'number') {
    throw new Error('❌ Invalid edge data format. Expected {hex, opacity, width, meta}');
  }
  
  // Absorb with timestamp
  const absorbed: AbsorbedEdge = {
    ...edgeData,
    meta: {
      ...edgeData.meta,
      absorbedAt: new Date().toISOString(),
    },
  };
  
  return absorbed;
}

// CLI entry point
if (import.meta.main) {
  const inputPath = Bun.argv[2] || '-';
  
  (async () => {
    try {
      const absorbed = await absorbCliOutput(inputPath);
      
      // Output absorbed edge (can be piped to graph system)
      console.log(JSON.stringify(absorbed, null, 2));
      
      console.error(`✅ Absorbed edge ${absorbed.hex} into graph propagation system`);
    } catch (error) {
      console.error(`❌ Absorption failed: ${error.message}`);
      process.exit(1);
    }
  })();
}

export { absorbCliOutput };

