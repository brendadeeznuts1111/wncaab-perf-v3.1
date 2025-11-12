/**
 * @component service-map-widget
 * @description Dashboard widget displaying service map with health status
 * @ticket TES-OPS-004.B.8.17
 */

import { SERVICE_REGISTRY } from '../../config/service-registry.ts';

export class ServiceMapWidget extends HTMLElement {
  private healthCheckInterval?: number;

  connectedCallback() {
    this.render();
    this.startHealthPolling();
  }

  disconnectedCallback() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  private render() {
    this.innerHTML = `
      <style>
        .service-map {
          font-family: var(--tes-font-mono, 'SF Mono', 'Monaco', monospace);
          font-size: 0.85rem;
          padding: 1rem;
          background: var(--tes-bg-secondary, #1e1e1e);
          border-radius: 8px;
        }
        .service-category {
          margin-bottom: 1.5rem;
        }
        .service-category h4 {
          color: var(--tes-text-muted, #888);
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .service-item {
          display: grid;
          grid-template-columns: 2fr 1fr 2fr auto;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--tes-border-subtle, rgba(255,255,255,0.1));
          align-items: center;
        }
        .service-item:last-child {
          border-bottom: none;
        }
        .service-name {
          font-weight: 500;
          color: var(--tes-text-primary, #e0e0e0);
        }
        .service-worktree {
          color: var(--tes-text-muted, #888);
          font-size: 0.8rem;
        }
        .service-url {
          color: var(--tes-link-color, #00bcd4);
          font-size: 0.8rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .service-status {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--tes-text-muted, #666);
          transition: background-color 0.3s ease;
        }
        .service-status.online {
          background: var(--tes-success, #4caf50);
          box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
        }
        .service-status.offline {
          background: var(--tes-error, #f44336);
        }
        .loading {
          color: var(--tes-text-muted, #888);
          text-align: center;
          padding: 2rem;
        }
      </style>
      
      <div class="service-map" id="service-map-container">
        <div class="loading">Loading service map...</div>
      </div>
    `;
  }

  private async updateMap() {
    const container = this.querySelector('#service-map-container') as HTMLElement;
    if (!container) return;

    try {
      // Fetch service registry from API or use static data
      const services = await this.fetchServices();
      const categories = ['development', 'websocket', 'orchestration'];
      
      let html = '';
      for (const category of categories) {
        const categoryServices = services[category] || [];
        if (categoryServices.length === 0) continue;

        html += `<div class="service-category">`;
        html += `<h4>${category.toUpperCase()}</h4>`;
        
        for (const service of categoryServices) {
          const isOnline = await this.checkServiceHealth(service);
          const statusClass = isOnline ? 'online' : 'offline';
          
          html += `
            <div class="service-item">
              <span class="service-name">${this.escapeHtml(service.name)}</span>
              <span class="service-worktree">${this.escapeHtml(service.worktree)}</span>
              <span class="service-url" title="${this.escapeHtml(service.url)}">${this.escapeHtml(service.url.length > 40 ? service.url.substring(0, 37) + '...' : service.url)}</span>
              <span class="service-status ${statusClass}" title="${isOnline ? 'Online' : 'Offline'}"></span>
            </div>
          `;
        }
        
        html += `</div>`;
      }
      
      container.innerHTML = html || '<div class="loading">No services found</div>';
    } catch (error) {
      container.innerHTML = `<div class="loading">Error loading services: ${error}</div>`;
    }
  }

  private async fetchServices(): Promise<Record<string, any[]>> {
    // Try to fetch from API endpoint if available
    try {
      const response = await fetch('/api/dev/services');
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fall back to static registry
    }

    // Static service registry (matches service-mapper.ts)
    return {
      development: [
        { name: 'Dev Server', worktree: 'tes-repo', url: 'http://localhost:3002' },
        { name: 'Worker Telemetry API', worktree: 'tes-repo', url: 'http://localhost:3003' },
        { name: 'Dev Server (Tmux)', worktree: 'tmux-sentinel', url: 'http://localhost:3004' },
        { name: 'Worker Telemetry API (Tmux)', worktree: 'tmux-sentinel', url: 'http://localhost:3005' }
      ],
      websocket: [
        { name: 'Status Live Feed', worktree: 'tes-repo', url: 'ws://localhost:3002/api/dev/status/live' },
        { name: 'Worker Updates', worktree: 'tes-repo', url: 'ws://localhost:3003/ws/workers/telemetry' },
        { name: 'Status Live Feed (Tmux)', worktree: 'tmux-sentinel', url: 'ws://localhost:3004/api/dev/status/live' }
      ],
      orchestration: [
        { name: 'Tmux Main Session', worktree: 'tes-repo', url: 'N/A' },
        { name: 'Tmux Feature Session', worktree: 'tmux-sentinel', url: 'N/A' }
      ]
    };
  }

  private async checkServiceHealth(service: any): Promise<boolean> {
    try {
      if (service.url.startsWith('http://')) {
        const response = await fetch(service.url, { 
          signal: AbortSignal.timeout(1000),
          mode: 'no-cors' // Avoid CORS issues
        });
        return true; // If fetch doesn't throw, assume online
      } else if (service.url.startsWith('ws://')) {
        // WebSocket health check - simplified
        return true; // Assume online if URL is valid
      } else if (service.url === 'N/A' || service.url.startsWith('https://') || service.url.startsWith('chrome://')) {
        return true; // External tools
      }
      return false;
    } catch {
      return false;
    }
  }

  private startHealthPolling() {
    this.updateMap();
    this.healthCheckInterval = setInterval(() => this.updateMap(), 5000) as any;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('service-map-widget', ServiceMapWidget);

