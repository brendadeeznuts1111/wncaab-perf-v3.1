#!/usr/bin/env bun
/**
 * @script service-mapper-tui
 * @description Interactive terminal UI for service exploration
 * @ticket TES-OPS-004.B.8.17
 * @usage ./scripts/service-mapper-tui.ts
 * @watch-mode bun --watch scripts/service-mapper-tui.ts
 */

import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

async function interactiveMode() {
  console.clear();
  console.log('🗺️  TES Service Mapper - Interactive Mode\n');
  
  while (true) {
    console.log('Options:');
    console.log('1. List all services');
    console.log('2. Check health');
    console.log('3. Show worktree details');
    console.log('4. Open docs for service');
    console.log('5. Open debug interface');
    console.log('6. Validate environment');
    console.log('7. Exit\n');
    
    const answer = await new Promise<string>(resolve => {
      rl.question('Select option [1-7]: ', resolve);
    });
    
    switch (answer) {
      case '1': {
        const proc = Bun.spawn(['bun', 'run', 'scripts/service-mapper.ts', 'list'], { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        await proc.exited;
        break;
      }
      case '2': {
        const proc = Bun.spawn(['bun', 'run', 'scripts/service-mapper.ts', 'health'], { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        await proc.exited;
        break;
      }
      case '3': {
        const wt = await new Promise<string>(resolve => {
          rl.question('Worktree name (tes-repo/tmux-sentinel): ', resolve);
        });
        const proc = Bun.spawn(['bun', 'run', 'scripts/service-mapper.ts', 'worktree', wt], { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        await proc.exited;
        break;
      }
      case '4': {
        const svc = await new Promise<string>(resolve => {
          rl.question('Service name: ', resolve);
        });
        const proc = Bun.spawn(['bun', 'run', 'scripts/service-mapper.ts', 'docs', svc], { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        await proc.exited;
        break;
      }
      case '5': {
        const debugSvc = await new Promise<string>(resolve => {
          rl.question('Service name: ', resolve);
        });
        const proc = Bun.spawn(['bun', 'run', 'scripts/service-mapper.ts', 'debug', debugSvc], { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        await proc.exited;
        break;
      }
      case '6': {
        const proc = Bun.spawn(['bun', 'run', 'scripts/service-mapper.ts', 'validate'], { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        await proc.exited;
        break;
      }
      case '7':
        console.log('\n👋 Goodbye!');
        rl.close();
        return;
      default:
        console.log('❌ Invalid option\n');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Brief pause
    console.clear();
    console.log('🗺️  TES Service Mapper - Interactive Mode\n');
  }
}

interactiveMode().catch(console.error);

