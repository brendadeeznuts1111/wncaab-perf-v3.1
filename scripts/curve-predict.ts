/**
 * Curve Predict CLI - Prediction Testing
 * 
 * Usage: bun run curve-predict.ts --input sample-32.json --horizon 100
 */

import { SplineRenderer } from './spline-renderer.ts';
const renderer = new SplineRenderer();

interface PredictOptions {
  input: string;
  horizon: number;
  output?: string;
}

async function predictTest(options: PredictOptions) {
  const { input, horizon, output } = options;

  console.log(`🔮 Predicting curve:`);
  console.log(`   Input: ${input}`);
  console.log(`   Horizon: ${horizon} points`);

  // Load input path
  const inputFile = Bun.file(input);
  if (!(await inputFile.exists())) {
    console.error(`❌ Input file not found: ${input}`);
    process.exit(1);
  }

  const inputData = await inputFile.json();
  const path = inputData.path || inputData;

  if (!Array.isArray(path)) {
    console.error(`❌ Invalid input format: expected array of points`);
    process.exit(1);
  }

  const startTime = Bun.nanoseconds();
  const predicted = renderer.predict(path, horizon);
  const endTime = Bun.nanoseconds();
  const duration = (endTime - startTime) / 1_000_000; // Convert to ms

  console.log(`✅ Predicted ${predicted.length} points in ${duration.toFixed(2)}ms`);

  // Save to file if output specified
  if (output) {
    await Bun.write(output, JSON.stringify({ predicted, metadata: { input, horizon } }, null, 2));
    console.log(`💾 Saved to ${output}`);
  } else {
    // Output to stdout
    console.log(JSON.stringify({ predicted: predicted.slice(0, 10), total: predicted.length }, null, 2));
  }
}

// Parse CLI arguments
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const options: PredictOptions = {
    input: '',
    horizon: 100,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' && i + 1 < args.length) {
      options.input = args[++i];
    } else if (arg === '--horizon' && i + 1 < args.length) {
      options.horizon = parseInt(args[++i], 10);
    } else if (arg === '--output' && i + 1 < args.length) {
      options.output = args[++i];
    } else if (arg.startsWith('--input=')) {
      options.input = arg.split('=')[1];
    } else if (arg.startsWith('--horizon=')) {
      options.horizon = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    }
  }

  if (!options.input) {
    console.error('❌ --input required');
    process.exit(1);
  }

  predictTest(options).catch(error => {
    console.error('❌ Prediction failed:', error);
    process.exit(1);
  });
}

export { predictTest };

