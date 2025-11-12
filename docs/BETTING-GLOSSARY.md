# 📚 Betting Glossary - Enhanced Complete Reference (v2.1.02)

**Last Updated:** 2025  
**Implementation:** `lib/betting-glossary.ts`  
**API Routes:** `/api/glossary/*`  
**Version:** 2.1.02

## Overview

The Betting Glossary is a comprehensive terminology system covering betting types, markets, odds formats, general terms, and responsible gaming compliance. Version 2.1.02 includes enhanced search with relevance ranking, autocomplete suggestions, term relationships, and expanded terminology.

## Statistics

- **Total Terms:** 70+ betting terms (up from 50+)
- **Categories:** 5 categories
- **Search Capabilities:** Ranked full-text search with relevance scoring
- **New Features:** Autocomplete suggestions, term relationships, synonyms support
- **RG Compliance:** All terms marked as RG-compliant

## What's New in v2.0

### Enhanced Search
- **Relevance Ranking:** Search results are scored and ranked by relevance
- **Multi-word Queries:** Better handling of multi-word search queries
- **Synonym Support:** Terms can have alternative names/synonyms
- **Match Type Detection:** Identifies where matches occur (term, abbreviation, definition, etc.)

### Autocomplete Suggestions
- **Prefix Matching:** Get suggestions as you type (minimum 2 characters)
- **Fast Lookups:** Optimized search index for instant suggestions
- **Multiple Sources:** Suggestions from term names, abbreviations, and synonyms

### Term Relationships
- **Related Terms:** Discover connected terms via `relatedTerms` and `seeAlso`
- **Category Connections:** Terms from the same category are linked
- **Knowledge Graph:** Navigate between related concepts

### Expanded Terminology
- **17 New Terms:** Added fractional odds, run line, prop bets, steam, RLM, and more
- **Better Coverage:** More comprehensive coverage of betting terminology

## Categories

### 1. Bet Types (`bet-types`) - 11 terms
- Moneyline (ML)
- Point Spread
- Total (Over/Under)
- Parlay
- Teaser
- Same Game Parlay (SGP)
- Bought Points
- Round Robin
- Pleaser
- If Bet
- Action Reversals

### 2. Markets (`markets`) - 10 terms
- Player Props
- Team Total
- First Half (1H)
- Second Half (2H)
- Live Betting (In-Play)
- Quarter Betting
- Period Betting
- Inning Betting
- Futures Betting
- Season Props

### 3. Odds (`odds`) - 4 terms
- Decimal Odds
- American Odds
- Implied Probability
- Vigorish (Vig)

### 4. General Terms (`general`) - 13 terms
- Cover
- Push
- Bankroll
- Unit
- Juice
- Edge
- Value
- Hedge
- Arbitrage
- Fade
- Chalk
- Dog
- Sharp

### 5. RG Compliance (`rg_compliance`) - 5 terms
- Responsible Gaming (RG)
- Self-Exclusion
- Deposit Limits
- Reality Check
- Problem Gambling

## API Endpoints

### 1. Get Term by ID
```http
GET /api/glossary/term/:termId
```

**Example:**
```bash
curl http://localhost:3002/api/glossary/term/moneyline
```

**Response:**
```json
{
  "term": {
    "id": "moneyline",
    "term": "Moneyline",
    "abbreviation": "ML",
    "category": "bet-types",
    "definition": "A bet on which team or player will win the event...",
    "examples": ["Lakers ML vs Celtics", "Tom Brady ML vs Patrick Mahomes"],
    "relatedTerms": ["spread", "total"],
    "tags": ["basic", "straight-bet"],
    "rgCompliant": true,
    "complexity": "basic"
  }
}
```

### 2. Search Glossary
```http
GET /api/glossary/search?keyword={query}
```

**Parameters:**
- `keyword` (optional): Search query. If omitted, returns all terms.

**Examples:**
```bash
# Get all terms
curl http://localhost:3002/api/glossary/search

# Search for "parlay"
curl http://localhost:3002/api/glossary/search?keyword=parlay

# Search for "spread"
curl http://localhost:3002/api/glossary/search?keyword=spread
```

**Response:**
```json
{
  "keyword": "parlay",
  "terms": [
    {
      "id": "parlay",
      "term": "Parlay",
      "category": "bet-types",
      "definition": "A single bet that combines multiple individual bets...",
      ...
    },
    {
      "id": "same-game-parlay",
      "term": "Same Game Parlay",
      "abbreviation": "SGP",
      ...
    }
  ],
  "count": 2
}
```

