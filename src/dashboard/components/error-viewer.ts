/**
 * @component ErrorViewerModal
 * @description Displays syntax-highlighted errors with context in dashboard
 * @ticket TES-OPS-004.B.8.15
 */

import type { ErrorContext } from '../../lib/tes-error-inspector.ts';

export class ErrorViewerModal extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  /**
   * Show error modal with inspected error
   */
  show(error: unknown, context: ErrorContext = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    // Format error preview (client-side version - server provides full inspection)
    const errorPreview = this.formatErrorPreview(errorMessage, errorStack, context);
    
    this.shadow.innerHTML = `
      <style>
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 2rem;
        }
        
        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          position: relative;
        }
        
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e0e0e0;
        }
        
        .modal-header h3 {
          margin: 0;
          color: #dc3545;
          font-size: 1.5em;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .error-preview {
          background: #1a1a1a;
          color: #00ff00;
          padding: 1.5rem;
          border-radius: 8px;
          font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
          font-size: 0.9em;
          line-height: 1.6;
          overflow-x: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin-bottom: 1rem;
        }
        
        details {
          margin-top: 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
          background: #f8f9fa;
        }
        
        summary {
          cursor: pointer;
          font-weight: 600;
          color: #00bcd4;
          padding: 0.5rem;
          user-select: none;
        }
        
        summary:hover {
          background: #e9ecef;
          border-radius: 4px;
        }
        
        .context-preview {
          background: white;
          padding: 1rem;
          border-radius: 4px;
          margin-top: 0.5rem;
          font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
          font-size: 0.85em;
          white-space: pre-wrap;
          overflow-x: auto;
        }
        
        .modal-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e0e0e0;
        }
        
        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.95em;
        }
        
        .btn-primary {
          background: #00bcd4;
          color: white;
        }
        
        .btn-primary:hover {
          background: #00acc1;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 188, 212, 0.3);
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover {
          background: #5a6268;
        }
        
        .close-btn {
          background: transparent;
          border: none;
          font-size: 1.5em;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        
        .close-btn:hover {
          background: #f0f0f0;
          color: #333;
        }
      </style>
      
      <div class="modal-backdrop">
        <div class="modal-content">
          <div class="modal-header">
            <h3>❌ Operational Error</h3>
            <button class="close-btn" id="close-modal" title="Close">×</button>
          </div>
          
          <pre class="error-preview">${this.escapeHtml(errorPreview)}</pre>
          
          ${Object.keys(context).length > 0 ? `
            <details>
              <summary>Telemetry Data</summary>
              <div class="context-preview">${this.escapeHtml(JSON.stringify(context, null, 2))}</div>
            </details>
          ` : ''}
          
          <div class="modal-actions">
            <button class="btn btn-primary" id="copy-error">📋 Copy to Clipboard</button>
            <button class="btn btn-secondary" id="close-modal-btn">Close</button>
          </div>
        </div>
      </div>
    `;
    
    // Setup event listeners
    const copyBtn = this.shadow.querySelector('#copy-error');
    const closeBtn = this.shadow.querySelector('#close-modal');
    const closeBtn2 = this.shadow.querySelector('#close-modal-btn');
    
    copyBtn?.addEventListener('click', () => {
      const fullError = `${errorPreview}\n\nContext:\n${JSON.stringify(context, null, 2)}`;
      navigator.clipboard.writeText(fullError).then(() => {
        const btn = copyBtn as HTMLButtonElement;
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    });
    
    const closeModal = () => {
      this.remove();
    };
    
    closeBtn?.addEventListener('click', closeModal);
    closeBtn2?.addEventListener('click', closeModal);
    
    // Close on backdrop click
    const backdrop = this.shadow.querySelector('.modal-backdrop');
    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal();
      }
    });
  }
  
  /**
   * Format error preview for display
   */
  private formatErrorPreview(message: string, stack: string, context: ErrorContext): string {
    let preview = `Error: ${message}\n`;
    
    if (context.route) {
      preview += `Route: ${context.route}\n`;
    }
    
    if (context.component) {
      preview += `Component: ${context.component}\n`;
    }
    
    if (stack) {
      preview += `\nStack Trace:\n${stack}`;
    }
    
    if (context.metrics && Object.keys(context.metrics).length > 0) {
      preview += `\n\nMetrics:\n${JSON.stringify(context.metrics, null, 2)}`;
    }
    
    return preview;
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('error-viewer-modal', ErrorViewerModal);

