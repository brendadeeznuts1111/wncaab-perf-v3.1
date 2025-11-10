/**
 * Header Component Macro - Pure build-time HTML generation
 * 
 * Generates WNCAAB-themed header with version badge, git metadata,
 * and validated repository links. Zero runtime cost.
 * 
 * @module macros/header-macro
 */

import { DASHBOARD_META } from "./dashboard-meta.ts";
import { WNCAAB_COLORS, getContrastColor, hexToRgba } from "./color-macro.ts";

// Primary color from tension map (green-thin edge #80FF80)
// ✅ Using WNCAAB theme colors from color-macro.ts
const PRIMARY_HEX = WNCAAB_COLORS.primary;
const PRIMARY_DARK = WNCAAB_COLORS.primaryDark;
const CONTRAST_COLOR = getContrastColor(PRIMARY_HEX);
const LIVE_INDICATOR = WNCAAB_COLORS.liveIndicator;

export const generateHeader = () => `
<header class="dashboard-header" style="
  background: linear-gradient(135deg, ${PRIMARY_HEX} 0%, ${PRIMARY_DARK} 100%);
  color: ${CONTRAST_COLOR};
  padding: 1.5rem 2rem;
  border-radius: 12px 12px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  position: sticky;
  top: 0;
  z-index: 1000;
  backdrop-filter: blur(10px);
  border: 2px solid ${hexToRgba(PRIMARY_HEX, 0.25)};
  margin: -30px -30px 30px -30px;
">
  <div class="header-left">
    <h1 style="
      margin: 0;
      font-size: 1.8rem;
      font-weight: 900;
      letter-spacing: -1px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    ">
      🚀 WNCAAB Dev Server Dashboard
      <span class="live-indicator" style="
        display: inline-block;
        width: 8px;
        height: 8px;
        background: ${LIVE_INDICATOR};
        border-radius: 50%;
        animation: pulse 2s infinite;
        margin-left: 0.5rem;
      "></span>
    </h1>
    <p style="
      margin: 0.25rem 0 0 0;
      font-size: 0.9rem;
      opacity: 0.8;
      font-weight: 500;
    ">
      Unified API, Config, and Worker Telemetry Dashboard
    </p>
    <div class="git-meta" style="
      margin-top: 0.5rem;
      font-size: 0.75rem;
      opacity: 0.7;
      font-family: 'Courier New', monospace;
    ">
      <span>📌 ${DASHBOARD_META.git.branch}</span>
      <span style="margin-left: 1rem;">🔨 ${DASHBOARD_META.git.commit}</span>
      <span style="margin-left: 1rem;">🏗️ ${new Date(DASHBOARD_META.buildTime).toLocaleString()}</span>
    </div>
  </div>
  
  <div class="header-right" style="
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  ">
    <div class="version-badge" style="
      background: ${CONTRAST_COLOR};
      color: ${PRIMARY_HEX};
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 900;
      font-size: 1.1rem;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    ">
      v${DASHBOARD_META.version}
    </div>
    
    <nav class="header-links" style="
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    ">
      <a href="${DASHBOARD_META.urls.repo.url}" 
         class="header-link ${!DASHBOARD_META.urls.repo.valid ? 'invalid' : ''}"
         target="_blank" 
         rel="noopener noreferrer"
         title="View Repository"
         style="
           padding: 0.5rem 1rem;
           border-radius: 6px;
           transition: all 0.2s;
           text-decoration: none;
           color: inherit;
           display: flex;
           align-items: center;
           gap: 0.25rem;
           background: rgba(255,255,255,0.15);
           border: 1px solid rgba(255,255,255,0.2);
         ">
        📦 Repo
        ${!DASHBOARD_META.urls.repo.valid ? '⚠️' : ''}
      </a>
      <a href="${DASHBOARD_META.urls.issues.url}" 
         class="header-link ${!DASHBOARD_META.urls.issues.valid ? 'invalid' : ''}"
         target="_blank" 
         rel="noopener noreferrer"
         title="View Issues"
         style="
           padding: 0.5rem 1rem;
           border-radius: 6px;
           transition: all 0.2s;
           text-decoration: none;
           color: inherit;
           display: flex;
           align-items: center;
           gap: 0.25rem;
           background: rgba(255,255,255,0.15);
           border: 1px solid rgba(255,255,255,0.2);
         ">
        🐛 Issues
        ${!DASHBOARD_META.urls.issues.valid ? '⚠️' : ''}
      </a>
      <a href="${DASHBOARD_META.urls.prs.url}" 
         class="header-link ${!DASHBOARD_META.urls.prs.valid ? 'invalid' : ''}"
         target="_blank" 
         rel="noopener noreferrer"
         title="View Pull Requests"
         style="
           padding: 0.5rem 1rem;
           border-radius: 6px;
           transition: all 0.2s;
           text-decoration: none;
           color: inherit;
           display: flex;
           align-items: center;
           gap: 0.25rem;
           background: rgba(255,255,255,0.15);
           border: 1px solid rgba(255,255,255,0.2);
         ">
        🔀 PRs
        ${!DASHBOARD_META.urls.prs.valid ? '⚠️' : ''}
      </a>
    </nav>
  </div>
  
  <style>
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    
    .header-link:hover {
      background: rgba(255,255,255,0.25) !important;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    
    .header-link.invalid {
      opacity: 0.5;
      cursor: not-allowed;
      text-decoration: line-through;
    }
    
    .header-link.invalid:hover {
      background: rgba(255,255,255,0.15) !important;
      transform: none;
    }
    
    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
      
      .header-right {
        flex-direction: column;
        width: 100%;
      }
      
      .header-links {
        justify-content: center;
        width: 100%;
      }
    }
  </style>
</header>
`;

// Export for macro inlining
export const HEADER_HTML = generateHeader();