**Search Capabilities (Enhanced in v2.0):**
- **Ranked Results:** Results sorted by relevance score (highest first)
- **Exact Matches:** Highest priority (score: 100)
- **Term Name Matches:** High priority (score: 50)
- **Abbreviation Matches:** High priority (score: 80 exact, 40 partial)
- **Synonym Matches:** Medium-high priority (score: 70 exact, 35 partial)
- **Definition Matches:** Medium priority (score: 20)
- **Tag Matches:** Medium priority (score: 15)
- **Example Matches:** Lower priority (score: 5)
- **Multi-word Queries:** Word-by-word matching with cumulative scoring
- **Complexity Boost:** Basic terms get slight score boost (+2)

### 3. Get Terms by Category
```http
GET /api/glossary/category/:category
```

**Available Categories:**
- `bet-types`
- `markets`
- `odds`
- `general`
- `rg_compliance`

**Example:**
```bash
curl http://localhost:3002/api/glossary/category/bet-types
curl http://localhost:3002/api/glossary/category/rg_compliance
```

**Response:**
```json
{
  "category": "bet-types",
  "terms": [
    {
      "id": "moneyline",
      "term": "Moneyline",
      ...
    },
    ...
  ],
  "count": 11
}
```

### 4. Get All Bet-Type Terms
```http
GET /api/glossary/bet-types
```

**Example:**
```bash
curl http://localhost:3002/api/glossary/bet-types
```

**Response:**
```json
{
  "category": "bet_types",
  "terms": [
    {
      "id": "moneyline",
      "term": "Moneyline",
      ...
    },
    ...
  ],
  "count": 13
}
```

### 5. Get Search Suggestions (NEW in v2.0)
```http
GET /api/glossary/suggestions?q={query}&limit={limit}
```

**Parameters:**
- `q` (required): Search query prefix (minimum 2 characters)
- `limit` (optional): Maximum number of suggestions (default: 10)

**Example:**
```bash
curl "http://localhost:3002/api/glossary/suggestions?q=par"
curl "http://localhost:3002/api/glossary/suggestions?q=spread&limit=5"
```

**Response:**
```json
{
  "query": "par",
  "suggestions": [
    "Parlay",
    "Player Props",
    "Period Betting"
  ],
  "count": 3
}
```

### 6. Get Related Terms (NEW in v2.0)
```http
GET /api/glossary/term/:termId/related?limit={limit}
```

**Parameters:**
- `termId` (path): Term ID to get related terms for
- `limit` (optional): Maximum number of related terms (default: 5)

**Example:**
```bash
curl http://localhost:3002/api/glossary/term/moneyline/related
curl http://localhost:3002/api/glossary/term/parlay/related?limit=10
```

**Response:**
```json
{
  "termId": "moneyline",
  "relatedTerms": [
    {
      "id": "spread",
      "term": "Point Spread",
      ...
    },
    {
      "id": "total",
      "term": "Total (Over/Under)",
      ...
    }
  ],
  "count": 2
}
```

## Data Structure

### GlossaryTerm Interface (Enhanced in v2.0)
```typescript
interface GlossaryTerm {
  id: string;                    // Unique identifier (kebab-case)
  term: string;                  // Display name
  abbreviation?: string;         // Optional abbreviation (e.g., "ML", "SGP")
  category: TermCategory;        // One of: 'bet-types' | 'markets' | 'odds' | 'general' | 'rg_compliance'
  definition: string;            // Full definition
  examples?: string[];           // Usage examples
  relatedTerms?: string[];       // Related term IDs (explicit relationships)
  tags?: string[];               // Searchable tags
  rgCompliant?: boolean;         // Responsible gaming compliance flag
  complexity?: 'basic' | 'intermediate' | 'advanced';
  synonyms?: string[];           // NEW: Alternative names for the term
  seeAlso?: string[];            // NEW: Related terms to explore
}
```

### TermCategory Type
```typescript
type TermCategory = 
  | 'bet-types' 
  | 'markets' 
  | 'odds' 
  | 'general' 
  | 'rg_compliance';
```

## Implementation Details

### Registry Pattern
The glossary uses a singleton registry pattern (`BettingGlossaryRegistry`) for efficient access:

```typescript
const registry = BettingGlossaryRegistry.getInstance();
const term = registry.getTerm('moneyline');
const results = registry.search('parlay');
const betTypes = registry.getBetTypes();
```

### Search Algorithm (Enhanced in v2.0)
The search function performs relevance-ranked search with scoring:

**Scoring System:**
1. **Exact Match on Term Name:** Score +100 (highest priority)
2. **Partial Match on Term Name:** Score +50
3. **Exact Match on Abbreviation:** Score +80
4. **Partial Match on Abbreviation:** Score +40
5. **Exact Match on Synonym:** Score +70
6. **Partial Match on Synonym:** Score +35
7. **Multi-word Queries:** Word-by-word matching with cumulative scoring (+10 per word match)
8. **Definition Match:** Score +20
9. **Tag Match:** Score +15
10. **Example Match:** Score +5 (lowest priority)
11. **Complexity Boost:** Basic terms get +2 bonus

