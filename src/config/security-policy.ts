/**
 * Security Policy - TES-NGWS-001.7
 * 
 * Zero-trust security policy with rg-verifiable compliance checks.
 * 
 * @module src/config/security-policy
 */

export interface SecurityPolicy {
  jwt: {
    transport: ("Cookie" | "Header")[];
    cookie: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "strict" | "lax" | "none";
      maxAge: number;
    };
    header: {
      prefix: string;
    };
  };
  csrf: {
    enabled: boolean;
    tokenExpiry: number; // milliseconds
    headerName: string;
  };
  websocket: {
    requireJwt: boolean;
    requireCsrf: boolean;
    compression: boolean;
  };
}

/**
 * Default security policy configuration
 */
export const SECURITY_POLICY: SecurityPolicy = {
  jwt: {
    transport: ["Cookie", "Header"], // Dual transport allowed
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 3600, // 1 hour
    },
    header: {
      prefix: "Bearer",
    },
  },
  csrf: {
    enabled: true,
    tokenExpiry: 300000, // 5 minutes
    headerName: "X-CSRF-Token",
  },
  websocket: {
    requireJwt: true,
    requireCsrf: false, // WS upgrade doesn't use CSRF (uses Origin validation)
    compression: true,
  },
};

/**
 * Validate security policy compliance via rg queries
 * 
 * Returns array of rg query strings that can be executed to verify compliance
 * 
 * @returns Array of rg query commands
 */
export function auditSecurityPolicy(): string[] {
  const rgQueries = [
    // Verify all cookies are httpOnly
    'rg "httpOnly:false" logs/headers-index.log && echo "VIOLATION: Non-httponly cookie"',
    
    // Verify CSRF tokens are being generated
    'rg "CSRF.*TOKEN_GEN" logs/headers-index.log | wc -l',
    
    // Verify JWT refresh rate is within policy
    'rg "JWT_REFRESH" logs/headers-index.log | wc -l',
    
    // Verify all cookies are secure
    'rg "secure:false" logs/headers-index.log && echo "VIOLATION: Non-secure cookie"',
    
    // Verify sameSite is strict
    'rg "sameSite:(lax|none)" logs/headers-index.log && echo "VIOLATION: Non-strict sameSite"',
    
    // Count CSRF failures
    'rg "CSRF.*FAILURE" logs/headers-index.log | wc -l',
    
    // Count missing JWT attempts
    'rg "JWT_MISSING" logs/headers-index.log | wc -l',
  ];
  
  return rgQueries;
}

/**
 * Run security policy audit and return violations
 * 
 * @returns Array of violation messages (empty if compliant)
 */
export async function runSecurityAudit(): Promise<string[]> {
  const violations: string[] = [];
  
  try {
    const logFile = Bun.file("logs/headers-index.log");
    if (!(await logFile.exists())) {
      return ["WARNING: No security log file found. Run some requests first."];
    }
    
    const content = await logFile.text();
    
    // Check for non-httponly cookies
    if (content.includes("httpOnly:false")) {
      violations.push("VIOLATION: Non-httponly cookie detected");
    }
    
    // Check for non-secure cookies
    if (content.includes("secure:false")) {
      violations.push("VIOLATION: Non-secure cookie detected");
    }
    
    // Check for non-strict sameSite
    if (/sameSite:(lax|none)/.test(content)) {
      violations.push("VIOLATION: Non-strict sameSite cookie detected");
    }
    
    // Count CSRF failures
    const csrfFailures = (content.match(/CSRF.*FAILURE/g) || []).length;
    if (csrfFailures > 0) {
      violations.push(`WARNING: ${csrfFailures} CSRF verification failures detected`);
    }
    
    // Count missing JWT attempts
    const missingJwt = (content.match(/JWT_MISSING/g) || []).length;
    if (missingJwt > 0) {
      violations.push(`WARNING: ${missingJwt} missing JWT attempts detected`);
    }
    
  } catch (error) {
    violations.push(`ERROR: Failed to run security audit: ${error}`);
  }
  
  return violations;
}

/**
 * Validate CSRF secret is set in environment
 * 
 * @returns true if CSRF_SECRET is set, false otherwise
 */
export function validateCsrfSecret(): boolean {
  const secret = process.env.CSRF_SECRET || Bun.env.CSRF_SECRET;
  return secret !== undefined && secret !== "" && secret !== "tes-csrf-secret-default-change-in-production";
}
