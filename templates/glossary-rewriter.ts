/**
 * Glossary Server-Side Template Injection using HTMLRewriter
 * Injects server-side data (stats, version, etc.) into HTML template
 * 
 * Uses Bun's native HTMLRewriter API (Cloudflare Workers compatible)
 * 
 * SSR Features:
 * - Meta tag injection (version)
 * - Data attribute hydration (body attributes)
 * - Direct DOM injection (stat cards)
 * - Zero-dependency server-side rendering
 * - Client-side hydration support
 */

// HTMLRewriter is available globally in Bun (Cloudflare Workers API)
declare const HTMLRewriter: {
  new (): HTMLRewriter;
};

interface HTMLRewriter {
  on(selector: string, handlers: {
    element?: (el: Element) => void;
    text?: (text: Text) => void;
  }): HTMLRewriter;
  transform(response: Response): Response;
}

interface Element {
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  setInnerContent(content: string, options?: { html: boolean }): void;
}

interface Text {
  text: string;
  replace(text: string): void;
}

interface GlossaryTemplateData {
  readonly version: string;
  readonly totalTerms: number;
  readonly betTypeTerms: number;
  readonly rgTerms: number;
  readonly buildTime: string;
}

/**
 * Create HTMLRewriter instance for glossary template injection
 * Uses Bun's native HTMLRewriter API for zero-dependency SSR
 * 
 * SSR Architecture:
 * 1. Server-side: HTMLRewriter injects data into HTML template
 * 2. Client-side: React component hydrates from data attributes
 * 3. Benefits: Fast initial render, SEO-friendly, progressive enhancement
 */
export function createGlossaryRewriter(data: GlossaryTemplateData): HTMLRewriter {
  return new HTMLRewriter()
    // Inject version into meta tags (for SEO and version tracking)
    .on('meta[name="version"]', {
      element(el: Element) {
        el.setAttribute('content', data.version);
      }
    })
    // Inject stats into data attributes for client-side hydration
    // React component reads these on mount for seamless hydration
    .on('body', {
      element(el: Element) {
        el.setAttribute('data-total-terms', data.totalTerms.toString());
        el.setAttribute('data-bet-types', data.betTypeTerms.toString());
        el.setAttribute('data-rg-terms', data.rgTerms.toString());
        el.setAttribute('data-build-time', data.buildTime);
        el.setAttribute('data-ssr', 'true'); // Flag indicating SSR was used
        el.setAttribute('data-version', data.version);
      }
    })
    // Inject initial stats into stat cards (SSR - visible immediately)
    // This provides instant content before React hydration
    .on('#total-terms', {
      element(el: Element) {
        el.setInnerContent(data.totalTerms.toString(), { html: false });
      }
    })
    .on('#bet-types', {
      element(el: Element) {
        el.setInnerContent(data.betTypeTerms.toString(), { html: false });
      }
    })
    .on('#rg-terms', {
      element(el: Element) {
        el.setInnerContent(data.rgTerms.toString(), { html: false });
      }
    })
    // Inject SSR metadata into title for debugging
    .on('title', {
      element(el: Element) {
        const current = el.getAttribute('content') || el.textContent || '';
        if (!current.includes('v' + data.version)) {
          el.setInnerContent(`${current} (SSR v${data.version})`, { html: false });
        }
      }
    });
}

