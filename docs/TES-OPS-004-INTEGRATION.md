# TES-OPS-004: Dependencies & Integration Guide

**Ticket:** TES-OPS-004  
**Status:** ✅ Complete  
**Last Updated:** 2025

## Dependencies

### ✅ GLOBAL-CONFIG: Shared rg Metadata and Logging Utilities

**Status:** Integrated

The version bump utility uses a custom `logTESEvent` function that follows the same rg-friendly logging pattern as other TES utilities:

- **Pattern:** JSON format with `[KEY]` metadata tags
- **Output:** `logs/version-bumps.log` for rg indexing
- **Format:** Compatible with `logSecurityEvent` and `logLifecycleEvent` patterns

**Log Format:**
```json
{
  "[VERSION]": "[BUMP]",
  "[TYPE]": "PATCH",
  "[OLD]": "v3.1.0",
  "[NEW]": "v3.1.1",
  "[USER]": "username",
  "[TS]": 1701187200000,
  "[FILES_UPDATED]": 6,
  "[MATCHES]": 12,
  "[BACKUP_DIR]": ".bump_backups/v3.1.0-to-v3.1.1"
}
```

**Integration Points:**
- Can be extended to use `logSecurityEvent` from `src/lib/security-audit.ts` if needed
- Follows same timestamp and metadata patterns as lifecycle events
- Compatible with rg indexing patterns used throughout TES

### ✅ scripts/dev-server.ts: API Endpoint and Dashboard UI

**Status:** Fully Integrated

- **Endpoint:** `POST /api/dev/bump-version` (line ~8777)
- **Dashboard UI:** Version Management section (line ~1489)
- **JavaScript Function:** `bumpVersion()` (line ~4731)

### ✅ All Versioned Files Identified in TES-OPS-004.2

**Status:** Complete

All files listed in `src/config/version-files.ts`:
- `package.json` (canonical source)
- `docs/BETTING-GLOSSARY.md`
- `lib/betting-glossary.ts`
- `lib/constants.ts`
- `templates/glossary.html`
- `scripts/dev-server.ts` (multiple patterns)

## Related Tickets

### TES-OPS-003: Endpoint Checker

**Integration:** Version Consistency Verification

The Endpoint Checker (`/api/dev/endpoints/check`) can verify API version consistency after version bumps.

**How It Works:**
1. Endpoint Checker tests all API endpoints
2. Extracts version metadata from response headers
3. Verifies version consistency across endpoints
4. Reports mismatches or inconsistencies

**Integration Steps:**
1. After version bump, run endpoint checker:
   ```bash
   curl http://localhost:3002/api/dev/endpoints/check | jq '.summary'
   ```
2. Verify all endpoints report the new version
3. Check for version mismatches in the report

**Enhancement Opportunity:**
- Add automatic endpoint check after version bump
- Add version consistency validation to CI/CD pipeline
- Alert on version mismatches

**Example Integration:**
```typescript
// In scripts/bump.ts, after successful bump:
async function verifyVersionConsistency(newVersion: string): Promise<void> {
  try {
    const response = await fetch('http://localhost:3002/api/dev/endpoints/check');
    const data = await response.json();
    
    // Check if all endpoints have consistent versions
    const mismatches = data.endpoints.filter((ep: any) => 
      ep.version && ep.version !== newVersion
    );
    
    if (mismatches.length > 0) {
      console.warn(`⚠️  Version mismatches detected: ${mismatches.length}`);
    }
  } catch (error) {
    console.warn('⚠️  Could not verify version consistency:', error);
  }
}
```

### TES-MON-005: Metrics Integration

**Status:** Future Enhancement

Version bumps can be tracked as operational events in the metrics system.

**Proposed Integration:**
- Track version bumps as operational events
- Monitor version bump frequency
- Track version distribution (major/minor/patch ratios)
- Alert on rapid version changes

**Metrics to Track:**
```typescript
{
  event: 'version_bump',
  type: 'patch' | 'minor' | 'major',
  oldVersion: 'v3.1.0',
  newVersion: 'v3.1.1',
  timestamp: Date.now(),
  user: 'username',
  filesUpdated: 6,
  duration: 1234, // ms
}
```

**Integration Points:**
- Add to metrics endpoint (`/api/dev/metrics`)
- Include in operational dashboard
- Track in time-series database (if available)
- Generate reports on version history

**Example Metrics Endpoint Enhancement:**
```typescript
// In scripts/dev-server.ts
'/api/dev/metrics': async (req) => {
  // ... existing metrics ...
  
  // Add version bump metrics
  const versionBumps = await readVersionBumpLog();
  return jsonResponse({
    // ... existing metrics ...
    versionBumps: {
      total: versionBumps.length,
      byType: {
        major: versionBumps.filter(b => b.type === 'major').length,
        minor: versionBumps.filter(b => b.type === 'minor').length,
        patch: versionBumps.filter(b => b.type === 'patch').length,
      },
      recent: versionBumps.slice(-10),
    },
  });
}
```

### CI/CD Pipelines: Automatic Version Bumping

**Status:** Ready for Integration

The bump utility is designed for CI/CD integration.

**GitHub Actions Example:**
```yaml
name: Version Bump

on:
  push:
    branches: [main]
    paths:
      - 'CHANGELOG.md'

jobs:
  bump-version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Bump Patch Version
        run: bun run scripts/bump.ts patch
      
      - name: Commit Version Bump
        run: |
          git config --local user.email "ci@example.com"
          git config --local user.name "CI Bot"
          git add package.json docs/ lib/ templates/ scripts/dev-server.ts
          git commit -m "chore: bump version [skip ci]" || exit 0
          git push
```

**GitLab CI Example:**
```yaml
bump_version:
  stage: deploy
  script:
    - bun run scripts/bump.ts patch
    - git add package.json docs/ lib/ templates/ scripts/dev-server.ts
    - git commit -m "chore: bump version [skip ci]" || true
    - git push
  only:
    - main
  when: manual
```

**Pre-commit Hook Example:**
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check if version files changed
if git diff --cached --name-only | grep -qE "(package\.json|CHANGELOG\.md)"; then
  echo "⚠️  Version files changed. Run 'bun run scripts/bump.ts patch' to update all version references."
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

**Best Practices:**
1. **Automated Bumps:** Only bump patch versions automatically
2. **Manual Review:** Require manual approval for minor/major bumps
3. **Changelog:** Update CHANGELOG.md before bumping
4. **Tagging:** Create git tags after version bump
5. **Notifications:** Notify team of version changes

## Integration Checklist

- [x] GLOBAL-CONFIG logging pattern compatibility
- [x] dev-server.ts API endpoint integration
- [x] dev-server.ts dashboard UI integration
- [x] All versioned files identified and configured
- [ ] TES-OPS-003 endpoint checker integration (documented)
- [ ] TES-MON-005 metrics integration (documented)
- [ ] CI/CD pipeline integration (ready)

## Next Steps

1. **Immediate:**
   - Test version bump utility in development
   - Verify endpoint checker compatibility
   - Document CI/CD integration process

2. **Short-term:**
   - Add automatic endpoint check after version bump
   - Integrate with metrics system (TES-MON-005)
   - Add version bump notifications

3. **Long-term:**
   - Automated version bumping in CI/CD
   - Version history dashboard
   - Version impact analysis

## References

- [TES-OPS-004 Implementation](./TES-OPS-004-COMPLETION.md)
- [TES-OPS-003 Endpoint Checker](./TES-OPS-003-IMPLEMENTATION.md)
- [Versioning Documentation](./VERSIONING.md)
- [Bun CI/CD Guide](https://bun.sh/docs/ci/github-actions)

