# NZ InfraWatch — Claude Code Build Instructions

> **What this document is**: A complete handoff for Claude Code to build a New Zealand infrastructure tracking dashboard, modelled on the existing Sydney InfraWatch but built from scratch with a proper modular architecture. Read this entire document before writing any code.

> **Working convention**: Read this document in full. Then read the Sydney InfraWatch reference files (HANDOFF.md and sydney-infrawatch.html) from the GitHub repo. Understand the Sydney version's architecture, data structures, and conventions before building the NZ equivalent. Do NOT copy-paste the Sydney file — build fresh with the same design principles but NZ-specific data and features.

---

## 0. Reference materials — read these first

### Sydney InfraWatch (the reference implementation)

The Sydney version lives in a GitHub repo. Before building anything:

1. **Read `HANDOFF.md`** in the repo root — it documents every architectural decision, data structure, convention, and feature of the Sydney version. Pay special attention to:
   - Section 1 (Current state) — the data schema for projects, electorates, suburbs, and scoring
   - Section 2 (Architectural decisions) — why certain choices were made
   - Section 8 (Conventions) — naming, casing, score clamping patterns
   - Section 10 (Project conventions) — surgical edits, verify-before-trust, document approximations

2. **Read `sydney-infrawatch.html`** — the actual dashboard. Study:
   - The `const P` array structure (project register)
   - `PROJECT_IMPACT` structure (catchment suburbs, property uplift)
   - `POLICY_IMPACT` structure (party stances on infrastructure policies)
   - `ORIGINAL_PROBS` and probability constants
   - The Leaflet pane z-ordering system
   - The election simulator logic
   - The snowflake/Infra Score computation

**Do NOT replicate the single-file architecture.** Sydney InfraWatch's single-file HTML was a prototyping decision that hit its limits at 2.89 MB. NZ InfraWatch starts with the modular structure from day one.

### NZ-specific strategy documents (in this repo)

- `NZ-LAUNCH-STRATEGY.md` — market analysis, monetization plan, content calendar, timeline
- `election-timeline.html` — interactive calendar of all AU/NZ elections through 2030 (reference for election data)

---

## 1. What you're building

**NZ InfraWatch**: A web dashboard that maps New Zealand's infrastructure projects, overlays electoral boundaries, and lets users simulate the impact of the November 2026 general election on infrastructure pipelines.

### Target users
- NZ residents wanting to know what's being built near them
- Property investors tracking infrastructure-driven growth areas
- Journalists covering infrastructure policy ahead of the election
- Community advocates tracking project delays and cost overruns

### Core proposition
"What happens to YOUR local infrastructure projects if the government changes in November?"

---

## 2. Data sources — where to get everything

### A. Infrastructure projects (THE CORE)

**Te Waihanga National Infrastructure Pipeline**
- URL: `https://tewaihanga.govt.nz/the-pipeline/downloadable-data`
- Format: CSV download, CC BY 4.0 licence (must credit "National Infrastructure Pipeline – produced by Te Waihanga")
- Content: 12,000+ infrastructure initiatives from 130 contributors
- Fields include: project name, contributing organisation, region, sector, status (planning/procurement/construction/complete), funding status, estimated cost, projected spend by year
- Updated: quarterly
- **Action**: Download the CSV. Write a processing script (`scripts/process-pipeline.mjs`) that:
  1. Parses the CSV
  2. Filters to projects with estimated cost > $1M (exclude tiny maintenance items)
  3. Geocodes by region (map NZ region names to representative lat/lon coordinates — see region centroids below)
  4. Categorises by sector (transport, water, education, health, energy, housing, telecommunications, other)
  5. Outputs `public/data/pipeline.json`

**Region centroids for geocoding** (use these as default coordinates when projects only have a region, not a specific location):
```json
{
  "Northland": [-35.73, 174.32],
  "Auckland": [-36.85, 174.76],
  "Waikato": [-37.79, 175.28],
  "Bay of Plenty": [-37.69, 176.17],
  "Gisborne": [-38.66, 178.02],
  "Hawke's Bay": [-39.49, 176.91],
  "Taranaki": [-39.06, 174.08],
  "Manawatū-Whanganui": [-39.93, 175.05],
  "Wellington": [-41.29, 174.78],
  "Tasman": [-41.27, 172.85],
  "Nelson": [-41.27, 173.28],
  "Marlborough": [-41.51, 173.95],
  "West Coast": [-42.45, 171.21],
  "Canterbury": [-43.53, 172.64],
  "Otago": [-45.03, 169.69],
  "Southland": [-46.41, 168.35],
  "National / Multi-region": [-41.0, 175.0]
}
```

