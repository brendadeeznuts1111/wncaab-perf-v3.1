import { describe, test, expect, beforeEach } from 'bun:test';
import { GlossarySearch } from './glossary-search-react';

// Mock DOM elements
function createMockElement(tag: string = 'div'): HTMLElement {
  const el = document.createElement(tag);
  el.textContent = '';
  return el;
}

describe('GlossarySearch', () => {
  let search: GlossarySearch;
  let mockConfig: {
    searchInput: HTMLElement;
    suggestions: HTMLElement;
    results: HTMLElement;
    stats: {
      total: HTMLElement;
      betTypes: HTMLElement;
      rgTerms: HTMLElement;
    };
  };

  beforeEach(() => {
    mockConfig = {
      searchInput: createMockElement('input'),
      suggestions: createMockElement('div'),
      results: createMockElement('div'),
      stats: {
        total: createMockElement('div'),
        betTypes: createMockElement('div'),
        rgTerms: createMockElement('div'),
      },
    };
    search = new GlossarySearch(mockConfig);
  });

  test('should initialize with config', () => {
    expect(search).toBeInstanceOf(GlossarySearch);
  });

  test('selectSuggestion should update input value', () => {
    const input = mockConfig.searchInput as HTMLInputElement;
    input.value = '';
    
    search.selectSuggestion('parlay');
    
    expect(input.value).toBe('parlay');
    expect(mockConfig.suggestions.style.display).toBe('none');
  });

  test('should handle empty search gracefully', async () => {
    await search.performSearch('');
    // Should not throw error
    expect(true).toBe(true);
  });

  test('should debounce search input', async () => {
    const input = mockConfig.searchInput as HTMLInputElement;
    input.value = 'par';
    
    // Mock fetch
    global.fetch = async () => {
      return new Response(JSON.stringify({
        suggestions: ['parlay', 'parlay bet']
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const event = new KeyboardEvent('keyup', { key: 'r' });
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    
    await search.handleInput(event);
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 350));
    
    expect(mockConfig.suggestions.style.display).toBe('block');
  });
});

describe('GlossarySearch API Integration', () => {
  test('should handle API errors gracefully', async () => {
    global.fetch = async () => {
      return new Response('Internal Server Error', { status: 500 });
    };

    const mockConfig = {
      searchInput: createMockElement('input'),
      suggestions: createMockElement('div'),
      results: createMockElement('div'),
      stats: {
        total: createMockElement('div'),
        betTypes: createMockElement('div'),
        rgTerms: createMockElement('div'),
      },
    };

    const search = new GlossarySearch(mockConfig);
    
    // Should not throw
    await expect(search.performSearch('test')).resolves.not.toThrow();
  });

  test('should cancel previous requests on new input', async () => {
    let abortSignal: AbortSignal | null = null;
    
    global.fetch = async (url, options) => {
      if (options?.signal) {
        abortSignal = options.signal as AbortSignal;
      }
      // Simulate slow request
      await new Promise(resolve => setTimeout(resolve, 1000));
      return new Response(JSON.stringify({ suggestions: [] }));
    };

    const mockConfig = {
      searchInput: createMockElement('input'),
      suggestions: createMockElement('div'),
      results: createMockElement('div'),
      stats: {
        total: createMockElement('div'),
        betTypes: createMockElement('div'),
        rgTerms: createMockElement('div'),
      },
    };

    const search = new GlossarySearch(mockConfig);
    const input = mockConfig.searchInput as HTMLInputElement;
    
    // First input
    input.value = 'par';
    const event1 = new KeyboardEvent('keyup', { key: 'r' });
    Object.defineProperty(event1, 'target', { value: input, enumerable: true });
    await search.handleInput(event1);
    
    // Second input (should abort first)
    input.value = 'spread';
    const event2 = new KeyboardEvent('keyup', { key: 'd' });
    Object.defineProperty(event2, 'target', { value: input, enumerable: true });
    await search.handleInput(event2);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // First request should be aborted
    expect(abortSignal?.aborted).toBe(true);
  });
});

