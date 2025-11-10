/**
 * Tension Controller - Client-side JavaScript for Macro-Rendered Page (v1.4.2)
 * 
 * Handles real-time updates using precomputed states (no fetch, no API calls).
 * Uses Map for O(1) lookup performance.
 */

(function() {
  'use strict';
  
  // Load pre-generated states from script tag
  let STATES = [];
  let STATE_MAP = new Map();
  
  try {
    const statesScript = document.getElementById('tension-states');
    if (statesScript && statesScript.textContent) {
      STATES = JSON.parse(statesScript.textContent);
      STATE_MAP = new Map(STATES.map(s => [s.key, s]));
      console.log(`✅ Loaded ${STATES.length} precomputed states (Map size: ${STATE_MAP.size})`);
    } else {
      console.error('❌ Tension states script tag not found');
    }
  } catch (e) {
    console.error('❌ Could not load precomputed states:', e);
  }
  
  // Validation helper (handles 0.7-.0012 edge case)
  function validateThreshold(value) {
    // Auto-correct arithmetic expressions
    if (value.includes('-') && value.match(/^\d+\.\d+-\.\d+$/)) {
      const [a, b] = value.split('-');
      const result = parseFloat(a) - parseFloat(b);
      console.warn(`⚠️  Auto-corrected ${value} → ${result.toFixed(4)}`);
      return Math.max(0, Math.min(1, result));
    }
    
    // Strict validation
    if (!/^\d*\.?\d+$/.test(value)) {
      throw new Error(`❌ Invalid threshold: "${value}"`);
    }
    
    return parseFloat(value);
  }
  
  // Get contrast color (black or white) for text readability
  function getContrastColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#1e293b' : '#f8fafc';
  }
  
  // Copy to clipboard helper
  async function copyToClipboard(text, element) {
    try {
      await navigator.clipboard.writeText(text);
      const original = element.textContent;
      element.textContent = '✅ Copied!';
      element.style.color = '#28a745';
      setTimeout(() => {
        element.textContent = original;
        element.style.color = '';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        const original = element.textContent;
        element.textContent = '✅ Copied!';
        element.style.color = '#28a745';
        setTimeout(() => {
          element.textContent = original;
          element.style.color = '';
        }, 2000);
      } catch (e) {
        alert('Failed to copy. Please copy manually: ' + text);
      }
      document.body.removeChild(textArea);
    }
  }
  
  // Update visualization (no API call, uses precomputed states)
  function updateVisualization() {
    try {
      const conflictRaw = document.getElementById('conflict-slider').value / 100;
      const entropyRaw = document.getElementById('entropy-slider').value / 100;
      const tensionRaw = document.getElementById('tension-slider').value / 100;
      
      // Round to nearest step (0-10) for Map lookup
      const conflict = Math.round(conflictRaw * 10);
      const entropy = Math.round(entropyRaw * 10);
      const tension = Math.round(tensionRaw * 10);
      
      // Update slider value displays
      document.getElementById('conflict-value').textContent = conflictRaw.toFixed(2);
      document.getElementById('entropy-value').textContent = entropyRaw.toFixed(2);
      document.getElementById('tension-value').textContent = tensionRaw.toFixed(2);
      
      const key = `${conflict}-${entropy}-${tension}`;
      const data = STATE_MAP.get(key);
      
      if (!data) {
        console.error(`❌ State not found: ${key}`);
        return;
      }
      
      // Update DOM with macro data (no API call)
      const hexUpper = data.hexUpper;
      const opacityPercent = data.opacity * 100;
      
      // Update CSS custom properties
      document.documentElement.style.setProperty('--tension-hex', hexUpper);
      document.documentElement.style.setProperty('--tension-opacity', data.opacity);
      document.documentElement.style.setProperty('--tension-width', `${data.width}px`);
      
      // Update hex display
      const hexDisplay = document.getElementById('hex-display');
      const hexValue = document.getElementById('hex-value');
      if (hexValue) {
        hexValue.textContent = hexUpper;
        hexValue.style.color = hexUpper;
      } else {
        // Fallback if structure is different
        hexDisplay.innerHTML = `
          <span class="label">HEX</span>
          <span class="value" id="hex-value">${hexUpper}</span>
          <span class="hex-swatch" id="hex-swatch" style="background: ${hexUpper}; border-color: ${getContrastColor(hexUpper)};"></span>
        `;
      }
      
      // Update hex swatch
      const hexSwatch = document.getElementById('hex-swatch');
      if (hexSwatch) {
        hexSwatch.style.background = hexUpper;
        hexSwatch.style.borderColor = getContrastColor(hexUpper);
      }
      
      // Update hex display border
      hexDisplay.style.borderColor = hexUpper;
      
      // Update opacity display
      const opacityValue = document.getElementById('opacity-value');
      if (opacityValue) {
        opacityValue.textContent = `${opacityPercent.toFixed(1)}%`;
        opacityValue.style.color = hexUpper;
      }
      
      const opacityFill = document.getElementById('opacity-fill');
      if (opacityFill) {
        opacityFill.style.width = `${opacityPercent}%`;
        opacityFill.style.background = hexUpper;
      }
      
      // Update opacity display border
      const opacityDisplay = document.querySelector('.opacity-display-enhanced');
      if (opacityDisplay) {
        opacityDisplay.style.borderColor = hexUpper;
      }
      
      // Update width display if it exists
      const widthDisplay = document.getElementById('width-display');
      if (widthDisplay) {
        widthDisplay.textContent = `${data.width}px`;
      }
      
      // Update relation badge if it exists
      const badge = document.getElementById('relation-badge');
      if (badge) {
        badge.textContent = data.meta.relation;
        badge.className = `relation-badge relation-${data.meta.relation}`;
        badge.style.borderColor = hexUpper;
      }
      
    } catch (error) {
      console.error('❌ Failed to update visualization:', error);
    }
  }
  
  // Copy hex to clipboard
  function copyHexToClipboard() {
    const hexValue = document.getElementById('hex-value');
    if (hexValue) {
      const hex = hexValue.textContent.trim();
      copyToClipboard(hex, hexValue);
    }
  }
  
  // Initialize event listeners
  document.addEventListener('DOMContentLoaded', function() {
    // Slider change handlers
    const conflictSlider = document.getElementById('conflict-slider');
    const entropySlider = document.getElementById('entropy-slider');
    const tensionSlider = document.getElementById('tension-slider');
    
    if (conflictSlider) {
      conflictSlider.addEventListener('input', updateVisualization);
    }
    if (entropySlider) {
      entropySlider.addEventListener('input', updateVisualization);
    }
    if (tensionSlider) {
      tensionSlider.addEventListener('input', updateVisualization);
    }
    
    // Copy to clipboard on hex display click
    const hexDisplay = document.getElementById('hex-display');
    if (hexDisplay) {
      hexDisplay.addEventListener('click', copyHexToClipboard);
    }
    
    const hexSwatch = document.getElementById('hex-swatch');
    if (hexSwatch) {
      hexSwatch.addEventListener('click', copyHexToClipboard);
    }
    
    // Initial update
    updateVisualization();
  });
})();


