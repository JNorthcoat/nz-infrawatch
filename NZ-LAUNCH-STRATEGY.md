# InfraWatch NZ — Launch Strategy

> Solo dev, bootstrapped, <$200/month infra, targeting $0 → $10K MRR.
> Leveraging existing Sydney InfraWatch architecture (single-file HTML → migrating to proper stack).
> NZ general election: **7 November 2026** — 5 months away. That's the launch window.

---

## 1. Why NZ, why now

### The election catalyst

NZ's 7 Nov 2026 election is a once-in-3-years marketing event for an infrastructure tracker. Polls show Labour leading National, which means a potential government change and **another round of infrastructure policy reversals**. Last time (2023→2024), the incoming National government:

- Cancelled Auckland Light Rail ($229M sunk, zero track laid)
- Scrapped Three Waters reform ($1.2B spent)
- Killed Let's Get Wellington Moving ($167M spent)
- Cancelled the iRex ferry replacements (hundreds of millions)
- Total wasted: ~$2B+

If Labour wins in November 2026, expect the reverse: roads-first agenda rolled back, transit/density projects revived, different regions prioritized. **Every NZ voter, property investor, and infrastructure professional will want to know: "What happens to MY local projects if the government changes?"**

That's your product.

### The data advantage

NZ has something Australia doesn't: **a single, centralized, open-data infrastructure pipeline.**

- **Te Waihanga National Infrastructure Pipeline**: 12,000+ initiatives from 130 contributors, updated quarterly, downloadable as CSV under CC BY 4.0 license
- Includes: project name, contributing org, region, sector, status (planning/procurement/construction/complete), funding status, estimated cost, projected spend by year
- Source: `tewaihanga.govt.nz/the-pipeline/downloadable-data`

In Sydney, you had to manually curate 64 projects. In NZ, you download 12,000 in one CSV. The data layer that took weeks in Sydney takes **one afternoon** in NZ.

### The competitive vacuum

NZ has:
- Te Waihanga's own pipeline search tool (functional but government-UX, no alerts, no property overlay, no election analysis)
- No resident-facing infrastructure tracker for any NZ city
- No tool connecting infrastructure projects to property impact or electoral risk
- No election scenario simulator for infrastructure

You'd be first to market with zero incumbents.

---

## 2. Product definition — NZ InfraWatch MVP

### What to ship (2-week MVP)

Build a **lighter** version than Sydney InfraWatch. Strip the complexity, keep the hooks.

#### Core features (Week 1)

| Feature | Description | Data source |
|---|---|---|
| **Project map** | All Te Waihanga pipeline projects plotted on a Leaflet map, colored by sector (transport, water, education, health, energy), sized by value | Te Waihanga CSV |
| **Filter toolbar** | Filter by: region, sector, status (planning/procurement/construction), funding status, value range | Te Waihanga CSV |
| **Project detail panel** | Click a project → side panel with: name, org, sector, status, funding, estimated cost, projected spend timeline | Te Waihanga CSV |
| **Election risk flag** | Each project tagged with political vulnerability score (high/medium/low) based on: which party announced it, funding status, whether it survived the last transition | Manual curation for top 50 projects |

#### Growth features (Week 2)

| Feature | Description | Data source |
|---|---|---|
| **Electorate overlay** | 72 electorate boundaries (65 general + 7 Māori) on the map, colored by current party | Stats NZ GeoJSON + Elections NZ 2023 results |
| **Election simulator** | Uniform swing slider → shows which seats flip, which projects fall in changed electorates | 2023 booth-level results CSV |
| **"What's at risk" view** | Toggle to show only projects flagged as politically vulnerable under a government change scenario | Manual tags + simulator output |
| **Email alert signup** | "Get notified when projects in your area change status" — Mailchimp/Buttondown free tier | n/a |

#### Explicitly NOT in MVP