**For the top 50-100 most significant projects** (major transport, water, and housing projects over $100M), manually assign precise lat/lon coordinates and add election risk tags. These are the projects that will have detailed drill-down panels. The rest can use region centroids as approximate locations.

### B. Electoral data

**Electorate boundaries (2025 redistribution)**
- Source: Stats NZ Geographic Data Service — `https://datafinder.stats.govt.nz/`
- Search for "General Electoral District 2025" and "Māori Electoral District 2025"
- Format: GeoJSON or Shapefile (download GeoJSON)
- Content: 65 general electorates + 7 Māori electorates = 72 total
- **Action**: Download both GeoJSON files, combine into `public/data/electorates.geojson`

**2023 election results**
- Source: Elections NZ — `https://elections.nz/`
- Download: Electorate-level results (candidate votes + party votes) as CSV
- Also available: Booth/polling-place-level results with geographic coordinates from `https://catalogue.data.govt.nz/` (search for "Voting" datasets)
- NZ uses MMP (Mixed Member Proportional): voters cast TWO votes — electorate vote (local MP) and party vote (proportional representation)
- **Action**: Process into `public/data/election-results-2023.json` with structure:
```json
{
  "electorates": {
    "Auckland Central": {
      "type": "general",
      "mp": "Chlöe Swarbrick",
      "party": "Green",
      "margin": 4.2,
      "partyVote": { "Labour": 32.1, "National": 28.4, "Green": 18.2, "ACT": 8.1, "NZFirst": 5.3, "other": 7.9 },
      "candidateVote": { "Chlöe Swarbrick": 42.1, "..": "..." }
    }
  },
  "national": {
    "partyVote": { "National": 38.93, "Labour": 26.91, "Green": 11.60, "ACT": 8.64, "NZFirst": 6.08 },
    "seats": { "National": 48, "Labour": 34, "Green": 15, "ACT": 11, "NZFirst": 8, "TPM": 6 }
  }
}
```

**Party colors** (use these consistently everywhere):
```json
{
  "National": "#00529F",
  "Labour": "#D82A20",
  "Green": "#098137",
  "ACT": "#FDE401",
  "NZ First": "#000000",
  "Te Pāti Māori": "#B2001A",
  "TOP": "#09B1A3"
}
```

### C. Council boundaries (territorial authorities)

- Source: Stats NZ — search for "Territorial Authority 2024" on datafinder
- Format: GeoJSON
- Content: 67 territorial authorities
- **Action**: Download, save as `public/data/councils.geojson`
- Note: NZ government announced council amalgamation in May 2026 — regional councils will be abolished by 2028. Flag this in the UI. Current boundaries are still valid for the November 2026 election.

### D. Regional council boundaries

- Source: Stats NZ — search for "Regional Council 2024" on datafinder
- Format: GeoJSON
- Content: 16 regions (11 regional councils + 5 unitary authorities that serve as both)
- **Action**: Download, save as `public/data/regions.geojson`

### E. Property data (PHASE 2 — not MVP)

Not in the initial build. When you add it later:
- **LINZ Data Service** (`https://data.linz.govt.nz/`) — property sales records, title boundaries. Free, requires registration.
- **REINZ** — monthly median prices by region and district. Published in reports, no free API.
- **homes.co.nz** — free suburb-level estimates (web scrape only, no API)

---

## 3. Project structure

