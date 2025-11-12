/**
 * Glossary Search Component - React/JSX Version
 * Uses Bun's native JSX support (no React import needed for JSX transform)
 * 
 * SSR + React Architecture:
 * 1. Server-side: HTMLRewriter injects initial data into HTML
 * 2. Client-side: React component hydrates from data attributes
 * 3. Benefits: Fast initial render, SEO-friendly, progressive enhancement
 * 
 * Bun Native Features:
 * - Native JSX transform (no React runtime needed)
 * - TypeScript strict mode
 * - HTML imports for automatic bundling
 * - HMR support in development
 */

import { render } from 'react-dom/client';

// TypeScript strict mode interfaces
interface GlossaryTerm {
  readonly id: string;
  readonly term: string;
  readonly abbreviation?: string;
  readonly category: string;
  readonly definition: string;
  readonly examples?: readonly string[];
  readonly complexity?: 'basic' | 'intermediate' | 'advanced';
}

interface SearchConfig {
  readonly searchInput: HTMLElement;
  readonly suggestions: HTMLElement;
  readonly results: HTMLElement;
  readonly stats: {
    readonly total: HTMLElement;
    readonly betTypes: HTMLElement;
    readonly rgTerms: HTMLElement;
  };
}

const CATEGORY_COLORS: Readonly<Record<string, string>> = {
  'bet-types': '#667eea',
  'markets': '#f093fb',
  'odds': '#4facfe',
  'general': '#43e97b',
  'rg_compliance': '#fa709a'
} as const;

// React component for term card
function TermCard({ term }: { term: GlossaryTerm }) {
  const color = CATEGORY_COLORS[term.category] ?? '#667eea';
  
  return (
    <div className="term-card" style={{ borderLeftColor: color }}>
      <div className="term-header">
        <div className="term-name">
          {term.term}
          {term.abbreviation && (
            <span style={{ color: '#666', fontWeight: 'normal' }}>
              {' '}({term.abbreviation})
            </span>
          )}
        </div>
        <span className="category-badge" style={{ background: color }}>
          {term.category.replace('_', ' ')}
        </span>
      </div>
      <p style={{ margin: '8px 0', color: '#555', lineHeight: 1.5 }}>
        {term.definition}
      </p>
      {term.examples && term.examples.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <strong style={{ color: '#666', fontSize: '12px' }}>Examples:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#777', fontSize: '13px' }}>
            {term.examples.map((ex, i) => (
              <li key={i}>{ex}</li>
            ))}
          </ul>
        </div>
      )}
      {term.complexity && (
        <div style={{ marginTop: '8px' }}>
          <span style={{
            background: '#e9ecef',
            color: '#495057',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '11px'
          }}>
            {term.complexity.charAt(0).toUpperCase() + term.complexity.slice(1)} Level
          </span>
        </div>
      )}
    </div>
  );
}

// React component for search results
function SearchResults({ terms, keyword, count }: { 
  terms: readonly GlossaryTerm[];
  keyword: string;
  count: number;
}) {
  if (terms.length === 0) {
    return (
      <div className="loading">
        <h3>No Results Found</h3>
        <p>No terms found matching "{keyword}"</p>
        <p style={{ marginTop: '20px', color: '#999' }}>
          Try: parlay, spread, moneyline, vig, or steam
        </p>
      </div>
    );
  }

  return (
    <>
      <h3 style={{ marginBottom: '20px' }}>🔍 Search Results: "{keyword}"</h3>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Found <strong>{count}</strong> matching term{count !== 1 ? 's' : ''}
      </p>
      {terms.map(term => (
        <TermCard key={term.id} term={term} />
      ))}
    </>
  );
}

export class GlossarySearch {
  private readonly config: SearchConfig;
  private debounceTimer?: number;
  private abortController?: AbortController;
  private resultsRoot?: ReturnType<typeof render>;

  constructor(config: SearchConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    await this.loadStats();
    this.attachListeners();
    
    // Initialize React root for results container
    const resultsContainer = this.config.results;
    if (resultsContainer) {
      this.resultsRoot = render(resultsContainer, null);
    }
  }

