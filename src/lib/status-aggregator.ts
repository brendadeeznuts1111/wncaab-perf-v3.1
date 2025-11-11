// CPU usage tracking for accurate percentage calculation
let previousCpuUsage: NodeJS.CpuUsage | null = null;
let previousCpuTime: number = Date.now();

/**
 * Get current CPU load as a percentage (0-100)
 * Returns value rounded to 1 decimal place
 */
export async function getCpuLoad(): Promise<number> {
  const currentUsage = process.cpuUsage(previousCpuUsage || undefined);
  const currentTime = Date.now();
  
  // Calculate time elapsed in microseconds
  const timeElapsed = (currentTime - previousCpuTime) * 1000; // Convert ms to microseconds
  
  // Calculate total CPU microseconds used
  const totalMicroseconds = currentUsage.user + currentUsage.system;
  
  // Convert to percentage: (CPU time / elapsed time) * 100
  // If no previous measurement, return 0 (first call)
  if (previousCpuUsage === null || timeElapsed === 0) {
    previousCpuUsage = process.cpuUsage();
    previousCpuTime = currentTime;
    return 0;
  }
  
  // Calculate percentage with full precision
  const percentage = (totalMicroseconds / timeElapsed) * 100;
  
  // Update tracking for next call
  previousCpuUsage = process.cpuUsage();
  previousCpuTime = currentTime;
  
  // Round to 1 decimal place and cap at 100%
  const capped = Math.min(percentage, 100);
  const value = parseFloat(capped.toFixed(1));
  
  // Runtime validation: Ensure CPU value is within valid range
  if (value < 0 || value > 100) {
    throw new Error(`Invalid CPU value: ${value}`);
  }
  
  return value;
}

