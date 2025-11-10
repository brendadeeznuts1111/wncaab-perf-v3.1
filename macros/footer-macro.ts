/**
 * Footer Component Macro - Build-time HTML generation
 * 
 * Generates WNCAAB-themed footer with build metadata and validated links.
 * Zero runtime cost.
 * 
 * @module macros/footer-macro
 */

import { DASHBOARD_META } from "./dashboard-meta.ts";

export const generateFooter = () => `
<footer class="dashboard-footer" style="
  background: #0f172a;
  color: #94a3b8;
  padding: 1.5rem 2rem;
  border-radius: 0 0 12px 12px;
  border-top: 2px solid #80FF8040;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  margin: 40px -30px -30px -30px;
  flex-wrap: wrap;
  gap: 1rem;
">
  <div class="footer-left">
    <p style="margin: 0; font-weight: 700; color: #f8fafc; margin-bottom: 0.25rem;">
      ${DASHBOARD_META.repo.name}
    </p>
    <p style="margin: 0;">
      Powered by 
      <a href="https://bun.sh" target="_blank" rel="noopener" style="color: #fbbf24; font-weight: 600; text-decoration: none;">Bun</a>
      and <span style="color: #80FF80; font-weight: 600;">Tension Mapping Macros</span>
    </p>
    <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; opacity: 0.6;">
      Macro-forged at ${new Date(DASHBOARD_META.buildTime).toLocaleString()}
    </p>
    <p style="margin: 0.25rem 0 0 0; font-size: 0.75rem; opacity: 0.6;">
      Version ${DASHBOARD_META.version} • ${new Date().getFullYear()} WNCAAB Syndicate
    </p>
  </div>
  
  <div class="footer-right" style="
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  ">
    <a href="${DASHBOARD_META.urls.repo.url}" 
       target="_blank" 
       rel="noopener noreferrer"
       style="color: #94a3b8; text-decoration: none; padding: 0.5rem; border-radius: 6px; transition: all 0.2s; display: flex; align-items: center; gap: 0.25rem;">
      📦 Repository
    </a>
    <a href="${DASHBOARD_META.urls.issues.url}" 
       target="_blank" 
       rel="noopener noreferrer"
       style="color: #94a3b8; text-decoration: none; padding: 0.5rem; border-radius: 6px; transition: all 0.2s; display: flex; align-items: center; gap: 0.25rem;">
      🐛 Issues
    </a>
    <a href="${DASHBOARD_META.urls.prs.url}" 
       target="_blank" 
       rel="noopener noreferrer"
       style="color: #94a3b8; text-decoration: none; padding: 0.5rem; border-radius: 6px; transition: all 0.2s; display: flex; align-items: center; gap: 0.25rem;">
      🔀 Pull Requests
    </a>
    <a href="${DASHBOARD_META.urls.changelog.url}" 
       target="_blank" 
       rel="noopener noreferrer"
       class="${!DASHBOARD_META.urls.changelog.valid ? 'invalid' : ''}"
       title="View Changelog"
       style="color: #94a3b8; text-decoration: none; padding: 0.5rem; border-radius: 6px; transition: all 0.2s; display: flex; align-items: center; gap: 0.25rem;">
      📝 Changelog
      ${!DASHBOARD_META.urls.changelog.valid ? '⚠️' : ''}
    </a>
    <a href="/api/dev/status" 
       target="_blank" 
       rel="noopener noreferrer"
       style="color: #80FF80; font-weight: 600; text-decoration: none; padding: 0.5rem; border-radius: 6px; transition: all 0.2s; display: flex; align-items: center; gap: 0.25rem;">
      📊 API Status
    </a>
  </div>
  
  <style>
    .dashboard-footer a:hover {
      color: #f8fafc !important;
      background: rgba(255,255,255,0.1);
      transform: translateY(-1px);
    }
    
    .dashboard-footer a.invalid {
      opacity: 0.5;
      cursor: not-allowed;
      text-decoration: line-through;
    }
    
    .dashboard-footer a.invalid:hover {
      background: transparent !important;
      transform: none;
    }
    
    @media (max-width: 768px) {
      .dashboard-footer {
        flex-direction: column;
        text-align: center;
      }
      
      .footer-right {
        justify-content: center;
        width: 100%;
      }
    }
  </style>
</footer>
`;

export const FOOTER_HTML = generateFooter();

