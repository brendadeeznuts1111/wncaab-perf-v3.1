/**
 * @component MetricsStream
 * @description Live metrics streaming component using Bun native metrics
 */

export class MetricsStream extends HTMLElement {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connectedCallback() {
    this.render();
    this.connect();
  }

  disconnectedCallback() {
    this.disconnect();
  }

  private render() {
    this.innerHTML = `
      <style>
        .metrics-live {
          background: var(--tes-bg-secondary);
          border: 1px solid var(--tes-border);
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .metrics-live h3 {
          margin: 0 0 1rem 0;
          color: var(--tes-text);
          font-size: 1.1em;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--tes-danger);
          display: inline-block;
          animation: pulse 2s infinite;
        }
        
        .status-indicator.connected {
          background: var(--tes-success);
          animation: none;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .metric-gauges {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .gauge {
          background: var(--tes-bg);
          border: 1px solid var(--tes-border);
          border-radius: 6px;
          padding: 1rem;
          text-align: center;
        }
        
        .gauge label {
          display: block;
          font-size: 0.85em;
          color: var(--tes-text-muted);
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        .gauge-value {
          font-size: 1.8em;
          font-weight: 700;
          color: var(--tes-primary);
          transition: all 0.3s ease;
        }
        
        .gauge-value.tes-updated {
          transform: scale(1.1);
          color: var(--tes-success);
        }
        
        #metrics-chart {
          width: 100%;
          height: 100px;
          border: 1px solid var(--tes-border);
          border-radius: 4px;
          background: var(--tes-bg-dark);
        }
        
        .connection-status {
          font-size: 0.85em;
          color: var(--tes-text-muted);
          margin-top: 0.5rem;
          text-align: center;
        }
      </style>
      
      <div class="metrics-live">
        <h3>
          <span class="status-indicator" id="ws-status-indicator"></span>
          🔴 Live Metrics Stream
        </h3>
        
        <div class="metric-gauges">
          <div class="gauge">
            <label>Pending Requests</label>
            <div class="gauge-value" data-metric="pending-requests">-</div>
          </div>
          <div class="gauge">
            <label>WebSocket Conns</label>
            <div class="gauge-value" data-metric="pending-ws">-</div>
          </div>
          <div class="gauge">
            <label>Subscribers</label>
            <div class="gauge-value" data-metric="subscribers">-</div>
          </div>
          <div class="gauge">
            <label>Heap Used (MB)</label>
            <div class="gauge-value" data-metric="heap-used">-</div>
          </div>
        </div>
        
        <canvas id="metrics-chart" width="400" height="100"></canvas>
        
        <div class="connection-status" id="connection-status">
          Connecting...
        </div>
      </div>
    `;
  }

  private connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/dev/server-metrics/live`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('Connected', true);
        const indicator = this.querySelector('#ws-status-indicator');
        if (indicator) indicator.classList.add('connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const metrics = JSON.parse(event.data);
          this.updateMetrics(metrics);
        } catch (error) {
          console.error('Failed to parse metrics:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateConnectionStatus('Connection error', false);
      };
      
      this.ws.onclose = () => {
        const indicator = this.querySelector('#ws-status-indicator');
        if (indicator) indicator.classList.remove('connected');
        this.updateConnectionStatus('Disconnected', false);
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.updateConnectionStatus('Failed to connect', false);
    }
  }

  private disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionStatus('Max reconnection attempts reached', false);
      return;
    }
    
    this.reconnectAttempts++;
    this.updateConnectionStatus(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`, false);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private updateMetrics(metrics: any) {
    // Update gauges
    this.updateGauge('pending-requests', metrics.http?.pendingRequests || 0);
    this.updateGauge('pending-ws', metrics.websockets?.pendingConnections || 0);
    this.updateGauge('subscribers', metrics.websockets?.totalSubscribers || 0);
    this.updateGauge('heap-used', Math.round((metrics.memory?.heapUsed || 0) / 1024 / 1024));
    
    // Update chart (simplified - can be enhanced with Chart.js or similar)
    this.updateChart(metrics);
  }

  private updateGauge(metric: string, value: number) {
    const el = this.querySelector(`[data-metric="${metric}"]`) as HTMLElement;
    if (el) {
      const oldValue = parseInt(el.textContent || '0', 10);
      el.textContent = value.toString();
      
      // Add update animation if value changed
      if (oldValue !== value) {
        el.classList.add('tes-updated');
        setTimeout(() => el.classList.remove('tes-updated'), 300);
      }
    }
  }

  private updateChart(metrics: any) {
    const canvas = this.querySelector('#metrics-chart') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Simple line chart for pending requests
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'var(--tes-border)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw metric line (simplified - would need history buffer for real chart)
    const pendingRequests = metrics.http?.pendingRequests || 0;
    const maxValue = 100; // Scale
    const y = height - (pendingRequests / maxValue) * height;
    
    ctx.strokeStyle = 'var(--tes-primary)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  private updateConnectionStatus(message: string, connected: boolean) {
    const statusEl = this.querySelector('#connection-status') as HTMLElement;
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.color = connected ? 'var(--tes-success)' : 'var(--tes-danger)';
    }
  }
}

customElements.define('metrics-stream', MetricsStream);

