/**
 * Error Diagnostics Utility - TES-NGWS-001.13
 * 
 * Provides detailed error analysis and actionable suggestions for API failures.
 * 
 * @module src/utils/error-diagnostics
 */

/**
 * API diagnostic information
 */
export interface APIDiagnostic {
  errorType: 'RATE_LIMIT' | 'INVALID_MATCH' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'IP_BLOCK';
  statusCode: number;
  message: string;
  suggestions: string[];
  retryAfterMs?: number;
}

/**
 * Goaloo Error Diagnostics
 * 
 * Analyzes errors from Goaloo901 API and provides actionable diagnostics.
 */
export class GoalooErrorDiagnostics {
  /**
   * Analyze error and provide diagnostic information
   * 
   * @param error - Error object or response
   * @param matchId - Match ID that caused the error
   * @returns Diagnostic information with suggestions
   */
  static analyzeError(error: any, matchId: number): APIDiagnostic {
    const status = error?.response?.status || error?.status || error?.statusCode || 0;
    const statusText = error?.response?.statusText || error?.message || 'Unknown error';

    // Check for specific patterns
    if (status === 502) {
      return {
        errorType: 'SERVER_ERROR',
        statusCode: 502,
        message: `Goaloo901 API gateway error for match ${matchId}. The upstream server is unavailable.`,
        suggestions: [
          `Match ID ${matchId} may have expired or not started yet`,
          'Try a different match ID (use match discovery tool)',
          'Goaloo901 may be experiencing downtime - check https://live.goaloo901.com',
          'If persistent, consider using a proxy or VPN',
        ],
        retryAfterMs: 5000,
      };
    }

    if (status === 429 || statusText.toLowerCase().includes('rate')) {
      return {
        errorType: 'RATE_LIMIT',
        statusCode: 429,
        message: `Rate limited by Goaloo901 API. Too many requests.`,
        suggestions: [
          'Increase polling interval (current: 2s, try 5s)',
          'Use rotating proxies for IP diversity',
          'Reduce concurrent match monitoring',
          'Contact Goaloo901 for API access if needed',
        ],
        retryAfterMs: 10000,
      };
    }

    if (status === 403 || statusText.toLowerCase().includes('block')) {
      return {
        errorType: 'IP_BLOCK',
        statusCode: 403,
        message: `IP address blocked by Goaloo901 anti-bot protection.`,
        suggestions: [
          'Use residential proxies (e.g., BrightData, Oxylabs)',
          'Rotate User-Agent headers',
          'Add delays between requests (jitter)',
          'Check if your IP is on blacklists',
        ],
        retryAfterMs: 60000,
      };
    }

    if (status === 404) {
      return {
        errorType: 'INVALID_MATCH',
        statusCode: 404,
        message: `Match ID ${matchId} not found. Invalid or expired match.`,
        suggestions: [
          `Match ${matchId} may have finished or not been scheduled`,
          'Use match discovery to find active games',
          'Check Goaloo901 schedule page for valid IDs',
        ],
        retryAfterMs: 0, // Don't retry invalid matches
      };
    }

    // Network errors
    if (
      status === 0 ||
      statusText.toLowerCase().includes('network') ||
      statusText.toLowerCase().includes('timeout') ||
      statusText.toLowerCase().includes('fetch')
    ) {
      return {
        errorType: 'NETWORK_ERROR',
        statusCode: 0,
        message: `Network error connecting to Goaloo901: ${statusText}`,
        suggestions: [
          'Check your internet connection',
          'Verify DNS resolution for live.goaloo901.com',
          'Try accessing via VPN',
          'Check firewall settings',
        ],
        retryAfterMs: 3000,
      };
    }

    // Default
    return {
      errorType: 'SERVER_ERROR',
      statusCode: status,
      message: `Unexpected error: ${statusText}`,
      suggestions: [
        'Check Goaloo901 website status',
        'Review error logs for patterns',
        'Consider API fallback strategies',
        'Contact support if persistent',
      ],
      retryAfterMs: 5000,
    };
  }
}