- Property price overlays (add in v2 once you have users)
- Booth-level heatmaps (complexity not justified yet for NZ's smaller electorate count)
- Travel-time choropleth (Sydney-specific feature)
- Infra Score / snowflake (v3, needs NZ-specific calibration)
- Council-level boundaries (NZ has 67 territorial authorities — add later)
- News feed (curate manually for launch, automate later)

### Architecture decision

**Don't repeat the single-file mistake.** For NZ, go straight to:

```
nz-infrawatch/
├── index.html
├── css/
│   └── main.css
├── js/
│   ├── app.js          # init, toolbar, state
│   ├── map.js           # Leaflet setup, layers
│   ├── projects.js      # project data + rendering
│   ├── electorates.js   # boundary overlays
│   └── simulator.js     # election swing logic
├── data/
│   ├── pipeline.json    # processed Te Waihanga CSV
│   ├── electorates.geojson
│   └── results-2023.json
└── scripts/
    └── refresh-pipeline.js  # quarterly data refresh script
```

Host on **Cloudflare Pages** (free tier, unlimited bandwidth). Data is static JSON committed to the repo. Total infra cost: **$0** until you need a backend for alerts.

When you add email alerts, use **Cloudflare Workers** (free tier: 100K requests/day) + **Buttondown** (free up to 100 subscribers, $9/month after).

---

## 3. Data sourcing — full inventory

### Infrastructure projects (THE CORE)

| Source | What you get | Format | Cost | Update frequency |
|---|---|---|---|---|
| **Te Waihanga Pipeline** | 12,000+ projects: name, org, region, sector, status, funding, cost, spend projections | CSV download, CC BY 4.0 | Free | Quarterly |
| **Te Waihanga IPP** | Priority-ranked national infrastructure proposals (subset of pipeline) | Web portal | Free | As published |
| **NZTA 10-year pipeline** | Transport-specific projects with regional breakdown | Contributed to Te Waihanga | Free | Quarterly |
| **Waka Kotahi project pages** | Individual transport project updates, community notifications | Web scrape | Free | Ongoing |

**Action**: Download the Te Waihanga CSV immediately. Parse it. The heavy lifting is filtering 12,000 initiatives down to the ~200-500 that matter to residents (exclude tiny maintenance items, internal programs, etc.).

### Electoral data

| Source | What you get | Format | Cost |
|---|---|---|---|
| **Stats NZ Geographic Boundary Viewer** | 2025 electorate boundaries (general + Māori) as GeoJSON/Shapefile | GeoJSON download | Free |
| **Elections NZ 2023 results** | Booth-level and electorate-level voting results, candidate votes, party votes | CSV download | Free |
| **data.govt.nz** | Polling place coordinates, referendum results | CSV/TXT | Free |

**Action**: Download 2025 electorate GeoJSON from Stats NZ (new boundaries for the 2026 election). Merge with 2023 results at electorate level. You'll need to map old electorates to new boundaries for the simulator — use meshblock-level data from Stats NZ as the bridge.

### Property data (v2, not MVP)

| Source | What you get | Format | Cost |
|---|---|---|---|
| **REINZ** | Monthly median prices by region and district | Published reports, no free API | Regional only (not suburb-level) without paid access |
| **homes.co.nz** | Free suburb-level estimates, market trends | Web (no API) | Free to browse |
| **PropertyValue.nz** | Government valuations (RV/CV) by address | Web search | Free to browse |
| **LINZ Data Service** | Title records, property boundaries, sales data | API + bulk download | Free (registration required) |
| **QV (Quotable Value)** | Council valuations, suburb trends | Web + some data products | Free browse, paid bulk |

**Recommended for v2**: Use LINZ Data Service for actual sales records (free, comprehensive) to calculate suburb medians. Supplement with homes.co.nz estimates for current values.

---

## 4. Go-to-market — the election play

### Timeline (Today → 7 Nov 2026)

```
TODAY (25 May) ─────────────────────────────── ELECTION (7 Nov)
  │                                                    │
  ├─ Week 1-2 (May 25 – Jun 7): Build MVP              │
  │   └─ Te Waihanga data ingested                     │
  │   └─ Map + filters + project detail working        │
  │   └─ Election risk flags on top 50 projects        │
  │                                                    │
  ├─ Week 3 (Jun 8-14): Electoral overlay + simulator   │
  │   └─ 2025 electorate boundaries loaded             │
  │   └─ Swing simulator functional                    │
  │   └─ "What's at risk" toggle working               │
  │                                                    │
  ├─ Week 4 (Jun 15-21): Polish + soft launch           │
  │   └─ Landing page with email capture               │
  │   └─ Share on NZ Twitter/X, Reddit r/newzealand    │
  │   └─ Post on Greater Auckland blog / The Spinoff   │
  │                                                    │
  ├─ Jun-Aug: Content + audience building               │
  │   └─ Weekly "project risk update" posts             │
  │   └─ "5 projects that won't survive a Labour win"  │
  │   └─ "What the NZ Infrastructure Plan means for    │
  │       your suburb" — suburb-by-suburb breakdowns    │
  │                                                    │
  ├─ Sep: Launch premium tier                           │
  │   └─ Email alerts on project status changes        │
  │   └─ Property investor overlay (v2 features)       │
  │   └─ $9/month or $79/year                          │
  │                                                    │
  ├─ Oct: Election season peak                          │
  │   └─ "Election infrastructure scorecard" —          │
  │      which party's manifesto helps your area?      │
  │   └─ Media outreach to NZ Herald, Stuff, RNZ,     │
  │      The Spinoff, Greater Auckland, interest.co.nz │
  │   └─ Peak traffic + conversion window              │
  │                                                    │
  └─ Nov 7: ELECTION DAY                               │
      └─ Real-time "what just changed" analysis        │
      └─ Post-election: "New government's first        │
         100 days — which projects are at risk"        │
      └─ Retention hook: "Stay subscribed to track     │
         what actually gets cancelled"                 │
```

### Content strategy (free, organic)

NZ is small enough that a few well-placed pieces of content can reach the entire infrastructure-interested audience. Target outlets:

| Channel | Why | Content type |
|---|---|---|
| **r/newzealand** (320K members) | Infrastructure posts get high engagement, especially complaints about delays and cancellations | "I built a free tool to track every NZ infrastructure project" |
| **r/auckland** (120K) | Auckland has the most projects and the most frustrated commuters | Auckland-specific project maps and delay trackers |
| **Greater Auckland** (transport advocacy blog) | Highly engaged, infrastructure-literate audience | Guest post or data collaboration |
| **The Spinoff** | Progressive NZ media, covers infrastructure policy deeply | Pitch data-driven election infrastructure analysis |
| **interest.co.nz** | Property + economics audience, exactly your premium tier demographic | Property × infrastructure angle |
| **NZ Twitter/X** | Small but tight-knit infrastructure/planning community | Weekly project updates, election risk threads |
| **LinkedIn NZ** | Infrastructure professionals, council staff, property investors | Professional angle, tool awareness |

### The killer content pieces

1. **"The $2 Billion Graveyard: Every NZ infrastructure project killed by a change of government"** — visual timeline of cancelled projects with sunk costs. Shareable, enraging, positions InfraWatch as the authority.

2. **"What happens to YOUR suburb's projects if the government changes?"** — interactive, enter your address, see nearby projects and their political vulnerability rating.

3. **"The NZ Infrastructure Election Simulator"** — slide the swing bar, watch projects turn red/green. The election sim from Sydney InfraWatch, adapted for NZ electorates.

4. **"Auckland's $5.5B question: Will CRL actually open on time?"** — deep dive on the City Rail Link, with timeline tracking and delay history. CRL is NZ's biggest single project and everyone has opinions.

---

## 5. Monetization path

### Phase 1: Free (May–Aug 2026)

Everything free. Build audience and email list. Goal: **2,000 email subscribers** and **10,000 monthly visitors** by September.

### Phase 2: Freemium launch (Sep 2026)

| Tier | Price | Features |
|---|---|---|
| **Free** | $0 | Map, filters, project detail, election simulator, basic "what's at risk" view |
| **Pro** | $9 NZD/month or $79/year | Email alerts on project status changes, property price overlay (suburb medians near projects), downloadable data exports, priority support |
| **Investor** | $29 NZD/month or $249/year | Everything in Pro + infrastructure impact scoring per suburb, rezoning alerts, quarterly "investment opportunity" briefings, API access |

### Phase 3: B2B (post-election, early 2027)

| Customer | Product | Price |
|---|---|---|
| **NZ councils** (67 territorial authorities) | White-label project tracker embedded on council website | $500-1,500 NZD/month |
| **Property companies** (buyer's agents, valuers) | Suburb infrastructure briefs, bulk data access | $199-499 NZD/month |
| **Infrastructure companies** | Market intelligence: which projects are funded, where capacity is needed | $499-999 NZD/month |
| **Media outlets** | Data licensing for election coverage | Per-use or annual license |

### Revenue model to $10K MRR

| Scenario | Users/customers | Avg revenue | MRR (NZD) | MRR (AUD ~) |
|---|---|---|---|---|
| Conservative | 200 Pro + 30 Investor + 2 councils | $9×200 + $29×30 + $1000×2 | $4,670 | ~$4,300 |
| Target | 500 Pro + 80 Investor + 5 councils | $9×500 + $29×80 + $1000×5 | $11,820 | ~$10,900 |
| Stretch | 800 Pro + 150 Investor + 10 councils | $9×800 + $29×150 + $1000×10 | $21,550 | ~$19,800 |

The election is the acquisition engine. Councils are the retention engine. Property investors are the ARPU engine.

---

## 6. Infrastructure costs

### MVP phase ($0/month)

| Service | Cost | Purpose |
|---|---|---|
| Cloudflare Pages | Free | Static site hosting |
| GitHub | Free | Code + data repo |
| Te Waihanga data | Free | Core project data |
| Stats NZ / Elections NZ | Free | Electoral boundaries + results |
| Buttondown | Free (<100 subs) | Email capture |
| **Total** | **$0** | |

### Growth phase ($20-50/month)

| Service | Cost | Purpose |
|---|---|---|
| Cloudflare Workers | Free (100K req/day) | Alert processing, API |
| Buttondown paid | $9/month | Email alerts (100+ subscribers) |
| Supabase free tier | $0 | User accounts, preferences |
| Domain (nzinfrawatch.co.nz) | ~$15/year | Branding |
| LINZ Data Service | Free | Property sales data |
| **Total** | **~$12/month** | |

### Scale phase ($50-150/month)

| Service | Cost | Purpose |
|---|---|---|
| Supabase Pro | $25/month | Database for users + alerts |
| Cloudflare Workers paid | $5/month | Higher limits |
| Buttondown scaling | $29/month | 1,000+ subscribers |
| Plausible Analytics | $9/month | Privacy-friendly analytics |
| Backup domain (.nz) | ~$25/year | |
| **Total** | **~$70/month** | |

Well under your $200/month ceiling at every stage.

---

## 7. NZ-specific risks and mitigations

### Risk: Te Waihanga gets defunded or restructured

The Infrastructure Commission's future is politically uncertain. The current government announced changes to the investment assurance system in 2026. If Te Waihanga's pipeline data disappears:

**Mitigation**: Archive every quarterly CSV release locally. Build direct relationships with NZTA, Waka Kotahi, and major councils who contribute data — they publish project info independently too. The data exists regardless of whether Te Waihanga aggregates it.

### Risk: NZ market too small for $10K MRR

5 million people. ~1.8M property owners. Maybe 50,000 who'd care about infrastructure tracking.

**Mitigation**: NZ is the *proving ground*, not the ceiling. Use the NZ launch to:
1. Validate product-market fit with real users
2. Generate press coverage and case studies
3. Build the multi-city codebase that ports to Australian cities
4. The AU expansion (Sydney, Melbourne, Brisbane) is where $10K+ MRR lives

### Risk: Election result changes nothing (same government re-elected)

If National wins again, the "what's at risk" angle loses urgency.

**Mitigation**: Even continuity is news. "These 50 projects are now SAFE — here's what the next 3 years look like." The tool's value isn't only in disruption — it's in ongoing tracking. Shift messaging to "the most reliable way to see what's actually being built near you."

### Risk: Free government tools improve

Te Waihanga could build a better public-facing tool themselves.

**Mitigation**: Government tools are always behind. They won't add election risk analysis, property overlays, or personalized alerts. Your advantage is speed, opinion, and user experience. Te Waihanga's mandate is to inform the *industry*; yours is to inform *residents and investors*.

---

## 8. Expansion path: NZ → Australia

Once NZ InfraWatch is live and validated:

| Phase | Market | Timeline | Revenue target |
|---|---|---|---|
| **1** | NZ (national) | May–Dec 2026 | $2-5K MRR |
| **2** | Sydney (port existing Sydney InfraWatch data into new architecture) | Jan–Mar 2027 | +$3-5K MRR |
| **3** | Melbourne (Victoria election Nov 2026 creates data opportunity) | Apr–Jun 2027 | +$3-5K MRR |
| **4** | Brisbane (Olympics pipeline) | H2 2027 | +$2-4K MRR |
| **5** | Multi-city platform + B2B council sales | 2028 | $15-25K MRR |

The codebase is the same. The data layer is per-city. Each new city is a ~2 week data integration effort, not a rebuild.

---

## 9. First 48 hours — what to do right now

1. **Download the Te Waihanga pipeline CSV** from `tewaihanga.govt.nz/the-pipeline/downloadable-data`. Open it. Understand the schema. Count how many Auckland projects are in construction status.

2. **Download 2025 electorate boundaries** from Stats NZ (`datafinder.stats.govt.nz`). Load them into QGIS or geojson.io to verify they render correctly.

3. **Download 2023 election results** from Elections NZ. Get booth-level and electorate-level CSVs.

4. **Set up the repo**: `nz-infrawatch` on GitHub. Cloudflare Pages connected. Push a hello-world `index.html` to confirm deployment works.

5. **Write the data processing script**: `scripts/refresh-pipeline.js` — takes the Te Waihanga CSV, filters to projects >$1M, geocodes by region, outputs `data/pipeline.json`.

6. **Start the map**: Leaflet, Voyager basemap (same as Sydney InfraWatch), plot the first 50 projects as markers.

You'll have a working prototype by end of day 2. The rest is refinement, electoral overlays, and the election risk tagging that makes it unique.

---

*Last updated: 25 May 2026*
*Document scope: NZ market launch only. See separate docs for AU expansion strategy.*
