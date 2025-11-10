#!/usr/bin/env bun
/**
 * CLI Output Absorption Hook - Graph Propagation (v1.4.1)
 * 
 * CLI command: bun absorb:cli-output [--conflict=<n> --entropy=<n> --tension=<n>] [<edge.json>]
 * 
 * Absorbs CLI edge mapping outputs into graph propagation system.
 * Supports direct CLI args or file/stdin input.
 * Self-absorbed metadata ensures zero runtime drift.
 */

import { mapEdgeRelation, type EdgeRelation } from '../macros/tension-map.ts';

interface AbsorbedEdge {
  color: {
    hex: string;
    HEX: string;
    hsl: string;
  };
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

/**
 * Parse CLI arguments for direct edge mapping
 */
function parseCliArgs(): { conflict?: number; entropy?: number; tension?: number } | null {
  const args: { conflict?: number; entropy?: number; tension?: number } = {};
  const argv = Bun.argv.slice(2);
  let hasArgs = false;

  for (const arg of argv) {
    if (arg.startsWith('--conflict=') || arg.startsWith('-c=')) {
      args.conflict = parseFloat(arg.split('=')[1]);
      hasArgs = true;
    } else if (arg.startsWith('--entropy=') || arg.startsWith('-e=')) {
      args.entropy = parseFloat(arg.split('=')[1]);
      hasArgs = true;
    } else if (arg.startsWith('--tension=') || arg.startsWith('-t=')) {
      args.tension = parseFloat(arg.split('=')[1]);
      hasArgs = true;
    }
  }

  return hasArgs ? args : null;
}

async function absorbCliOutput(inputPath?: string): Promise<AbsorbedEdge> {
  // Check for direct CLI args first
  const cliArgs = parseCliArgs();
  if (cliArgs) {
    const conflict = Math.max(0.0, Math.min(1.0, cliArgs.conflict ?? 0.0));
    const entropy = Math.max(0.0, Math.min(1.0, cliArgs.entropy ?? 0.0));
    const tension = Math.max(0.0, Math.min(1.0, cliArgs.tension ?? 0.0));
    
    const edgeData = mapEdgeRelation(conflict, entropy, tension);
    
    return {
      color: edgeData.color,
      opacity: edgeData.opacity,
      width: edgeData.width,
      meta: {
        ...edgeData.meta,
        absorbedAt: new Date().toISOString(),
      },
    };
  }

  // Fall back to file/stdin input
  let edgeData: EdgeRelation;
  
  if (!inputPath || inputPath === '-') {
    // Read from stdin (piped input)
    const stdin = await Bun.stdin.text();
    edgeData = JSON.parse(stdin);
  } else {
    // Read from file
    const content = await Bun.file(inputPath).text();
    edgeData = JSON.parse(content);
  }
  
  // Validate structure
  if (!edgeData.color || typeof edgeData.opacity !== 'number' || typeof edgeData.width !== 'number') {
    throw new Error('❌ Invalid edge data format. Expected {color, opacity, width, meta}');
  }
  
  // Absorb with timestamp
  const absorbed: AbsorbedEdge = {
    color: edgeData.color,
    opacity: edgeData.opacity,
    width: edgeData.width,
    meta: {
      ...edgeData.meta,
      absorbedAt: new Date().toISOString(),
    },
  };
  
  return absorbed;
}

// CLI entry point
if (import.meta.main) {
  const inputPath = Bun.argv.find(arg => !arg.startsWith('--') && !arg.startsWith('-') && arg !== Bun.argv[0] && arg !== Bun.argv[1]) || '-';
  
  (async () => {
    try {
      const absorbed = await absorbCliOutput(inputPath);
      
      // Output absorbed edge (can be piped to graph system)
      console.log(JSON.stringify(absorbed, null, 2));
      
      console.error(`✅ Absorbed edge ${absorbed.color.HEX} into graph propagation system`);
    } catch (error) {
      console.error(`❌ Absorption failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  })();
}

export { absorbCliOutput };

