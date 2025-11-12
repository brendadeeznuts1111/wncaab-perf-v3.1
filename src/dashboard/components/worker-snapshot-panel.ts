/**
 * @component WorkerSnapshotPanel
 * @description Worker snapshot download panel
 * @usage <worker-snapshot-panel></worker-snapshot-panel>
 */

export class WorkerSnapshotPanel extends HTMLElement {
  private workers: Record<string, any> = {};

  connectedCallback() {
    this.render();
    this.loadWorkers();
  }

  private render() {
    this.innerHTML = `
      <style>
        .snapshot-panel {
          background: white;
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1.25rem;
          border: 2px solid #e0e0e0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .worker-list {
          max-height: 400px;
          overflow-y: auto;
          margin-top: 1rem;
        }
        
        .worker-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .worker-item:last-child {
          border-bottom: none;
        }
        
        .worker-info {
          flex: 1;
        }
        
        .worker-id {
          font-weight: 600;
          color: #333;
          font-family: 'SF Mono', 'Monaco', monospace;
        }
        
        .worker-status {
          font-size: 0.85em;
          color: #666;
          margin-top: 0.25rem;
        }
        
        .snapshot-btn {
          padding: 0.5rem 1rem;
          background: #00bcd4;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        
        .snapshot-btn:hover:not(:disabled) {
          background: #0097a7;
          transform: translateY(-1px);
        }
        
        .snapshot-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #999;
        }
      </style>
      
      <div class="snapshot-panel">
        <h3 style="margin: 0 0 1rem 0; color: #00bcd4; font-size: 1.3em; font-weight: 700;">
          📥 Worker Snapshots
        </h3>
        <div class="worker-list" id="worker-list">
          <div class="empty-state">Loading workers...</div>
        </div>
      </div>
    `;
  }

  private async loadWorkers() {
    try {
      const token = document.querySelector('meta[name="tes-dev-token"]')?.getAttribute('content') || 'dev-token-default';
      const response = await fetch('/api/dev/workers', {
        headers: {
          'X-TES-Dev-Token': token
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      this.workers = data.workers || {};
      this.updateWorkerList();
    } catch (error) {
      console.error('Failed to load workers:', error);
      const listEl = this.querySelector('#worker-list');
      if (listEl) {
        listEl.innerHTML = '<div class="empty-state">Failed to load workers. Make sure the Worker Telemetry API is running.</div>';
      }
    }
  }

  private updateWorkerList() {
    const listEl = this.querySelector('#worker-list');
    if (!listEl) return;

    const workerIds = Object.keys(this.workers);
    
    if (workerIds.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No workers available</div>';
      return;
    }

    listEl.innerHTML = workerIds.map(workerId => {
      const worker = this.workers[workerId];
      return `
        <div class="worker-item">
          <div class="worker-info">
            <div class="worker-id">${workerId}</div>
            <div class="worker-status">Status: ${worker.status || 'unknown'}</div>
          </div>
          <button class="snapshot-btn" data-worker-id="${workerId}" onclick="this.dispatchEvent(new CustomEvent('download-snapshot', { bubbles: true, detail: { workerId: '${workerId}' } }))">
            📥 Download
          </button>
        </div>
      `;
    }).join('');

    // Add event listeners
    listEl.querySelectorAll('.snapshot-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const workerId = (e.target as HTMLElement).getAttribute('data-worker-id');
        if (workerId) {
          this.downloadSnapshot(workerId);
        }
      });
    });
  }

  private async downloadSnapshot(workerId: string) {
    try {
      const token = document.querySelector('meta[name="tes-dev-token"]')?.getAttribute('content') || 'dev-token-default';
      const response = await fetch(`/api/workers/snapshot/${workerId}`, {
        headers: {
          'X-TES-Dev-Token': token
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tes-worker-snapshot-${workerId}-${Date.now()}.json.gz`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success notification
      this.showNotification(`Snapshot downloaded for ${workerId}`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.showNotification(`Failed to download snapshot: ${errorMessage}`, 'error');
      
      // If it's a telemetry offline error, offer to start tmux session
      if (errorMessage.includes('not available') || errorMessage.includes('offline')) {
        if (confirm('Worker Telemetry API appears to be offline. Would you like to start the tmux session?')) {
          try {
            await fetch('/api/dev/tmux/start', { method: 'POST' });
            this.showNotification('Tmux session started. Please wait a moment and try again.', 'success');
          } catch (e) {
            this.showNotification('Failed to start tmux session', 'error');
          }
        }
      }
    }
  }

  private showNotification(message: string, type: 'success' | 'error') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: ${type === 'success' ? '#28a745' : '#dc3545'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-weight: 600;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

customElements.define('worker-snapshot-panel', WorkerSnapshotPanel);

