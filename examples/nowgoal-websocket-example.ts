/**
 * NowGoal WebSocket Example Usage
 * 
 * Example demonstrating how to use the NowGoal WebSocket connection manager.
 * 
 * @module examples/nowgoal-websocket-example
 */

import { connectNowGoalWebSocket, WebSocketState } from '../src/lib/nowgoal-websocket.ts';

/**
 * Example: Connect to NowGoal WebSocket and handle messages
 */
async function exampleBasicConnection() {
  console.log('🚀 Starting NowGoal WebSocket connection example...');
  
  const wsManager = await connectNowGoalWebSocket(
    {
      wsUrl: 'wss://nowgoal26.com/ws/odds', // TODO: Update with actual URL
      reconnect: {
        initialDelay: 1000,
        maxDelay: 60000,
        multiplier: 2,
        maxRetries: Infinity,
      },
      heartbeatInterval: 30000,
    },
    {
      onOpen: (ws) => {
        console.log('✅ Connected to NowGoal WebSocket');
        console.log('📡 WebSocket state:', ws.readyState);
        
        // Send subscription message
        wsManager.send(JSON.stringify({
          type: 'subscribe',
          channel: 'odds',
          filters: ['live', 'upcoming'],
        }));
      },
      
      onMessage: (data, ws) => {
        console.log('📨 Received message:');
        console.log('  Type:', data.type);
        console.log('  Root:', data.root);
        console.log('  Elements:', data.elements);
        console.log('  Timestamp:', data.timestamp);
        
        // Process transformed data here
        // This is where you would feed data to the analyzer (TES-NGWS-001.11)
      },
      
      onError: (error, ws) => {
        console.error('❌ WebSocket error:');
        console.error('  Message:', error.message);
        console.error('  Stack:', error.stack);
      },
      
      onClose: (code, reason, ws) => {
        console.log(`🔌 WebSocket closed:`);
        console.log(`  Code: ${code}`);
        console.log(`  Reason: ${reason}`);
        console.log(`  Was clean: ${ws.readyState === WebSocket.CLOSED}`);
      },
      
      onReconnect: (attempt, delay) => {
        console.log(`🔄 Reconnection scheduled:`);
        console.log(`  Attempt: ${attempt}`);
        console.log(`  Delay: ${delay}ms`);
      },
      
      onParseError: (error, rawXml) => {
        console.error('⚠️ XML parse error:');
        console.error('  Error:', error.message);
        console.error('  XML preview:', rawXml.substring(0, 200));
      },
    }
  );
  
  // Monitor connection state
  const stateMonitor = setInterval(() => {
    const state = wsManager.getState();
    console.log(`📊 Connection state: ${state}`);
    
    if (state === WebSocketState.CONNECTED) {
      console.log('✅ Connection is active');
    } else if (state === WebSocketState.DISCONNECTED) {
      console.log('❌ Connection is disconnected');
      clearInterval(stateMonitor);
    }
  }, 5000);
  
  // Keep running for 60 seconds
  setTimeout(() => {
    console.log('🛑 Stopping example...');
    clearInterval(stateMonitor);
    wsManager.close(1000, 'Example complete');
    process.exit(0);
  }, 60000);
}

/**
 * Example: Handle mocked XML data for testing
 */
async function exampleWithMockedData() {
  console.log('🧪 Testing with mocked XML data...');
  
  const wsManager = await connectNowGoalWebSocket(
    {
      wsUrl: 'wss://nowgoal26.com/ws/odds',
      // Use placeholder JWT for testing
      jwtToken: 'placeholder-jwt-token-for-testing',
    },
    {
      onMessage: (data, ws) => {
        console.log('📨 Mocked data received:', data);
        
        // Simulate XML message processing
        const mockXml = `
          <odds>
            <game id="12345">
              <home>Team A</home>
              <away>Team B</away>
              <moneyline>
                <home>+150</home>
                <away>-180</away>
              </moneyline>
            </game>
          </odds>
        `;
        
        // This would be parsed by xml2js in production
        console.log('📄 Mock XML:', mockXml);
      },
    }
  );
  
  // Simulate receiving a message
  setTimeout(() => {
    if (wsManager.isConnected()) {
      // In a real scenario, this would come from the WebSocket
      console.log('📨 Simulating message reception...');
    }
  }, 2000);
}

// Run example
if (import.meta.main) {
  const example = process.argv[2] || 'basic';
  
  if (example === 'basic') {
    exampleBasicConnection().catch(console.error);
  } else if (example === 'mock') {
    exampleWithMockedData().catch(console.error);
  } else {
    console.log('Usage: bun run examples/nowgoal-websocket-example.ts [basic|mock]');
  }
}