```
nz-infrawatch/
├── src/
│   ├── main.js                    # entry point: init map, toolbar, state
│   ├── data/
│   │   ├── projects.js            # load + filter pipeline data
│   │   ├── electorates.js         # load electorate boundaries + results
│   │   ├── councils.js            # load TA boundaries
│   │   └── regions.js             # load regional council boundaries
│   ├── layers/
│   │   ├── projects.js            # project markers on map
│   │   ├── electorates.js         # electorate polygon overlays
│   │   ├── councils.js            # council boundary overlays
│   │   └── regions.js             # regional council overlays
│   ├── features/
│   │   ├── election-sim.js        # election swing simulator (MMP-adapted)
│   │   ├── risk-tagger.js         # political vulnerability scoring per project
│   │   ├── project-detail.js      # side panel drill-down
│   │   └── filter-toolbar.js      # sector/region/status/value filters
│   ├── ui/
│   │   ├── modal.js               # generic modal system
│   │   ├── toolbar.js             # top toolbar with toggles
│   │   └── legend.js              # map legend
│   └── styles/
│       └── main.css
├── public/
│   ├── index.html                 # thin shell, loads main.js
│   └── data/
│       ├── pipeline.json          # processed Te Waihanga data
│       ├── electorates.geojson    # 2025 electorate boundaries
│       ├── election-results-2023.json
│       ├── councils.geojson       # 67 territorial authorities
│       ├── regions.geojson        # 16 regions
│       └── top-projects.json      # manually enriched top 50-100 projects
├── scripts/
│   ├── process-pipeline.mjs       # Te Waihanga CSV → pipeline.json
│   ├── process-elections.mjs      # Elections NZ CSV → election-results-2023.json
│   └── download-boundaries.mjs    # Fetch GeoJSON from Stats NZ
├── package.json
├── vite.config.js
├── HANDOFF-NZ.md                  # this file
├── NZ-LAUNCH-STRATEGY.md
└── README.md
```

---

## 4. Features to build — in order

### Phase 1: Map + Projects (Days 1-3)

**4.1 Base map**
- Leaflet with CartoDB Voyager basemap (same as Sydney version): `https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png`
- Default center: `[-41.0, 174.0]` (central NZ), zoom: `6`
- Zoom range: 5–18

**4.2 Project markers**
- Plot all filtered pipeline projects on the map
- Marker size proportional to estimated cost (scale: $1M = small, $1B+ = large)
- Marker color by sector:
  ```
  Transport:        #3b82f6 (blue)
  Water:            #06b6d4 (cyan)
  Education:        #8b5cf6 (purple)
  Health:           #ef4444 (red)
  Housing:          #f97316 (orange)
  Energy:           #22c55e (green)
  Telecommunications: #6366f1 (indigo)
  Other:            #6b7280 (gray)
  ```
- White border on markers (2px), drop shadow for depth
- On click: open side panel with full project details

**4.3 Filter toolbar**
- Filters (all multi-select):
  - Region (16 NZ regions)
  - Sector (8 categories above)
  - Status (Planning, Procurement, Under Construction, Complete)
  - Funding status (Fully funded, Part funded, Confirmed source, No confirmed source)
  - Value range slider ($1M – $10B+)
- Show count of visible projects: "Showing 247 of 12,000 projects"
- Persist filter state in URL hash for shareability

**4.4 Project detail panel**
- Slide-in panel from the right (same pattern as Sydney InfraWatch)
- Show: name, organisation, sector, region, status, funding status, estimated cost, projected spend timeline (sparkline or bar chart by year)
- Include election risk badge (see 4.7)
- "Share this project" button → copies URL with project ID in hash

### Phase 2: Electoral overlays (Days 4-5)

**4.5 Electorate boundaries**
- Toggle layer showing all 72 electorates
- Color-coded by winning party (2023 results) with ~0.3 opacity fill
- On hover: show electorate name, MP, party, margin
- Separate toggle for Māori electorates (overlay on top of general)
- Use same pane z-ordering as Sydney:
  ```
  regionsPane:      300
  councilsPane:     310
  electoratesPane:  400
  markersPane:      650
  ```