  private attachListeners(): void {
    const input = this.config.searchInput as HTMLInputElement;
    
    input.addEventListener('keyup', (e: KeyboardEvent) => {
      this.handleInput(e);
    });

    document.addEventListener('click', (e: MouseEvent) => {
      if (!this.config.suggestions.contains(e.target as Node) && 
          e.target !== input) {
        this.config.suggestions.style.display = 'none';
      }
    });

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.performSearch(input.value.trim());
      }
    });
  }

  private async handleInput(event: KeyboardEvent): Promise<void> {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();

    if (this.abortController) {
      this.abortController.abort();
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (event.key === 'Escape') {
      this.config.suggestions.style.display = 'none';
      return;
    }

    if (!query || query.length < 2) {
      this.config.suggestions.style.display = 'none';
      return;
    }

    this.debounceTimer = setTimeout(async () => {
      await this.loadSuggestions(query);
    }, 300) as unknown as number;
  }

  private async loadSuggestions(query: string): Promise<void> {
    try {
      this.abortController = new AbortController();
      const response = await fetch(
        `/api/glossary/suggestions?q=${encodeURIComponent(query)}&limit=8`,
        { signal: this.abortController.signal }
      );
      
      if (!response.ok) return;
      
      const data = await response.json() as { suggestions?: readonly string[] };
      
      if (data.suggestions && data.suggestions.length > 0) {
        this.renderSuggestions(data.suggestions);
        this.config.suggestions.style.display = 'block';
      } else {
        this.config.suggestions.style.display = 'none';
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to load suggestions:', error);
      }
    }
  }

  private renderSuggestions(suggestions: readonly string[]): void {
    this.config.suggestions.innerHTML = suggestions.map(s => `
      <div class="suggestion-item" onclick="window.glossarySearch?.selectSuggestion('${s.replace(/'/g, "\\'")}')">
        ${s}
      </div>
    `).join('');
  }

  selectSuggestion(term: string): void {
    const input = this.config.searchInput as HTMLInputElement;
    input.value = term;
    this.config.suggestions.style.display = 'none';
    this.performSearch(term);
  }

  private async performSearch(keyword: string): Promise<void> {
    if (!keyword.trim()) return;

    if (this.resultsRoot) {
      this.resultsRoot.render(<div className="loading">🔍 Searching...</div>);
    }

    try {
      const response = await fetch(
        `/api/glossary/search?keyword=${encodeURIComponent(keyword)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as { 
        terms?: readonly GlossaryTerm[];
        count?: number;
      };
      
      const terms = data.terms ?? [];
      const count = data.count ?? 0;
      
      if (this.resultsRoot) {
        this.resultsRoot.render(
          <SearchResults terms={terms} keyword={keyword} count={count} />
        );
      }
    } catch (error) {
/**
 * Glossary Search Component - React/JSX Version
 * Uses Bun's native JSX support (no React import needed for JSX transform)
 * TypeScript strict mode enabled
 */

// For Bun's JSX transform, we need React types but not the runtime
// Bun automatically handles JSX transformation
import type { ReactNode } from 'react';

// TypeScript strict mode interfaces
interface GlossaryTerm {
  readonly id: string;
  readonly term: string;
  readonly abbreviation?: string;
  readonly category: string;
  readonly definition: string;
  readonly examples?: readonly string[];
  readonly complexity?: 'basic' | 'intermediate' | 'advanced';
}

interface SearchConfig {
  readonly searchInput: HTMLElement;
  readonly suggestions: HTMLElement;
  readonly results: HTMLElement;
  readonly stats: {
    readonly total: HTMLElement;
    readonly betTypes: HTMLElement;
    readonly rgTerms: HTMLElement;
  };
}

const CATEGORY_COLORS: Readonly<Record<string, string>> = {
  'bet-types': '#667eea',
  'markets': '#f093fb',
  'odds': '#4facfe',
  'general': '#43e97b',
  'rg_compliance': '#fa709a'
} as const;

// React component for term card with enhanced features
function TermCard({ term, onRelatedClick, onCopy }: { 
  term: GlossaryTerm;
  onRelatedClick?: (termId: string) => void;
  onCopy?: (text: string) => void;
}): ReactNode {
  const color = CATEGORY_COLORS[term.category] ?? '#667eea';
  
  const handleCopy = () => {
    const textToCopy = `${term.term}${term.abbreviation ? ` (${term.abbreviation})` : ''}: ${term.definition}`;
    if (onCopy) {
      onCopy(textToCopy);
    } else {
      navigator.clipboard.writeText(textToCopy).then(() => {
        alert('Copied to clipboard!');
      });
    }
  };
  
  return (
    <div className="term-card" style={{ borderLeftColor: color }}>
      <div className="term-header">
        <div className="term-name">
          {term.term}
          {term.abbreviation && (
            <span style={{ color: '#666', fontWeight: 'normal' }}>
              {' '}({term.abbreviation})
            </span>
          )}
          <button className="copy-btn" onClick={handleCopy} title="Copy definition">
            📋 Copy
          </button>
        </div>
        <span className="category-badge" style={{ background: color }}>
          {term.category.replace('_', ' ')}
        </span>
      </div>
      <p style={{ margin: '8px 0', color: '#555', lineHeight: 1.5 }}>
        {term.definition}
      </p>
      {term.examples && term.examples.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <strong style={{ color: '#666', fontSize: '12px' }}>Examples:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px', color: '#777', fontSize: '13px' }}>
            {term.examples.map((ex, i) => (
              <li key={i}>{ex}</li>
            ))}
          </ul>
        </div>
      )}
      {term.complexity && (
        <div style={{ marginTop: '8px' }}>
          <span style={{
            background: '#e9ecef',
            color: '#495057',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '11px'
          }}>
            {term.complexity.charAt(0).toUpperCase() + term.complexity.slice(1)} Level
          </span>
        </div>
      )}
      {term.seeAlso && term.seeAlso.length > 0 && (
        <div className="related-terms">
          <div className="related-terms-title">
            🔗 See also ({term.seeAlso.length}):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {term.seeAlso.map((relatedTerm, i) => (
              <a
                key={i}
                href="#"
                className="related-term-link"
                onClick={(e) => {
                  e.preventDefault();
                  if (onRelatedClick) {
                    onRelatedClick(relatedTerm.toLowerCase().replace(/\s+/g, '-'));
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🔗</span>
                <span>{relatedTerm}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {term.relatedTerms && term.relatedTerms.length > 0 && (
        <div className="related-terms" style={{ marginTop: term.seeAlso && term.seeAlso.length > 0 ? '10px' : '15px' }}>
          <div className="related-terms-title">
            🔄 Related terms ({term.relatedTerms.length}):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {term.relatedTerms.map((relatedId, i) => {
              // Try to find the term name from ID
              const relatedTermName = relatedId.split('-').map(w => 
                w.charAt(0).toUpperCase() + w.slice(1)
              ).join(' ');
              return (
                <a
                  key={i}
                  href="#"
                  className="related-term-link"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onRelatedClick) {
                      onRelatedClick(relatedId);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>🔄</span>
                  <span>{relatedTermName}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// React component for search results with sorting
function SearchResults({ 
  terms, 
  keyword, 
  count, 
  sortBy = 'relevance',
  onRelatedClick,
  onCopy
}: { 
  readonly terms: readonly GlossaryTerm[];
  readonly keyword: string;
  readonly count: number;
  readonly sortBy?: 'relevance' | 'name' | 'category' | 'complexity';
  readonly onRelatedClick?: (termId: string) => void;
  readonly onCopy?: (text: string) => void;
}): ReactNode {
  if (terms.length === 0) {
    return (
      <div className="loading">
        <h3>No Results Found</h3>
        <p>No terms found matching "{keyword}"</p>
        <p style={{ marginTop: '20px', color: '#999' }}>
          Try: parlay, spread, moneyline, vig, or steam
        </p>
      </div>
    );
  }

  // Sort terms based on sortBy
  const sortedTerms = [...terms].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.term.localeCompare(b.term);
      case 'category':
        return a.category.localeCompare(b.category) || a.term.localeCompare(b.term);
      case 'complexity':
        const complexityOrder = { 'basic': 1, 'intermediate': 2, 'advanced': 3 };
        const aComplexity = complexityOrder[a.complexity ?? 'basic'] ?? 0;
        const bComplexity = complexityOrder[b.complexity ?? 'basic'] ?? 0;
        return aComplexity - bComplexity || a.term.localeCompare(b.term);
      case 'relevance':
      default:
        return 0; // Already sorted by relevance from API
    }
  });

  return (
    <>
      <h3 style={{ marginBottom: '20px' }}>🔍 Search Results: "{keyword}"</h3>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Found <strong>{count}</strong> matching term{count !== 1 ? 's' : ''}
      </p>
      {sortedTerms.map(term => (
        <TermCard 
          key={term.id} 
          term={term} 
          onRelatedClick={onRelatedClick}
          onCopy={onCopy}
        />
      ))}
    </>
  );
}

export class GlossarySearch {
  public readonly config: SearchConfig; // Made public for hydration
  private debounceTimer?: number;
  private abortController?: AbortController;
  private resultsRoot?: { render: (node: ReactNode) => void };
  private currentCategory: string = 'all';
  private currentSort: 'relevance' | 'name' | 'category' | 'complexity' = 'relevance';
  private allTerms: readonly GlossaryTerm[] = [];
  private currentResults: readonly GlossaryTerm[] = [];

  constructor(config: SearchConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    // Check for SSR hydration data first
    const body = document.body;
    const ssrEnabled = body.getAttribute('data-ssr') === 'true';
    const ssrVersion = body.getAttribute('data-version');
    const buildTime = body.getAttribute('data-build-time');
    
    if (ssrEnabled) {
      console.log(`[SSR] Hydrating from server-side rendered data (v${ssrVersion})`);
      console.log(`[SSR] Build time: ${buildTime}`);
      
      // Hydrate stats from SSR data if available
      const ssrTotal = parseInt(body.getAttribute('data-total-terms') || '0', 10);
      const ssrBetTypes = parseInt(body.getAttribute('data-bet-types') || '0', 10);
      const ssrRgTerms = parseInt(body.getAttribute('data-rg-terms') || '0', 10);
      
      if (ssrTotal > 0) {
        // Stats are already rendered by SSR, but ensure consistency
        this.config.stats.total.textContent = ssrTotal.toString();
        this.config.stats.betTypes.textContent = ssrBetTypes.toString();
        this.config.stats.rgTerms.textContent = ssrRgTerms.toString();
      }
    }
    
    // Load fresh stats and all terms (will update if SSR data is stale)
    await this.loadStats();
    await this.loadAllTerms();
    this.attachListeners();
    
    // Initialize React root for results container
    const resultsContainer = this.config.results;
    if (resultsContainer) {
      // Use Bun's React render (if available) or fallback to innerHTML
      this.resultsRoot = {
        render: (node: ReactNode) => {
          // Fallback: render as HTML string for now
          // In production, use React's renderToStaticMarkup or similar
          if (typeof node === 'string') {
            resultsContainer.innerHTML = node;
          } else {
            resultsContainer.innerHTML = '<div>Rendering...</div>';
          }
        }
      };
    }
  }

  private attachListeners(): void {
    const input = this.config.searchInput as HTMLInputElement;
    
    // Search input handler
    input.addEventListener('keyup', (e: KeyboardEvent) => {
      this.handleInput(e);
    });

    // Click outside to close suggestions
    document.addEventListener('click', (e: MouseEvent) => {
      if (!this.config.suggestions.contains(e.target as Node) && 
          e.target !== input) {
        this.config.suggestions.style.display = 'none';
      }
    });

    // Enter key to search
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.performSearch(input.value.trim());
      }
    });

    // Keyboard shortcut: / to focus search
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === '/' && e.target !== input && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        input.focus();
      }
    });

    // Category filter buttons
    if (this.config.categoryFilters) {
      this.config.categoryFilters.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('filter-btn')) {
          // Update active state
          this.config.categoryFilters?.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
          });
          target.classList.add('active');
          
          // Update category and filter
          this.currentCategory = target.getAttribute('data-category') || 'all';
          this.applyFilters();
        }
      });
    }

    // View all button
    if (this.config.viewAllBtn) {
      this.config.viewAllBtn.addEventListener('click', () => {
        this.viewAllTerms();
      });
    }

    // Sort select
    if (this.config.sortSelect) {
      this.config.sortSelect.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLSelectElement;
        this.currentSort = target.value as 'relevance' | 'name' | 'category' | 'complexity';
        this.applyFilters();
      });
    }
  }

  private async handleInput(event: KeyboardEvent): Promise<void> {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();

    if (this.abortController) {
      this.abortController.abort();
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (event.key === 'Escape') {
      this.config.suggestions.style.display = 'none';
      return;
    }

    if (!query || query.length < 2) {
      this.config.suggestions.style.display = 'none';
      return;
    }

    this.debounceTimer = setTimeout(async () => {
      await this.loadSuggestions(query);
    }, 300) as unknown as number;
  }

  private async loadSuggestions(query: string): Promise<void> {
    try {
      this.abortController = new AbortController();
      const response = await fetch(
        `/api/glossary/suggestions?q=${encodeURIComponent(query)}&limit=8`,
        { signal: this.abortController.signal }
      );
      
      if (!response.ok) return;
      
      const data = await response.json() as { suggestions?: readonly string[] };
      
      if (data.suggestions && data.suggestions.length > 0) {
        this.renderSuggestions(data.suggestions);
        this.config.suggestions.style.display = 'block';
      } else {
        this.config.suggestions.style.display = 'none';
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to load suggestions:', error);
      }
    }
  }

  private renderSuggestions(suggestions: readonly string[]): void {
    this.config.suggestions.innerHTML = suggestions.map(s => `
      <div class="suggestion-item" onclick="window.glossarySearch?.selectSuggestion('${s.replace(/'/g, "\\'")}')">
        ${s}
      </div>
    `).join('');
  }

  selectSuggestion(term: string): void {
    const input = this.config.searchInput as HTMLInputElement;
    input.value = term;
    this.config.suggestions.style.display = 'none';
    this.performSearch(term);
  }

  private async performSearch(keyword: string): Promise<void> {
    if (!keyword.trim()) return;

    if (this.resultsRoot) {
      this.resultsRoot.render('<div class="loading">🔍 Searching...</div>');
    }

    try {
      const response = await fetch(
        `/api/glossary/search?keyword=${encodeURIComponent(keyword)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as { 
        terms?: readonly GlossaryTerm[];
        count?: number;
      };
      
      const terms = data.terms ?? [];
      const count = data.count ?? 0;
      this.currentResults = terms;
      
      if (this.resultsRoot) {
        // Render React component (simplified for now)
        const resultsHTML = terms.map(term => {
          const color = CATEGORY_COLORS[term.category] ?? '#667eea';
          const abbrev = term.abbreviation ? ` (${term.abbreviation})` : '';
          const examples = term.examples && term.examples.length > 0
            ? `<div style="margin-top: 10px;">
                <strong style="color: #666; font-size: 12px;">Examples:</strong>
                <ul style="margin: 5px 0; padding-left: 20px; color: #777; font-size: 13px;">
                  ${term.examples.map(ex => `<li>${ex}</li>`).join('')}
                </ul>
              </div>`
            : '';
          const relatedTerms = term.seeAlso && term.seeAlso.length > 0
            ? `<div class="related-terms">
                <div class="related-terms-title">🔗 See also (${term.seeAlso.length}):</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  ${term.seeAlso.map(rt => 
                    `<a href="#" class="related-term-link" onclick="window.glossarySearch?.searchTerm('${rt}'); return false;" style="display: inline-flex; align-items: center; gap: 4px;">
                      <span>🔗</span>
                      <span>${rt}</span>
                    </a>`
                  ).join('')}
                </div>
              </div>`
            : '';
          const directRelationships = term.relatedTerms && term.relatedTerms.length > 0
            ? `<div class="related-terms" style="margin-top: ${term.seeAlso && term.seeAlso.length > 0 ? '10px' : '15px'};">
                <div class="related-terms-title">🔄 Related terms (${term.relatedTerms.length}):</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  ${term.relatedTerms.map(rt => {
                    const relatedTermName = rt.split('-').map(w => 
                      w.charAt(0).toUpperCase() + w.slice(1)
                    ).join(' ');
                    return `<a href="#" class="related-term-link" onclick="window.glossarySearch?.searchTerm('${rt}'); return false;" style="display: inline-flex; align-items: center; gap: 4px;">
                      <span>🔄</span>
                      <span>${relatedTermName}</span>
                    </a>`;
                  }).join('')}
                </div>
              </div>`
            : '';
          
          return `
            <div class="term-card" style="border-left-color: ${color};">
              <div class="term-header">
                <div class="term-name">
                  ${term.term}${abbrev}
                  <button class="copy-btn" onclick="navigator.clipboard.writeText('${term.term}${abbrev}: ${term.definition.replace(/'/g, "\\'")}').then(() => alert('Copied!'))" title="Copy definition">
                    📋 Copy
                  </button>
                </div>
                <span class="category-badge" style="background: ${color};">
                  ${term.category.replace('_', ' ')}
                </span>
              </div>
              <p style="margin: 8px 0; color: #555; line-height: 1.5;">${term.definition}</p>
              ${examples}
              ${relatedTerms}
              ${directRelationships}
            </div>
          `;
        }).join('');
        
        this.resultsRoot.render(`
          <h3 style="margin-bottom: 20px;">🔍 Search Results: "${keyword}"</h3>
          <p style="color: #666; margin-bottom: 20px;">Found <strong>${count}</strong> matching term${count !== 1 ? 's' : ''}</p>
          ${resultsHTML}
        `);
      }
    } catch (error) {
      if (this.resultsRoot) {
        this.resultsRoot.render(
          `<div class="loading"><p style="color: #dc3545;">❌ Failed to search: ${error instanceof Error ? error.message : String(error)}</p></div>`
        );
      }
    }
  }

  private async loadStats(): Promise<void> {
    try {
      const [totalRes, betTypesRes, rgRes] = await Promise.all([
        fetch('/api/glossary/search'),
        fetch('/api/glossary/bet-types'),
        fetch('/api/glossary/category/rg_compliance')
      ]);

      const [totalData, betTypesData, rgData] = await Promise.all([
        totalRes.json() as Promise<{ count?: number }>,
        betTypesRes.json() as Promise<{ count?: number }>,
        rgRes.json() as Promise<{ count?: number }>
      ]);

      this.config.stats.total.textContent = totalData.count?.toString() ?? '0';
      this.config.stats.betTypes.textContent = betTypesData.count?.toString() ?? '0';
      this.config.stats.rgTerms.textContent = rgData.count?.toString() ?? '0';
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.config.stats.total.textContent = '0';
      this.config.stats.betTypes.textContent = '0';
      this.config.stats.rgTerms.textContent = '0';
    }
  }

  private async loadAllTerms(): Promise<void> {
    try {
      const response = await fetch('/api/glossary/search');
      if (response.ok) {
        const data = await response.json() as { terms?: readonly GlossaryTerm[] };
        this.allTerms = data.terms ?? [];
        this.updateFilterCounts();
      }
    } catch (error) {
      console.error('Failed to load all terms:', error);
    }
  }

  private updateFilterCounts(): void {
    if (!this.config.filterCounts) return;
    
    // Count terms by category
    const counts = {
      all: this.allTerms.length,
      betTypes: this.allTerms.filter(t => t.category === 'bet-types').length,
      markets: this.allTerms.filter(t => t.category === 'markets').length,
      odds: this.allTerms.filter(t => t.category === 'odds').length,
      general: this.allTerms.filter(t => t.category === 'general').length,
      rgCompliance: this.allTerms.filter(t => t.category === 'rg_compliance').length,
    };
    
    // Update filter count badges
    if (this.config.filterCounts.all) {
      this.config.filterCounts.all.textContent = counts.all.toString();
    }
    if (this.config.filterCounts.betTypes) {
      this.config.filterCounts.betTypes.textContent = counts.betTypes.toString();
    }
    if (this.config.filterCounts.markets) {
      this.config.filterCounts.markets.textContent = counts.markets.toString();
    }
    if (this.config.filterCounts.odds) {
      this.config.filterCounts.odds.textContent = counts.odds.toString();
    }
    if (this.config.filterCounts.general) {
      this.config.filterCounts.general.textContent = counts.general.toString();
    }
    if (this.config.filterCounts.rgCompliance) {
      this.config.filterCounts.rgCompliance.textContent = counts.rgCompliance.toString();
    }
  }

  searchTerm(termName: string): void {
    const input = this.config.searchInput as HTMLInputElement;
    input.value = termName;
    this.performSearch(termName);
  }

  private viewAllTerms(): void {
    const input = this.config.searchInput as HTMLInputElement;
    input.value = '';
    this.currentCategory = 'all';
    this.currentSort = 'name';
    
    // Update filter buttons
    this.config.categoryFilters?.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-category') === 'all') {
        btn.classList.add('active');
      }
    });
    
    // Update sort select
    if (this.config.sortSelect) {
      (this.config.sortSelect as HTMLSelectElement).value = 'name';
    }
    
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = this.allTerms;
    
    // Apply category filter
    if (this.currentCategory !== 'all') {
      filtered = filtered.filter(term => term.category === this.currentCategory);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (this.currentSort) {
        case 'name':
          return a.term.localeCompare(b.term);
        case 'category':
          return a.category.localeCompare(b.category) || a.term.localeCompare(b.term);
        case 'complexity':
          const complexityOrder = { 'basic': 1, 'intermediate': 2, 'advanced': 3 };
          const aComplexity = complexityOrder[a.complexity ?? 'basic'] ?? 0;
          const bComplexity = complexityOrder[b.complexity ?? 'basic'] ?? 0;
          return aComplexity - bComplexity || a.term.localeCompare(b.term);
        case 'relevance':
        default:
          return 0;
      }
    });
    
    this.currentResults = sorted;
    this.renderFilteredResults();
  }

  private renderFilteredResults(): void {
    if (!this.resultsRoot) return;
    
    if (this.currentResults.length === 0) {
      this.resultsRoot.render(`
        <div class="loading">
          <h3>No Terms Found</h3>
          <p>No terms match the current filter criteria.</p>
        </div>
      `);
      return;
    }
    
    const categoryLabel = this.currentCategory === 'all' 
      ? 'All Terms' 
      : this.currentCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const termsHTML = this.currentResults.map(term => {
      const color = CATEGORY_COLORS[term.category] ?? '#667eea';
      const abbrev = term.abbreviation ? ` (${term.abbreviation})` : '';
      const examples = term.examples && term.examples.length > 0
        ? `<div style="margin-top: 10px;">
            <strong style="color: #666; font-size: 12px;">Examples:</strong>
            <ul style="margin: 5px 0; padding-left: 20px; color: #777; font-size: 13px;">
              ${term.examples.map(ex => `<li>${ex}</li>`).join('')}
            </ul>
          </div>`
        : '';
      const complexity = term.complexity
        ? `<div style="margin-top: 8px;">
            <span style="background: #e9ecef; color: #495057; padding: 2px 6px; border-radius: 3px; font-size: 11px;">
              ${term.complexity.charAt(0).toUpperCase() + term.complexity.slice(1)} Level
            </span>
          </div>`
        : '';
      const relatedTerms = term.seeAlso && term.seeAlso.length > 0
        ? `<div class="related-terms">
            <div class="related-terms-title">🔗 See also (${term.seeAlso.length}):</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${term.seeAlso.map(rt => 
                `<a href="#" class="related-term-link" onclick="window.glossarySearch?.searchTerm('${rt}'); return false;" style="display: inline-flex; align-items: center; gap: 4px;">
                  <span>🔗</span>
                  <span>${rt}</span>
                </a>`
              ).join('')}
            </div>
          </div>`
        : '';
      const directRelationships = term.relatedTerms && term.relatedTerms.length > 0
        ? `<div class="related-terms" style="margin-top: ${term.seeAlso && term.seeAlso.length > 0 ? '10px' : '15px'};">
            <div class="related-terms-title">🔄 Related terms (${term.relatedTerms.length}):</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${term.relatedTerms.map(rt => {
                const relatedTermName = rt.split('-').map(w => 
                  w.charAt(0).toUpperCase() + w.slice(1)
                ).join(' ');
                return `<a href="#" class="related-term-link" onclick="window.glossarySearch?.searchTerm('${rt}'); return false;" style="display: inline-flex; align-items: center; gap: 4px;">
                  <span>🔄</span>
                  <span>${relatedTermName}</span>
                </a>`;
              }).join('')}
            </div>
          </div>`
        : '';
      
      return `
        <div class="term-card" style="border-left-color: ${color};">
          <div class="term-header">
            <div class="term-name">
              ${term.term}${abbrev}
              <button class="copy-btn" onclick="navigator.clipboard.writeText('${term.term}${abbrev}: ${term.definition.replace(/'/g, "\\'")}').then(() => alert('Copied!'))" title="Copy definition">
                📋 Copy
              </button>
            </div>
            <span class="category-badge" style="background: ${color};">
              ${term.category.replace('_', ' ')}
            </span>
          </div>
          <p style="margin: 8px 0; color: #555; line-height: 1.5;">${term.definition}</p>
          ${examples}
          ${complexity}
          ${relatedTerms}
          ${directRelationships}
        </div>
      `;
    }).join('');
    
    this.resultsRoot.render(`
      <h3 style="margin-bottom: 20px;">📚 ${categoryLabel} (${this.currentResults.length})</h3>
      ${termsHTML}
    `);
  }
}

declare global {
  interface Window {
    glossarySearch?: GlossarySearch;
  }
}

