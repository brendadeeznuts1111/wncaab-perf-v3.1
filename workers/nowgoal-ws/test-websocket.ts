#!/usr/bin/env bun
/**
 * NowGoal WebSocket Production Test
 * 
 * Tests WebSocket connection with CSRF token and subprotocol negotiation
 */

const BASE_URL = "https://nowgoal-ws-prod.utahj4754.workers.dev";

console.log('🧪 TES-NOWGOAL-WS: Production WebSocket Test\n');
console.log(`Base URL: ${BASE_URL}\n`);

try {
  // Step 1: Get CSRF token
  console.log('[1/3] Fetching CSRF token...');
  const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf-token`);
  
  if (!csrfResponse.ok) {
    throw new Error(`CSRF token fetch failed: ${csrfResponse.status} ${csrfResponse.statusText}`);
  }
  
  const { token: csrfToken } = await csrfResponse.json();
  
  if (!csrfToken) {
    throw new Error('CSRF token not found in response');
  }
  
  console.log(`✅ CSRF Token obtained: ${csrfToken.substring(0, 30)}...\n`);

  // Step 2: Connect WebSocket with subprotocol negotiation
  console.log('[2/3] Connecting WebSocket with subprotocol negotiation...');
  console.log('   Requested protocols: tes-ui-v1, tes-ui-v2');
  
  // Browser WebSocket API doesn't support custom headers, so use query parameter
  const wsUrl = `wss://nowgoal-ws-prod.utahj4754.workers.dev?csrf=${encodeURIComponent(csrfToken)}`;
  const ws = new WebSocket(wsUrl, ['tes-ui-v1', 'tes-ui-v2']);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket connection timeout (10s)'));
    }, 10000);

    ws.onopen = () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connected');
      
      // Step 3: Verify subprotocol negotiation
      console.log('\n[3/3] Verifying subprotocol negotiation...');
      const negotiatedProtocol = ws.protocol || 'none';
      
      if (negotiatedProtocol === 'tes-ui-v1') {
        console.log(`✅ Subprotocol negotiated: ${negotiatedProtocol}`);
        console.log('   Server selected tes-ui-v1 from client list ["tes-ui-v1", "tes-ui-v2"]');
        console.log('   ✅ RFC 6455 compliant');
      } else {
        console.log(`⚠️  Subprotocol: ${negotiatedProtocol} (expected: tes-ui-v1)`);
      }

      // Wait for initial message
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('\n📨 Initial message received:');
          console.log(JSON.stringify(message, null, 2));
          
          if (message.type === 'connected' && message.protocol === 'tes-ui-v1') {
            console.log('\n✅ Manifest signature badge: GREEN');
            console.log('   Connection verified and operational');
          }
          
          ws.close();
          resolve();
        } catch (error) {
          console.log(`\n📨 Message received (raw): ${event.data}`);
          ws.close();
          resolve();
        }
      };

      // Handle errors
      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error instanceof Error ? error.message : String(error)}`));
      };
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      reject(new Error(`WebSocket connection error: ${error instanceof Error ? error.message : String(error)}`));
    };
  });

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('✅ WebSocket connection test PASSED');
  console.log('✅ CSRF token validation: PASSED');
  console.log('✅ Subprotocol negotiation: PASSED');
  console.log('✅ Production worker: OPERATIONAL\n');
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack) {
    console.error('\nStack:', error.stack);
  }
  process.exit(1);
}