**4.6 Marginal seat highlighting**
- Toggle to highlight electorates with margin < 5%
- Use a pulsing border or halo effect (same as Sydney's marginal seat halos)
- These are the seats most likely to flip — and therefore the projects most at risk

### Phase 3: Election simulator + risk tagging (Days 6-8)

**4.7 Election risk tagger**

Every project in the top 100 gets a political vulnerability score:

```
RISK: EXTREME (🔴) — Project was announced by current government AND has no confirmed 
                      funding AND is in planning phase. Would almost certainly be cancelled 
                      under a change of government.

RISK: HIGH (🟠)    — Project is associated with current government's policy agenda AND 
                      is not yet under construction. Likely to be reviewed/paused.

RISK: MEDIUM (🟡)  — Project is under construction but funding is only partly committed.
                      Could face scope reduction or delay.

RISK: LOW (🟢)     — Project is under construction with full funding committed. 
                      Would likely continue regardless of government change.

RISK: SAFE (⚪)    — Project is near-complete or has bipartisan support.
```

Tag the top 100 projects manually using these criteria plus knowledge of NZ political context:
- Projects announced under the current National/ACT/NZ First coalition (2023–present): roads, defence, PPPs → at risk under Labour
- Projects inherited from previous Labour government that survived: some transport, Three Waters replacement (Local Water Done Well) → would be reviewed under Labour who may resurrect their own versions
- Projects with strong regional/bipartisan support: hospital rebuilds, school construction → generally safe

**4.8 Election simulator (MMP-adapted)**

NZ uses MMP, which is fundamentally different from Australia's preferential voting. The simulator needs to:

1. Accept a **party vote swing** input (e.g., "National −5%, Labour +3%, Green +2%")
2. Apply swing to the 2023 party vote nationally
3. Recalculate seat allocation using the Sainte-Laguë method:
   - 72 electorate seats allocated to winning candidates (simple plurality in each electorate)
   - Remaining ~48 seats allocated proportionally from party lists to reach proportional representation
   - 5% threshold: parties below 5% party vote get no list seats (unless they win an electorate)
4. Show the resulting Parliament composition
5. Indicate which government coalition becomes possible (Labour+Green vs National+ACT+NZFirst, etc.)
6. Highlight projects whose risk level changes under the simulated result

**Simplified electorate swing model**: For the MVP, assume uniform swing across all electorates (same as Sydney's uniform swing model). Adjust each electorate's candidate vote by the national party vote swing. This isn't perfect for MMP but is good enough for an indicative simulator.

**UI**: 
- Slider per major party (National, Labour, Green, ACT, NZ First, TPM)
- Constrained so total always sums to ~100%
- Real-time update of seat count bar chart
- "What changes?" panel listing projects that flip risk category

**4.9 "What's at risk" toggle**
- Map toggle that dims all SAFE/LOW projects and highlights EXTREME/HIGH projects
- Side panel showing a ranked list of most-at-risk projects by estimated cost
- Sharable as a URL: `nzinfrawatch.co.nz/#at-risk`

### Phase 4: Polish + launch features (Days 9-12)

**4.10 News feed** (manual curation for launch)
- Curate 20-30 real recent articles about NZ infrastructure from:
  - NZ Herald, Stuff, RNZ, The Spinoff, Greater Auckland, interest.co.nz, Newsroom
- Structure matches Sydney's ARTICLES format:
  ```json
  {
    "id": "a1",
    "headline": "City Rail Link opening delayed to 2026",
    "source": "NZ Herald",
    "date": "2026-05-15",
    "url": "https://...",
    "projectIds": [42, 43],
    "summary": "..."
  }
  ```
- Modal view accessed via 📰 button in toolbar

**4.11 Sources & Methodology modal**
- Document every data source, computation method, and caveat
- Te Waihanga attribution (required by licence): "National Infrastructure Pipeline – produced by Te Waihanga"
- Electoral data attribution: "Electoral Commission / Stats NZ"
- Clearly state that election risk tags are editorial assessments, not predictions

**4.12 Council amalgamation banner**
- Persistent but dismissable info banner at top of map:
  > "⚠️ NZ local government is being restructured. The government has confirmed regional councils will be abolished before 2028 elections, and territorial authorities may be merged. Current council boundaries shown here may change. [Learn more]"

**4.13 Responsive design**
- Must work on mobile (many users will access via social media links on phones)
- Toolbar collapses to hamburger menu on mobile
- Project detail panel goes full-width on mobile
- Election simulator stacks vertically on mobile

---

## 5. Key conventions (inherited from Sydney InfraWatch)

- **Higher score = better outlook** (if you add scoring later)
- **Score clamping**: `Math.max(1, Math.min(5, Math.round(...)))` — always 1–5 integer
- **Surgical edits over rewrites** — when modifying existing code, change only what needs changing
- **Verify-before-trust** — always check rendered output after changes
- **Document approximations** — if a data point is estimated or approximated, say so in Sources & Methodology
- **Investor framing** — every feature should help answer "how does this infrastructure affect property/liveability in this area?"
- **Real data only** — never fabricate project details, costs, timelines, or election results. If you don't have the data, leave the field empty or mark it as "data unavailable"

---

## 6. Tech stack

- **Bundler**: Vite
- **Language**: Vanilla JS (no React/Vue/Angular — keep it simple and fast)
- **Map**: Leaflet 1.9+ with CartoDB Voyager tiles
- **Styling**: Plain CSS with CSS custom properties for theming
- **Fonts**: DM Sans (body) + DM Mono (data/numbers) — loaded from Google Fonts
- **Charts**: If needed for sparklines, use a lightweight lib like uPlot or hand-roll SVG
- **Testing**: Vitest
- **Linting**: ESLint + Prettier
- **Hosting target**: Cloudflare Pages (free tier)

---

## 7. Data processing scripts

### `scripts/process-pipeline.mjs`

```javascript
// Pseudocode — implement this:
// 1. Read Te Waihanga CSV from ./raw-data/pipeline.csv
// 2. Parse CSV rows
// 3. Filter: estimated_cost > 1_000_000 (skip sub-$1M maintenance)
// 4. Map region names to centroids (use REGION_CENTROIDS above)
// 5. Categorise sector into standard categories
// 6. Output: public/data/pipeline.json
//
// Output schema per project:
// {
//   id: number,                    // sequential
//   name: string,                  // project name from CSV
//   org: string,                   // contributing organisation
//   region: string,                // NZ region name
//   sector: string,                // standardised sector
//   status: string,                // Planning | Procurement | Under Construction | Complete
//   fundingStatus: string,         // Fully funded | Part funded | Confirmed source | No source
//   estimatedCost: number,         // in NZD
//   lat: number,                   // from region centroid or manual override
//   lon: number,
//   spendByYear: { "2024": n, "2025": n, ... },
//   electionRisk: string|null,     // null for auto, manual override for top projects
//   manualCoords: boolean          // true if lat/lon was manually set (not region centroid)
// }
```

### `scripts/process-elections.mjs`

```javascript
// 1. Read Elections NZ 2023 results CSV
// 2. Parse electorate-level results (candidate votes + party votes per electorate)
// 3. Calculate margin for each electorate (winner's lead in percentage points)
// 4. Output: public/data/election-results-2023.json (schema in section 2B above)
```

---

## 8. Election simulator — MMP implementation notes

NZ's MMP system allocates 120 seats total:
- 72 electorate seats (65 general + 7 Māori) — won by plurality (first past the post)
- 48 list seats — allocated to parties proportionally using Sainte-Laguë method

**Sainte-Laguë allocation algorithm**:
```
For each party that clears the 5% threshold (or wins an electorate seat):
  1. Calculate quotient = party_votes / (2 * seats_already_allocated + 1)
  2. Award next list seat to party with highest quotient
  3. Repeat until all 48 list seats filled
  4. If a party won MORE electorate seats than their proportional entitlement, 
     they keep the extra seats ("overhang") and Parliament gets bigger
```

For the simulator:
1. Start with 2023 actual party vote percentages
2. Apply user's swing adjustments
3. For electorate seats: assume uniform swing applied to each electorate's candidate votes
4. For list seats: run Sainte-Laguë on adjusted party vote
5. Show new Parliament composition and possible coalition arrangements

**Coalition logic** (simplified):
- National-led: National + ACT (+ NZ First if needed)
- Labour-led: Labour + Green (+ TPM if needed)
- If neither bloc reaches 61 seats, indicate "no clear majority"

---

## 9. Top projects to manually enrich (election risk + precise coordinates)

These are the NZ infrastructure projects that MUST have precise coordinates and election risk tags. Research each one, find its actual location, and tag its political vulnerability:

### Transport
1. City Rail Link (Auckland) — ~$5.5B, under construction
2. Auckland Light Rail (cancelled by current govt — but would Labour revive it?)
3. Eastern Busway (Auckland) — stages under construction
4. Penlink (Auckland) — under construction
5. Mill Road (Auckland) — under construction / planning
6. Waikato Expressway completion
7. Tauranga Northern Link
8. Let's Get Wellington Moving replacement projects
9. Christchurch transport projects
10. Hamilton section of Waikato Expressway

### Water
11. Local Water Done Well (replacement for Three Waters — nationwide)
12. Wellington water infrastructure (pipes, reservoirs)
13. Auckland water/wastewater upgrades (Watercare)
14. Christchurch water infrastructure
15. Tauranga/Western Bay water

### Health
16. New Dunedin Hospital — ~$3B+, controversial cost blowouts
17. Whangārei Hospital redevelopment
18. Nelson Hospital redevelopment
19. Hillmorton Hospital (Christchurch)
20. Various DHB capital projects

### Education
21. School property portfolio (nationwide, multiple sites)
22. University capital projects (Auckland, Otago, Canterbury)

### Energy
23. NIWA/Transpower grid upgrades
24. Various renewable energy projects
25. Lake Onslow (cancelled by current govt — Labour revival?)

### Housing
26. Kāinga Ora housing developments (nationwide)
27. Auckland Housing Programme
28. Various council-led housing

### Defence / Other
29. Defence estate modernisation
30. Corrections facility upgrades

**For each**: set `lat`, `lon`, `electionRisk` (extreme/high/medium/low/safe), and a brief `riskRationale` explaining why.

---

## 10. Verification checklist — run before calling it done

Before presenting the MVP as complete, verify:

- [ ] Map loads centered on NZ with Voyager basemap
- [ ] Pipeline projects render as colored markers (at least 200 visible with default filters)
- [ ] Clicking a project opens a detail panel with real data
- [ ] Filter toolbar filters by region, sector, status, and value range
- [ ] Project count updates when filters change
- [ ] Electorate boundaries toggle on/off, colored by party
- [ ] Hovering an electorate shows name, MP, party, margin
- [ ] Māori electorate overlay toggles independently
- [ ] Marginal seats (margin < 5%) highlight correctly
- [ ] Election simulator accepts party vote swings
- [ ] Simulator recalculates seat counts using Sainte-Laguë
- [ ] "What's at risk" toggle dims safe projects and highlights at-risk ones
- [ ] Council boundaries toggle on/off
- [ ] Regional council boundaries toggle on/off (with abolition warning)
- [ ] News modal shows curated articles
- [ ] Sources & Methodology modal documents all data sources
- [ ] Council amalgamation banner displays and is dismissable
- [ ] URL hash updates with filter state and selected project
- [ ] Mobile responsive: toolbar collapses, panels stack
- [ ] `node --check` passes on all JS files
- [ ] `npm run build` succeeds (Vite production build)
- [ ] No fabricated data — every project, coordinate, and election result is real
- [ ] Te Waihanga attribution present in Sources & Methodology

---

## 11. Goal command for Claude Code

Use this as your initial prompt when starting Claude Code in the project directory:

```
Read HANDOFF-NZ.md in full. This is the build specification for NZ InfraWatch — a New Zealand infrastructure tracking dashboard modelled on the Sydney InfraWatch in our GitHub repo.

Your goal: Build the complete NZ InfraWatch MVP as specified in the handoff document. Work through the phases in order:

1. Set up the project structure (Vite + vanilla JS + Leaflet)
2. Download and process the Te Waihanga pipeline CSV into pipeline.json
3. Download NZ electorate boundaries (2025) and 2023 election results
4. Download council and regional council boundaries
5. Build the map with project markers, filters, and detail panels
6. Add electoral overlays with party coloring and marginal seat highlighting
7. Build the MMP election simulator with Sainte-Laguë seat allocation
8. Add election risk tags to top projects
9. Build the "What's at risk" toggle view
10. Add news feed, Sources & Methodology modal, and council amalgamation banner
11. Make it mobile responsive
12. Run the verification checklist from section 10

Reference the Sydney InfraWatch repo for architectural patterns, but build fresh for NZ. Do NOT create a single-file HTML — use the modular structure specified in section 3.

Start by confirming you've read and understood the full handoff, then begin with the project scaffolding.
```

---

## 12. After the MVP — what comes next

Once the MVP is live and verified:

1. **Email alert system** — Cloudflare Workers + Buttondown for project status change notifications
2. **Property overlay** — LINZ sales data mapped to suburbs near infrastructure projects  
3. **Booth-level political heatmap** — 2023 polling place results as heat circles (same as Sydney's booth layer)
4. **Infra Score** — NZ-adapted version of Sydney's 5-axis snowflake scoring
5. **Live news feed** — Cloudflare Worker aggregating RSS from NZ Herald, RNZ, Stuff, The Spinoff, Greater Auckland
6. **Historical project tracking** — compare Te Waihanga quarterly snapshots to show which projects were added/removed/changed over time
7. **Post-election update** — after 7 Nov 2026, update results, recalculate all risk tags, publish "what actually changed" analysis

---

*Document version: 1.0 — 28 May 2026*
*Author: Jesse (via Claude research session)*
*Context: Part of the InfraWatch product family. Sydney version exists. NZ is the second market.*
