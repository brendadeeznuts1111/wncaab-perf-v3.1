/**
 * Example: Demonstrating Bun.inspect() for syntax-highlighted error previews
 * 
 * This example shows how Bun automatically provides syntax-highlighted
 * source code previews for errors, and how to use Bun.inspect() manually.
 * 
 * Run with:
 *   bun run examples/debug-inspect-error.ts
 */

console.log('=== Bun.inspect() Error Preview Demo ===\n');

// Example 1: Manual inspection with Bun.inspect()
console.log('1. Manual inspection using Bun.inspect():');
console.log('----------------------------------------');

// Create an error
const err = new Error("Something went wrong");
console.log(Bun.inspect(err, { colors: true }));

// This prints a syntax-highlighted preview of the source code where the error occurred,
// along with the error message and stack trace.

console.log('\n');

// Example 2: Simulating an unhandled exception
console.log('2. Unhandled exception (automatic preview):');
console.log('-------------------------------------------');
console.log('(This would automatically show syntax-highlighted preview)\n');

// Example 3: Error in a function
console.log('3. Error thrown from a function:');
console.log('---------------------------------');

function problematicFunction() {
  const value = null;
  // This will throw an error
  return value!.someProperty; // TypeScript non-null assertion
}

try {
  problematicFunction();
} catch (error) {
  console.log(Bun.inspect(error, { colors: true }));
}

console.log('\n');

// Example 4: Async error
console.log('4. Async error (unhandled rejection):');
console.log('-------------------------------------');

async function asyncError() {
  throw new Error("Async operation failed");
}

// Note: In a real scenario, unhandled rejections would automatically
// show the syntax-highlighted preview. Here we catch it to demonstrate.
asyncError().catch(error => {
  console.log(Bun.inspect(error, { colors: true }));
});

console.log('\n=== Demo Complete ===');
console.log('\nNote: Bun automatically shows syntax-highlighted previews');
console.log('for unhandled exceptions and rejections. Use Bun.inspect()');
console.log('to manually inspect errors programmatically.');