Results are automatically sorted by score (highest first), ensuring most relevant terms appear first.

### Performance (Enhanced in v2.0)
- **Initialization:** O(n) where n = number of terms (~70)
  - Builds search index during initialization
- **Search:** O(n) linear scan with scoring (acceptable for ~70 terms)
  - Results automatically sorted by relevance
- **Get by ID:** O(1) Map lookup
- **Get by Category:** O(1) Map lookup
- **Get Suggestions:** O(n) prefix matching (optimized with early termination)
- **Get Related Terms:** O(k) where k = number of related terms (typically < 10)

## Dashboard Integration

The glossary is integrated into the dev server dashboard at `/`:

- **Glossary Overview:** Shows total terms, bet-type count, RG terms count
- **View All Terms:** Modal displaying all glossary terms
- **Search Glossary:** Interactive search with keyword input
- **Bet Types:** Quick access to bet-type terms
- **RG Compliance:** Quick access to responsible gaming terms

## Usage Examples

### JavaScript/TypeScript (Enhanced in v2.0)
```typescript
import { getGlossary } from './lib/betting-glossary.ts';

const glossary = getGlossary();

// Get a specific term
const moneyline = glossary.getTerm('moneyline');

// Search for terms (ranked by relevance)
const parlayResults = glossary.search('parlay');

// Get autocomplete suggestions (NEW)
const suggestions = glossary.getSuggestions('par', 10);

// Get related terms (NEW)
const relatedTerms = glossary.getRelatedTerms('moneyline', 5);

// Get all bet types
const betTypes = glossary.getCategory('bet-types');

// Get category statistics
const stats = glossary.getCategoryStats();
```

### API Usage
```bash
# Get all terms
curl http://localhost:3002/api/glossary/search

# Search for "spread"
curl "http://localhost:3002/api/glossary/search?keyword=spread"

# Get bet types only
curl http://localhost:3002/api/glossary/bet-types

# Get RG compliance terms
curl http://localhost:3002/api/glossary/category/rg_compliance

# Get specific term
curl http://localhost:3002/api/glossary/term/moneyline

# Get search suggestions (NEW in v2.0)
curl "http://localhost:3002/api/glossary/suggestions?q=par"

# Get related terms (NEW in v2.0)
curl http://localhost:3002/api/glossary/term/moneyline/related
```

## Term Examples

### Basic Terms
- **Moneyline:** Simple win/loss bet
- **Point Spread:** Handicap betting
- **Total (O/U):** Over/under betting

### Intermediate Terms
- **Parlay:** Multiple bet combination
- **Teaser:** Adjusted spread parlay
- **Live Betting:** In-game wagering

### Advanced Terms
- **Arbitrage:** Risk-free profit opportunity
- **Edge:** Advantage over bookmaker
- **Action Reversals:** Hedging strategy

## Related Files

- **Implementation:** `lib/betting-glossary.ts`
- **API Routes:** `scripts/dev-server.ts` (lines 8596-8722)
- **Dashboard UI:** `scripts/dev-server.ts` (lines 3569-3615, 4483-4545)

## New Terms Added in v2.0

### Bet Types
- **Run Line** - Baseball equivalent of point spread
- **Over** - Betting that total exceeds specified number
- **Under** - Betting that total is below specified number

### Markets
- **Prop Bet** - Bet on specific event or outcome
- **Game Props** - Proposition bets related to game events

### Odds
- **Fractional Odds** - UK odds format (e.g., 5/1, 2/1)

### General Terms
- **Favorite** - Team/player expected to win
- **Underdog** - Team/player expected to lose
- **Longshot** - Low probability, high payout bet
- **Expected Value (EV)** - Average win/loss per bet
- **Steam** - Rapid line movement from sharp bettors
- **Reverse Line Movement (RLM)** - Line moves opposite to public betting
- **Public Money** - Bets from casual/recreational bettors

### RG Compliance
- **Cooling-Off Period** - Temporary break from gambling
- **Spending Limits** - Maximum wagering amounts
- **Time Limits** - Maximum session time limits

## Future Enhancements

Potential improvements:
- [x] Enhanced search with relevance ranking ✅
- [x] Autocomplete suggestions ✅
- [x] Term relationships ✅
- [x] Expanded terminology (17 new terms) ✅
- [ ] Add more terms (sports-specific, international betting)
- [ ] Add term popularity/usage tracking
- [ ] Add term translations (multi-language support)
- [ ] Add term history/changelog
- [ ] Add term validation against bookmaker APIs
- [ ] Add fuzzy search for typos
- [ ] Add search analytics

## Notes

- All terms are marked as `rgCompliant: true` by default
- Terms include complexity levels for educational purposes
- Related terms create a knowledge graph for navigation
- Examples provide practical usage context
- Tags enable advanced filtering and search

