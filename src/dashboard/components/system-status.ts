/**
 * @component SystemStatus
 * @description Enhanced system status component with polling
 * @usage <system-status data-polling-interval="5000"></system-status>
 */

export class SystemStatus extends HTMLElement {
  private pollingInterval: number = 5000;
  private intervalId?: number;

  connectedCallback() {
    const interval = this.getAttribute('data-polling-interval');
    if (interval) {
      this.pollingInterval = parseInt(interval, 10);
    }
    this.render();
    this.startPolling();
  }

  disconnectedCallback() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private render() {
    this.innerHTML = `
      <style>
        .system-status-panel {
          background: white;
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1.25rem;
          border: 2px solid #e0e0e0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .status-card {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 1rem;
          border-radius: 8px;
          border-left: 4px solid #00bcd4;
        }
        
        .status-card h4 {
          margin: 0 0 0.5rem 0;
          color: #333;
          font-size: 0.9em;
          font-weight: 600;
        }
        
        .status-value {
          font-size: 1.5em;
          font-weight: 700;
          color: #00bcd4;
          font-family: 'SF Mono', 'Monaco', monospace;
        }
        
        .status-indicator {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 0.5rem;
          background: #999;
        }
        
        .status-indicator.online {
          background: #28a745;
          box-shadow: 0 0 8px #28a745;
        }
        
        .status-indicator.degraded {
          background: #ffc107;
          box-shadow: 0 0 8px #ffc107;
        }
        
        .status-indicator.isolated {
          background: #dc3545;
          box-shadow: 0 0 8px #dc3545;
        }
      </style>
      
      <div class="system-status-panel">
        <h3 style="margin: 0 0 1rem 0; color: #00bcd4; font-size: 1.3em; font-weight: 700;">
          📊 System Status
        </h3>
        <div class="status-grid" id="system-status-grid">
          <div class="status-card">
            <h4>🖥️ Tmux Sessions</h4>
            <div class="status-value" id="status-tmux">-</div>
          </div>
          <div class="status-card">
            <h4>👷 Active Workers</h4>
            <div class="status-value" id="status-workers">-</div>
          </div>
          <div class="status-card">
            <h4>🔌 API Sessions</h4>
            <div class="status-value" id="status-api-sessions">-</div>
          </div>
          <div class="status-card">
            <h4>🌐 WebSocket Connections</h4>
            <div class="status-value" id="status-websockets">-</div>
          </div>
          <div class="status-card">
            <h4>📡 WebSocket Subscribers</h4>
            <div class="status-value" id="status-websocket-subscribers">-</div>
          </div>
          <div class="status-card">
            <h4>📍 Primary Region</h4>
            <div class="status-value" id="status-region">-</div>
          </div>
          <div class="status-card">
            <h4>🚦 Traffic Mode</h4>
            <div style="display: flex; align-items: center;">
              <span class="status-indicator" id="status-traffic-indicator"></span>
              <span class="status-value" id="status-traffic-mode" style="font-size: 1.2em;">-</span>
            </div>
          </div>
          <div class="status-card">
            <h4>💾 Memory (MB)</h4>
            <div class="status-value" id="status-memory">-</div>
          </div>
          <div class="status-card">
            <h4>⚡ CPU Load</h4>
            <div class="status-value" id="status-cpu">-</div>
          </div>
          <div class="status-card">
            <h4>📊 Error Rate</h4>
            <div class="status-value" id="status-error-rate">-</div>
          </div>
          <div class="status-card">
            <h4>⏱️ Uptime</h4>
            <div class="status-value" id="status-uptime">-</div>
          </div>
        </div>
      </div>
    `;
  }

  private async updateStatus() {
    try {
      const response = await fetch('/api/dev/status');
      const data = await response.json();
      
      if (data.vector) {
        const v = data.vector;
        
        // Sessions
        this.updateElement('status-tmux', v.sessions?.tmux || 0);
        this.updateElement('status-workers', v.sessions?.activeWorkers || 0);
        this.updateElement('status-api-sessions', v.sessions?.apiSessions || 0);
        this.updateElement('status-websockets', v.sessions?.websocketConnections || 0);
        this.updateElement('status-websocket-subscribers', v.sessions?.websocketSubscribers || 0);
        
        // Directions
        this.updateElement('status-region', v.directions?.primaryRegion || 'unknown');
        const trafficMode = v.directions?.trafficMode || 'normal';
        this.updateElement('status-traffic-mode', trafficMode);
        const indicator = this.querySelector('#status-traffic-indicator');
        if (indicator) {
          indicator.className = `status-indicator ${trafficMode}`;
        }
        
        // Others
        this.updateElement('status-memory', `${Math.round((v.others?.memory || 0) / 1024 / 1024)} MB`);
        this.updateElement('status-cpu', `${v.others?.cpu || 0}%`);
        this.updateElement('status-error-rate', `${((v.others?.errorRate || 0) * 100).toFixed(2)}%`);
        this.updateElement('status-uptime', this.formatUptime(v.others?.uptime || 0));
      }
    } catch (error) {
      console.error('Failed to update system status:', error);
    }
  }

  private updateElement(id: string, value: string | number) {
    const el = this.querySelector(`#${id}`);
    if (el) el.textContent = String(value);
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  private startPolling() {
    this.updateStatus(); // Initial load
    this.intervalId = setInterval(() => this.updateStatus(), this.pollingInterval) as unknown as number;
  }
}

customElements.define('system-status', SystemStatus);

