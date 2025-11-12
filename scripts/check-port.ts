#!/usr/bin/env bun
/**
 * Port Check Utility
 * 
 * Checks if a port is available and provides information about processes using it.
 * 
 * Usage:
 *   bun run scripts/check-port.ts [port]
 *   bun run scripts/check-port.ts 3001
 */

const port = parseInt(process.argv[2] || '3001');

// First, check if anything is using the port using lsof
try {
  const lsofResult = Bun.spawnSync(['lsof', '-ti', `:${port}`]);
  const pid = lsofResult.stdout.toString().trim();
  
  if (pid) {
    console.log(`❌ Port ${port} is IN USE`);
    
    try {
      const processName = Bun.spawnSync(['ps', '-p', pid, '-o', 'comm=']).stdout.toString().trim();
      const processInfo = Bun.spawnSync(['ps', '-p', pid, '-o', 'pid,comm,args']).stdout.toString().trim();
      
      console.log(`   Process: ${processName} (PID: ${pid})`);
      console.log(`   Kill with: kill ${pid}`);
      
      // Show more details
      const lines = processInfo.split('\n');
      if (lines.length > 1) {
        console.log(`   Details: ${lines[1]}`);
      }
    } catch (e) {
      console.log(`   Process: Unknown (PID: ${pid})`);
      console.log(`   Kill with: kill ${pid}`);
    }
    
    process.exit(1);
  }
} catch (e) {
  // lsof didn't find anything, continue to test binding
}

// Try to bind to the port to confirm it's available
try {
  const server = Bun.listen({
    port,
    hostname: '0.0.0.0', // Try IPv4
    socket: {
      data(socket, data) {}
    }
  });
  
  console.log(`✅ Port ${port} is AVAILABLE`);
  server.stop();
  
} catch (error: any) {
  if (error.code === 'EADDRINUSE') {
    console.log(`❌ Port ${port} is IN USE (binding test failed)`);
    
    // Find the process using the port
    try {
      const pid = Bun.spawnSync(['lsof', '-ti', `:${port}`]).stdout.toString().trim();
      if (pid) {
        const processName = Bun.spawnSync(['ps', '-p', pid, '-o', 'comm=']).stdout.toString().trim();
        console.log(`   Process: ${processName} (PID: ${pid})`);
        console.log(`   Kill with: kill ${pid}`);
      } else {
        console.log(`   Process: Unknown (run: lsof -i :${port})`);
      }
    } catch (e) {
      console.log(`   Process: Unknown (run: lsof -i :${port})`);
    }
    
    process.exit(1);
  } else {
    console.error(`Error checking port: ${error.message}`);
    process.exit(1);
  }
}

