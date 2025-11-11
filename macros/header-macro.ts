/**
 * Header Component Macro - Pure build-time HTML generation
 * 
 * Generates WNCAAB-themed header with version badge, git metadata,
 * and validated repository links. Zero runtime cost.
 * 
 * @module macros/header-macro
 */

import { DASHBOARD_META } from "./dashboard-meta.ts";
import { getColor, getContrastColor, hexToRgba } from "./color-macro.ts";

// Primary color from tension map (green-thin edge #80FF80)
// ✅ Using getColor() to track usage for monitoring system
const PRIMARY_HEX = getColor('primary');
const PRIMARY_DARK = getColor('primaryDark');
const CONTRAST_COLOR = getContrastColor(PRIMARY_HEX);
const LIVE_INDICATOR = getColor('liveIndicator');

export const generateHeader = () => {
  const buildDate = new Date(DASHBOARD_META.buildTime);
  const formattedDate = buildDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const formattedTime = buildDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  return `
<header class="dashboard-header" style="
  background: linear-gradient(135deg, ${PRIMARY_HEX} 0%, ${PRIMARY_DARK} 100%);
  color: ${CONTRAST_COLOR};
  padding: 2rem 2.5rem;
  border-radius: 16px 16px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  backdrop-filter: blur(20px) saturate(180%);
  border: 2px solid ${hexToRgba(PRIMARY_HEX, 0.3)};
  margin: -30px -30px 30px -30px;
  position: relative;
  overflow: hidden;
">
  <!-- Animated background pattern -->
  <div class="header-bg-pattern" style="
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0.1;
    background-image: 
      radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 0%, transparent 50%);
    pointer-events: none;
  "></div>
  
  <div class="header-left" style="position: relative; z-index: 1; flex: 1;">
    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
      <h1 style="
        margin: 0;
        font-size: 2rem;
        font-weight: 900;
        letter-spacing: -0.5px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        text-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">
        <span style="font-size: 1.5em; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🚀</span>
        <span>WNCAAB Dev Server Dashboard</span>
        <span class="live-indicator" style="
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          margin-left: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: rgba(255,255,255,0.2);
          border-radius: 12px;
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">
          <span style="
            display: inline-block;
            width: 6px;
            height: 6px;
            background: ${LIVE_INDICATOR};
            border-radius: 50%;
            animation: pulse 2s infinite;
            box-shadow: 0 0 8px ${LIVE_INDICATOR};
          "></span>
          Live
        </span>
      </h1>
    </div>
    <p style="
      margin: 0.5rem 0 0 0;
      font-size: 1rem;
      opacity: 0.95;
      font-weight: 500;
      line-height: 1.5;
      text-shadow: 0 1px 4px rgba(0,0,0,0.1);
    ">
      Unified API, Config, and Worker Telemetry Dashboard
    </p>
    <div class="git-meta" style="
      margin-top: 1rem;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      font-size: 0.8rem;
      opacity: 0.85;
      font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
    ">
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        background: rgba(255,255,255,0.15);
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
      ">
        <span style="font-size: 0.9em;">📌</span>
        <span style="font-weight: 600;">${DASHBOARD_META.git.branch}</span>
      </div>
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        background: rgba(255,255,255,0.15);
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
      ">
        <span style="font-size: 0.9em;">🔨</span>
        <span style="font-weight: 600; font-family: 'SF Mono', monospace;">${DASHBOARD_META.git.commit}</span>
      </div>
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        background: rgba(255,255,255,0.15);
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.2);
        backdrop-filter: blur(10px);
      ">
        <span style="font-size: 0.9em;">🏗️</span>
        <span style="font-weight: 600;">${formattedDate}</span>
        <span style="opacity: 0.8;">${formattedTime}</span>
      </div>
    </div>
  </div>
  
  <div class="header-right" style="
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
    position: relative;
    z-index: 1;
  ">
    <div class="version-badge" style="
      background: linear-gradient(135deg, ${CONTRAST_COLOR} 0%, ${hexToRgba(CONTRAST_COLOR, 0.9)} 100%);
      color: ${PRIMARY_HEX};
      padding: 0.625rem 1.25rem;
      border-radius: 12px;
      font-weight: 900;
      font-size: 1.15rem;
      font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
      letter-spacing: 1.5px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3);
      border: 2px solid ${hexToRgba(PRIMARY_HEX, 0.2)};
      text-transform: uppercase;
      transition: all 0.3s ease;
    ">
      v${DASHBOARD_META.version}
    </div>
    
    <nav class="header-links" style="
      display: flex;
      gap: 0.625rem;
      flex-wrap: wrap;
      justify-content: flex-end;
    ">
      <a href="${DASHBOARD_META.urls.repo.url}" 
         class="header-link ${!DASHBOARD_META.urls.repo.valid ? 'invalid' : ''}"
         target="_blank" 
         rel="noopener noreferrer"
         title="View Repository on GitHub"
         style="
           padding: 0.625rem 1.125rem;
           border-radius: 10px;
           transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
           text-decoration: none;
           color: inherit;
           display: inline-flex;
           align-items: center;
           gap: 0.5rem;
           background: rgba(255,255,255,0.18);
           border: 1.5px solid rgba(255,255,255,0.25);
           backdrop-filter: blur(10px);
           font-weight: 600;
           font-size: 0.9rem;
         ">
        <span style="font-size: 1.1em;">📦</span>
        <span>Repo</span>
        ${!DASHBOARD_META.urls.repo.valid ? '<span style="opacity: 0.7;">⚠️</span>' : ''}
      </a>
      <a href="${DASHBOARD_META.urls.issues.url}" 
         class="header-link ${!DASHBOARD_META.urls.issues.valid ? 'invalid' : ''}"
         target="_blank" 
         rel="noopener noreferrer"
         title="View Issues on GitHub"
         style="
           padding: 0.625rem 1.125rem;
           border-radius: 10px;
           transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
           text-decoration: none;
           color: inherit;
           display: inline-flex;
           align-items: center;
           gap: 0.5rem;
           background: rgba(255,255,255,0.18);
           border: 1.5px solid rgba(255,255,255,0.25);
           backdrop-filter: blur(10px);
           font-weight: 600;
           font-size: 0.9rem;
         ">
        <span style="font-size: 1.1em;">🐛</span>
        <span>Issues</span>
        ${!DASHBOARD_META.urls.issues.valid ? '<span style="opacity: 0.7;">⚠️</span>' : ''}
      </a>
      <a href="${DASHBOARD_META.urls.prs.url}" 
         class="header-link ${!DASHBOARD_META.urls.prs.valid ? 'invalid' : ''}"
         target="_blank" 
         rel="noopener noreferrer"
         title="View Pull Requests on GitHub"
         style="
           padding: 0.625rem 1.125rem;
           border-radius: 10px;
           transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
           text-decoration: none;
           color: inherit;
           display: inline-flex;
           align-items: center;
           gap: 0.5rem;
           background: rgba(255,255,255,0.18);
           border: 1.5px solid rgba(255,255,255,0.25);
           backdrop-filter: blur(10px);
           font-weight: 600;
           font-size: 0.9rem;
         ">
        <span style="font-size: 1.1em;">🔀</span>
        <span>PRs</span>
        ${!DASHBOARD_META.urls.prs.valid ? '<span style="opacity: 0.7;">⚠️</span>' : ''}
      </a>
    </nav>
  </div>
  
  <style>
    @keyframes pulse {
      0%, 100% { 
        opacity: 1; 
        transform: scale(1);
      }
      50% { 
        opacity: 0.6; 
        transform: scale(1.1);
      }
    }
    
    .version-badge:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4) !important;
    }
    
    .header-link {
      position: relative;
    }
    
    .header-link::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%);
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    
    .header-link:hover {
      background: rgba(255,255,255,0.28) !important;
      border-color: rgba(255,255,255,0.4) !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .header-link:hover::before {
      opacity: 1;
    }
    
    .header-link:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    
    .header-link.invalid {
      opacity: 0.5;
      cursor: not-allowed;
      text-decoration: line-through;
      position: relative;
    }
    
    .header-link.invalid::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 2px;
      background: currentColor;
      opacity: 0.5;
    }
    
    .header-link.invalid:hover {
      background: rgba(255,255,255,0.15) !important;
      transform: none;
      box-shadow: none;
    }
    
    .header-link.invalid:hover::before {
      opacity: 0;
    }
    
    @media (max-width: 968px) {
      .dashboard-header {
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem 2rem;
      }
      
      .header-left h1 {
        font-size: 1.6rem !important;
      }
      
      .header-right {
        align-items: flex-start !important;
        width: 100%;
      }
      
      .header-links {
        justify-content: flex-start !important;
        width: 100%;
      }
      
      .git-meta {
        flex-direction: column;
        align-items: flex-start !important;
        gap: 0.5rem !important;
      }
    }
    
    @media (max-width: 640px) {
      .dashboard-header {
        padding: 1.25rem 1.5rem;
      }
      
      .header-left h1 {
        font-size: 1.4rem !important;
        flex-wrap: wrap;
      }
      
      .header-left h1 .live-indicator {
        margin-left: 0 !important;
        margin-top: 0.5rem;
      }
      
      .version-badge {
        font-size: 1rem !important;
        padding: 0.5rem 1rem !important;
      }
      
      .header-link {
        font-size: 0.85rem !important;
        padding: 0.5rem 0.875rem !important;
      }
    }
  </style>
</header>
`;
};

// Export for macro inlining
export const HEADER_HTML = generateHeader();

