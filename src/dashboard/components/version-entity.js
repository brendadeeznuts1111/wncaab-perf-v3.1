/**
 * TES-OPS-004.B.8: Enhanced Version Entity Component with Cryptographic Signing
 * 
 * Displays version entities with cryptographic signature verification badges.
 * Integrates with Durable Objects backend for signed version bumps.
 * 
 * @module src/dashboard/components/version-entity
 */

// Escape HTML helper (matches Bun.escapeHTML behavior)
function escapeHtml(text) {
  if (text == null) return '';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Custom Element for version entity cards with cryptographic verification
 * Encapsulates rendering logic and displays signature status
 */
class VersionEntity extends HTMLElement {
  constructor() {
    super();
    this.entity = null;
    this.signature = null;
    this.signatureValid = null;
    this.attachShadow({ mode: 'open' });
  }
  
  static get observedAttributes() {
    return ['data-entity-id', 'data-entity-type', 'data-update-strategy', 'data-error', 'data-signature', 'data-signature-valid'];
  }
  
  connectedCallback() {
    this.render();
  }
  
  attributeChangedCallback() {
    this.render();
  }
  
  /**
   * Set entity data and update attributes
   * @param {Object} entity - Entity data object
   * @param {string|null} signature - Cryptographic signature (optional)
   * @param {boolean|null} signatureValid - Whether signature is valid (optional)
   */
  setEntity(entity, signature = null, signatureValid = null) {
    this.entity = entity;
    this.signature = signature;
    this.signatureValid = signatureValid;
    
    this.setAttribute('data-tes-entity-id', escapeHtml(entity.id));
    this.setAttribute('data-tes-entity-type', escapeHtml(entity.type));
    this.setAttribute('data-tes-update-strategy', escapeHtml(entity.updateStrategy));
    
    if (entity.versionError) {
      this.setAttribute('data-tes-error', 'true');
    } else {
      this.removeAttribute('data-tes-error');
    }
    
    if (signature) {
      this.setAttribute('data-tes-signature', escapeHtml(signature));
    }
    
    if (signatureValid !== null) {
      this.setAttribute('data-tes-signature-valid', signatureValid ? 'true' : 'false');
    }
    
    this.render();
  }
  
  /**
   * Render the entity card with signature verification badge
   */
  render() {
    if (!this.entity) return;
    
    const version = this.entity.currentVersion || 'N/A';
    const versionError = this.entity.versionError;
    const isLinked = this.entity.updateStrategy === 'linked-to-parent';
    const parentInfo = this.entity.parentVersionId ? ` (linked to ${this.entity.parentVersionId})` : '';
    const strategyBadge = isLinked 
      ? '<span class="tes-strategy-badge tes-strategy-linked">LINKED</span>'
      : '<span class="tes-strategy-badge tes-strategy-independent">INDEPENDENT</span>';
    
    // TES-OPS-004.B.4: Cryptographic signature badge
    let signatureBadge = '';
    if (this.signature !== null) {
      const isValid = this.signatureValid === true;
      const badgeClass = isValid ? 'tes-sig-valid' : 'tes-sig-invalid';
      const badgeIcon = isValid ? '🔒' : '⚠️';
      const badgeText = isValid ? 'SIGNED' : 'INVALID';
      signatureBadge = `
        <span class="tes-signature-badge ${badgeClass}" title="${isValid ? 'Cryptographically verified' : 'Signature verification failed'}">
          ${badgeIcon} ${badgeText}
        </span>
      `;
    } else {
      // No signature available (legacy or unsigned)
      signatureBadge = `
        <span class="tes-signature-badge tes-sig-none" title="No cryptographic signature available">
          🔓 UNSIGNED
        </span>
      `;
    }
    
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
          }
          .tes-entity-card {
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px;
            transition: box-shadow 0.2s, transform 0.2s;
            position: relative;
          }
          .tes-entity-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transform: translateY(-2px);
          }
          .tes-entity-card-content {
            margin-bottom: 12px;
          }
          .tes-entity-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            flex-wrap: wrap;
            gap: 8px;
          }
          .tes-entity-name {
            font-weight: 600;
            font-size: 1em;
            color: #333;
          }
          .tes-entity-version {
            font-size: 1.2em;
            font-weight: 700;
            color: #28a745;
            font-family: 'SF Mono', monospace;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
          }
          .tes-entity-version-error {
            color: #dc3545;
          }
          .tes-entity-parent {
            font-size: 0.85em;
            color: #666;
            margin-top: 4px;
          }
          .tes-strategy-badge {
            font-size: 0.7em;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .tes-strategy-linked {
            background: #e3f2fd;
            color: #1976d2;
          }
          .tes-strategy-independent {
            background: #fff3e0;
            color: #f57c00;
          }
          .tes-signature-badge {
            font-size: 0.65em;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .tes-sig-valid {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .tes-sig-invalid {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }
          .tes-sig-none {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
          }
          .tes-entity-card-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 12px;
          }
          .tes-bump-btn {
            padding: 6px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #f8f9fa;
            cursor: pointer;
            font-size: 0.85em;
            font-weight: 600;
            transition: background 0.2s;
          }
          .tes-bump-btn:hover {
            background: #e9ecef;
          }
          .tes-bump-patch {
            color: #28a745;
          }
          .tes-bump-minor {
            color: #007bff;
          }
          .tes-bump-major {
            color: #dc3545;
          }
        </style>
        <div class="tes-entity-card">
          <div class="tes-entity-card-content">
            <div class="tes-entity-card-header">
              <span class="tes-entity-name">${escapeHtml(this.entity.displayName || this.entity.id)}</span>
              <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                ${strategyBadge}
                ${signatureBadge}
              </div>
            </div>
            <div class="tes-entity-version ${versionError ? 'tes-entity-version-error' : ''}">
              ${versionError ? '❌ Error: ' + escapeHtml(versionError) : 'v' + escapeHtml(version)}
            </div>
            ${parentInfo ? '<div class="tes-entity-parent">' + escapeHtml(parentInfo) + '</div>' : ''}
          </div>
          <div class="tes-entity-card-actions">
            <button class="tes-bump-btn tes-bump-patch" 
                    data-tes-entity-id="${escapeHtml(this.entity.id)}"
                    data-tes-bump-type="patch"
                    title="Bump patch version (cryptographically signed)">
              +P
            </button>
            <button class="tes-bump-btn tes-bump-minor" 
                    data-tes-entity-id="${escapeHtml(this.entity.id)}"
                    data-tes-bump-type="minor"
                    title="Bump minor version (cryptographically signed)">
              +M
            </button>
            <button class="tes-bump-btn tes-bump-major" 
                    data-tes-entity-id="${escapeHtml(this.entity.id)}"
                    data-tes-bump-type="major"
                    title="Bump major version (cryptographically signed)">
              +MJ
            </button>
          </div>
        </div>
      `;
    }
  }
}

// Register Custom Element (only once)
if (!customElements.get('version-entity')) {
  customElements.define('version-entity', VersionEntity);
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VersionEntity;
}
