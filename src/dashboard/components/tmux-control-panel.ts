/**
 * @component TmuxControlPanel
 * @description Start/stop/attach to TES dev environment from dashboard
 */

export class TmuxControlPanel extends HTMLElement {
  private intervalId?: number;

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.startStatusPolling();
  }

  disconnectedCallback() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private render() {
    this.innerHTML = `
      <style>
        .tmux-panel {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          padding: 1.5rem;
          margin-bottom: 1.25rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .tmux-status {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #999;
        }
        
        .status-indicator.online {
          background: #28a745;
          box-shadow: 0 0 8px #28a745;
        }
        
        .tmux-actions {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .tmux-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e0e0e0;
          background: white;
          color: #333;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s ease;
          font-weight: 600;
        }
        
        .tmux-btn:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #00bcd4;
        }
        
        .tmux-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        details {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 0.5rem;
          background: #f8f9fa;
        }
        
        summary {
          cursor: pointer;
          font-weight: 600;
          color: #00bcd4;
          padding: 0.5rem;
        }
        
        pre {
          background: #1a1a1a;
          color: #00ff00;
          padding: 0.75rem;
          border-radius: 4px;
          overflow-x: auto;
          margin-top: 0.5rem;
          font-size: 0.85em;
          font-family: 'SF Mono', 'Monaco', monospace;
        }
      </style>
      
      <div class="tmux-panel">
        <h3 style="margin: 0 0 1rem 0; color: #00bcd4; font-size: 1.3em; font-weight: 700;">
          🖥️ Tmux Orchestration
        </h3>
        <div class="tmux-status">
          <div class="status-indicator" id="tmux-status-light"></div>
          <div>
            <strong>Session:</strong> 
            <span id="tmux-session-name">tes-dev</span>
            <span id="tmux-status-text">Checking...</span>
          </div>
        </div>
        
        <div class="tmux-actions">
          <button class="tmux-btn" id="tmux-start-btn">▶️ Start</button>
          <button class="tmux-btn" id="tmux-attach-btn">📺 Attach</button>
          <button class="tmux-btn" id="tmux-kill-btn">⏹️ Stop</button>
        </div>
        
        <details id="tmux-pane-list">
          <summary>Pane Details</summary>
          <pre id="tmux-pane-output">Loading...</pre>
        </details>
      </div>
    `;
  }

  private setupEventListeners() {
    this.querySelector('#tmux-start-btn')?.addEventListener('click', () => this.handleStart());
    this.querySelector('#tmux-attach-btn')?.addEventListener('click', () => this.handleAttach());
    this.querySelector('#tmux-kill-btn')?.addEventListener('click', () => this.handleKill());
  }

  private async handleStart() {
    try {
      const response = await fetch('/api/dev/tmux/start', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        console.log('Tmux session started:', data.message);
        this.updateStatus(); // Refresh status
      } else {
        console.error('Failed to start tmux session:', data.error);
        alert(`Failed to start: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error starting tmux session:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async handleAttach() {
    alert('To attach to the tmux session, open your terminal and run:\n\ntmux attach-session -t tes-dev');
  }

  private async handleKill() {
    if (!confirm('Are you sure you want to stop the tmux session?')) return;
    
    try {
      const response = await fetch('/api/dev/tmux/stop', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        console.log('Tmux session stopped:', data.message);
        this.updateStatus(); // Refresh status
      } else {
        console.error('Failed to stop tmux session:', data.error);
        alert(`Failed to stop: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error stopping tmux session:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async updateStatus() {
    const statusLight = this.querySelector('#tmux-status-light')!;
    const statusText = this.querySelector('#tmux-status-text')!;
    const paneOutput = this.querySelector('#tmux-pane-output')!;
    
    try {
      const response = await fetch('/api/dev/tmux/status');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // ✅ Show syntax-highlighted error if available from server
        const errorPreview = errorData.debug || errorData.error || `HTTP ${response.status}`;
        statusLight.classList.remove('online');
        statusText.textContent = 'Error';
        paneOutput.textContent = errorPreview;
        this.updateButtonStates(false);
        return;
      }
      
      const status = await response.json();
      
      if (status.online) {
        statusLight.classList.add('online');
        statusText.textContent = 'online';
        paneOutput.textContent = status.panes?.map((p: any) => 
          `Pane ${p.index}: ${p.title || 'N/A'} (${p.command || 'N/A'})`
        ).join('\n') || 'No pane details';
        this.updateButtonStates(true);
      } else {
        statusLight.classList.remove('online');
        statusText.textContent = 'offline';
        paneOutput.textContent = status.error || 'No active session';
        this.updateButtonStates(false);
      }
    } catch (error: any) {
      // ✅ Enhanced error display with context
      statusLight.classList.remove('online');
      statusText.textContent = 'API error';
      const errorMessage = error.message || 'Could not fetch tmux status';
      const errorStack = error.stack ? `\n\nStack:\n${error.stack}` : '';
      paneOutput.textContent = `Error: ${errorMessage}${errorStack}`;
      this.updateButtonStates(false);
      
      // Also log to console for local dev
      console.error('[TmuxControlPanel] Status update failed:', error);
    }
  }
  
  private updateButtonStates(isOnline: boolean) {
    const startBtn = this.querySelector('#tmux-start-btn') as HTMLButtonElement;
    const attachBtn = this.querySelector('#tmux-attach-btn') as HTMLButtonElement;
    const killBtn = this.querySelector('#tmux-kill-btn') as HTMLButtonElement;
    
    if (startBtn) startBtn.disabled = isOnline;
    if (attachBtn) attachBtn.disabled = !isOnline;
    if (killBtn) killBtn.disabled = !isOnline;
  }
  
  private startStatusPolling() {
    // Update every 5 seconds
    this.intervalId = setInterval(() => this.updateStatus(), 5000) as unknown as number;
    this.updateStatus(); // Initial check
  }
}

customElements.define('tmux-control-panel', TmuxControlPanel);

