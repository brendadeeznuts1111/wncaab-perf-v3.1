/**
 * Spline Render CLI - Batch Rendering
 * 
 * Usage: bun run spline-render.ts --points 10000 --type catmull-rom --preset prod
 */

// Import renderer class directly (avoid starting server)
import { SplineRenderer } from './spline-renderer.ts';
const renderer = new SplineRenderer();

interface RenderOptions {
  points: number;
  type: 'catmull-rom' | 'bezier' | 'cubic' | 'linear';
  preset?: string;
  output?: string;
}

async function renderBatch(options: RenderOptions) {
  const { points, type, preset, output } = options;

  console.log(`🎨 Rendering spline:`);
  console.log(`   Points: ${points}`);
  console.log(`   Type: ${type}`);
  if (preset) console.log(`   Preset: ${preset}`);

  const startTime = Bun.nanoseconds();
  const path = renderer.render({
    type,
    points,
    tension: 0.5,
    closed: false,
  });
  const endTime = Bun.nanoseconds();
  const duration = (endTime - startTime) / 1_000_000; // Convert to ms

  console.log(`✅ Rendered ${path.length} points in ${duration.toFixed(2)}ms`);

  // Save to file if output specified
  if (output) {
    await Bun.write(output, JSON.stringify({ path, metadata: { points, type, preset } }, null, 2));
    console.log(`💾 Saved to ${output}`);
  } else {
    // Output to stdout
    console.log(JSON.stringify({ path: path.slice(0, 10), total: path.length }, null, 2));
  }
}

// Parse CLI arguments
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const options: RenderOptions = {
    points: 1000,
    type: 'catmull-rom',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--points' && i + 1 < args.length) {
      options.points = parseInt(args[++i], 10);
    } else if (arg === '--type' && i + 1 < args.length) {
      options.type = args[++i] as RenderOptions['type'];
    } else if (arg === '--preset' && i + 1 < args.length) {
      options.preset = args[++i];
    } else if (arg === '--output' && i + 1 < args.length) {
      options.output = args[++i];
    } else if (arg.startsWith('--points=')) {
      options.points = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--type=')) {
      options.type = arg.split('=')[1] as RenderOptions['type'];
    } else if (arg.startsWith('--preset=')) {
      options.preset = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    }
  }

  renderBatch(options).catch(error => {
    console.error('❌ Render failed:', error);
    process.exit(1);
  });
}

export { renderBatch };

