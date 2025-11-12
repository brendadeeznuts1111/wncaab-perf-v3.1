import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { SERVICE_REGISTRY, type ServiceDefinition } from '../../src/config/service-registry.ts';
import { findService, checkServiceHealth } from '../../scripts/service-mapper.ts';

describe('Service Mapper', () => {
  describe('Service Registry', () => {
    it('should contain all required services', () => {
      expect(SERVICE_REGISTRY.development).toHaveLength(4);
      expect(SERVICE_REGISTRY.websocket).toHaveLength(3);
      expect(SERVICE_REGISTRY.tools).toHaveLength(5);
      expect(SERVICE_REGISTRY.orchestration).toHaveLength(2);
    });

    it('should have all required properties for each service', () => {
      const allServices = Object.values(SERVICE_REGISTRY).flat();
      
      allServices.forEach(service => {
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('description');
        expect(service).toHaveProperty('worktree');
        expect(service).toHaveProperty('url');
        expect(service).toHaveProperty('logsPath');
        expect(service).toHaveProperty('statusCommand');
        expect(typeof service.name).toBe('string');
        expect(typeof service.worktree).toBe('string');
      });
    });

    it('should have correct port metadata for development services', () => {
      const devServices = SERVICE_REGISTRY.development;
      
      expect(devServices[0].metadata?.port).toBe('3002'); // tes-repo Dev Server
      expect(devServices[1].metadata?.port).toBe('3003'); // tes-repo Worker API
      expect(devServices[2].metadata?.port).toBe('3004'); // tmux-sentinel Dev Server
      expect(devServices[3].metadata?.port).toBe('3005'); // tmux-sentinel Worker API
    });
  });

  describe('findService', () => {
    it('should find services case-insensitively', () => {
      const service = findService('DEV server');
      expect(service?.name).toBe('Dev Server');
    });

    it('should find services with partial matches', () => {
      const service = findService('dev');
      expect(service?.name).toBe('Dev Server');
    });

    it('should handle unknown service', () => {
      const service = findService('non-existent-service');
      expect(service).toBeUndefined();
    });

    it('should find Worker Telemetry API', () => {
      const service = findService('worker');
      expect(service?.name).toContain('Worker');
    });
  });

  describe('checkServiceHealth', () => {
    it('should check health of offline service (port available)', () => {
      // Mock successful listen = port free = service offline
      const originalListen = Bun.listen;
      Bun.listen = mock(() => ({
        stop: () => {}
      })) as any;
      
      const service = SERVICE_REGISTRY.development[0];
      const isOnline = checkServiceHealth(service);
      
      expect(isOnline).toBe(false);
      
      // Restore original
      Bun.listen = originalListen;
    });

    it('should check health of online service (port in use)', () => {
      // Mock EADDRINUSE error = port in use = service online
      const originalListen = Bun.listen;
      Bun.listen = mock(() => {
        const err: any = new Error('Port in use');
        err.code = 'EADDRINUSE';
        throw err;
      }) as any;
      
      const service = SERVICE_REGISTRY.development[0];
      const isOnline = checkServiceHealth(service);
      
      expect(isOnline).toBe(true);
      
      // Restore original
      Bun.listen = originalListen;
    });

    it('should return true for external HTTPS URLs', () => {
      const service: ServiceDefinition = {
        name: 'Test',
        description: 'Test',
        worktree: 'global',
        url: 'https://example.com',
        logsPath: 'N/A',
        statusCommand: 'curl https://example.com'
      };
      
      const isOnline = checkServiceHealth(service);
      expect(isOnline).toBe(true);
    });

    it('should return true for chrome:// URLs', () => {
      const service: ServiceDefinition = {
        name: 'Test',
        description: 'Test',
        worktree: 'global',
        url: 'chrome://inspect',
        logsPath: 'N/A',
        statusCommand: 'open chrome://inspect'
      };
      
      const isOnline = checkServiceHealth(service);
      expect(isOnline).toBe(true);
    });
  });
});
