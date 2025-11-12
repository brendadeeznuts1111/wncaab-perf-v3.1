/**
 * Glossary Search Component
 * Uses Bun's native TypeScript/ESM support
 * Automatically bundled by Bun's HTML import system
 */

interface GlossaryTerm {
  id: string;
  term: string;
  abbreviation?: string;
  category: string;
  definition: string;
  examples?: string[];
  complexity?: 'basic' | 'intermediate' | 'advanced';
}

interface SearchConfig {
  searchInput: HTMLElement;
  suggestions: HTMLElement;
  results: HTMLElement;
  stats: {
    total: HTMLElement;
    betTypes: HTMLElement;
    rgTerms: HTMLElement;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  'bet-types': '#667eea',
  'markets': '#f093fb',
  'odds': '#4facfe',
  'general': '#43e97b',
  'rg_compliance': '#fa709a'
};

export class GlossarySearch {
  private config: SearchConfig;
  private debounceTimer?: number;
  private abortController?: AbortController;

  constructor(config: SearchConfig) {
    this.config = config;
  }

  async init() {
    await this.loadStats();
    this.attachListeners();
  }

  private attachListeners() {
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
  }

  private async handleInput(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();

    // Cancel previous request
    if (this.abortController) {
      this.abortController.abort();
    }

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Handle Escape key
    if (event.key === 'Escape') {
      this.config.suggestions.style.display = 'none';
      return;
    }

    // Hide suggestions if empty
    if (!query || query.length < 2) {
      this.config.suggestions.style.display = 'none';
      return;
    }

    // Debounce autocomplete
    this.debounceTimer = setTimeout(async () => {
      await this.loadSuggestions(query);
    }, 300) as unknown as number;
  }

  private async loadSuggestions(query: string) {
    try {
      this.abortController = new AbortController();
      const response = await fetch(
        `/api/glossary/suggestions?q=${encodeURIComponent(query)}&limit=8`,
        { signal: this.abortController.signal }
      );
      
      if (!response.ok) return;
      
      const data = await response.json();
      
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

  private renderSuggestions(suggestions: string[]) {
    this.config.suggestions.innerHTML = suggestions.map(s => `
      <div class="suggestion-item" onclick="window.glossarySearch?.selectSuggestion('${s.replace(/'/g, "\\'")}')">
        ${s}
      </div>
    `).join('');
  }

  selectSuggestion(term: string) {
    const input = this.config.searchInput as HTMLInputElement;
    input.value = term;
    this.config.suggestions.style.display = 'none';
    this.performSearch(term);
  }

  private async performSearch(keyword: string) {
    if (!keyword.trim()) return;

    this.config.results.innerHTML = '<div class="loading">🔍 Searching...</div>';

    try {
      const response = await fetch(
        `/api/glossary/search?keyword=${encodeURIComponent(keyword)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.renderResults(data.terms || [], keyword, data.count || 0);
    } catch (error) {
      this.config.results.innerHTML = `
        <div class="loading">
          <p style="color: #dc3545;">❌ Failed to search: ${error instanceof Error ? error.message : String(error)}</p>
        </div>
      `;
    }
  }

  private renderResults(terms: GlossaryTerm[], keyword: string, count: number) {
    if (terms.length === 0) {
      this.config.results.innerHTML = `
        <div class="loading">
          <h3>No Results Found</h3>
          <p>No terms found matching "${keyword}"</p>
          <p style="margin-top: 20px; color: #999;">Try: parlay, spread, moneyline, vig, or steam</p>
        </div>
      `;
      return;
    }

    const termsHTML = terms.map(term => {
      const color = CATEGORY_COLORS[term.category] || '#667eea';
      const abbrev = term.abbreviation 
        ? `<span style="color: #666; font-weight: normal;"> (${term.abbreviation})</span>` 
        : '';
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

      return `
        <div class="term-card" style="border-left-color: ${color};">
          <div class="term-header">
            <div class="term-name">${term.term}${abbrev}</div>
            <span class="category-badge" style="background: ${color};">
              ${term.category.replace('_', ' ')}
            </span>
          </div>
          <p style="margin: 8px 0; color: #555; line-height: 1.5;">${term.definition}</p>
          ${examples}
          ${complexity}
        </div>
      `;
    }).join('');

    this.config.results.innerHTML = `
      <h3 style="margin-bottom: 20px;">🔍 Search Results: "${keyword}"</h3>
      <p style="color: #666; margin-bottom: 20px;">Found <strong>${count}</strong> matching term${count !== 1 ? 's' : ''}</p>
      ${termsHTML}
    `;
  }

  private async loadStats() {
    try {
      const [totalRes, betTypesRes, rgRes] = await Promise.all([
        fetch('/api/glossary/search'),
        fetch('/api/glossary/bet-types'),
        fetch('/api/glossary/category/rg_compliance')
      ]);

      const [totalData, betTypesData, rgData] = await Promise.all([
        totalRes.json(),
        betTypesRes.json(),
        rgRes.json()
      ]);

      this.config.stats.total.textContent = totalData.count?.toString() || '0';
      this.config.stats.betTypes.textContent = betTypesData.count?.toString() || '0';
      this.config.stats.rgTerms.textContent = rgData.count?.toString() || '0';
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.config.stats.total.textContent = '0';
      this.config.stats.betTypes.textContent = '0';
      this.config.stats.rgTerms.textContent = '0';
    }
  }
}

// Make globally accessible for onclick handlers
declare global {
  interface Window {
    glossarySearch?: GlossarySearch;
  }
}

