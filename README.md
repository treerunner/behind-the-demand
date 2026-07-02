# Behind the Demand

A data journalism platform tracking data centers in the Chesapeake Bay watershed — their locations, ownership, power consumption, water use, and regulatory history.

## Project structure

```
apps/
  cms/          Payload CMS v3 + Next.js 15 — admin interface and database
  web/          SvelteKit public-facing site (planned)
scripts/
  data-collection/   Automated scrapers that populate the CMS database
.github/
  workflows/    GitHub Actions — scheduled scraper runs
```

## Data collection scripts

All scrapers live in `scripts/data-collection/src/sources/` and write to the Payload CMS database via the local API. They are idempotent — safe to re-run; existing records are updated, not duplicated. Records imported by a scraper carry `review_status: pending` until an editor verifies them. Records marked `excluded` are permanently skipped on future runs.

---

### EPA ECHO Exporter (`echo`)

**Source:** [EPA Enforcement and Compliance History Online (ECHO) Exporter](https://echo.epa.gov/files/echodownloads/echo_exporter.zip) — 392 MB bulk CSV, updated weekly.

**What we pull:** Facilities flagged by EPA as within the Chesapeake Bay watershed (`FAC_CHESAPEAKE_BAY_FLG = Y`) with NAICS code 518210 (Data Processing and Hosting) or SIC code 7374.

**Why:** The ECHO Exporter is the most complete cross-program federal database of regulated facilities. It covers existing, operational data centers that have interacted with any EPA program (Clean Air Act, Clean Water Act, RCRA hazardous waste). The EPA pre-computes the Chesapeake Bay watershed flag from official boundary data, so we don't need to do our own spatial filtering.

**Key fields captured:** Facility name, address, lat/lon, regulatory program IDs (NPDES, RCRA, AFS), NAICS/SIC codes, inspection count, enforcement actions, total penalties.

**Dedup key:** `external_ids.echo_registry_id` (EPA FRS Registry ID)

**Schedule:** First day of each month, 06:00 UTC.

**Run locally:**
```bash
curl -L -o /tmp/echo.zip https://echo.epa.gov/files/echodownloads/echo_exporter.zip
unzip -d /tmp/echo_data /tmp/echo.zip
export ECHO_CSV_PATH=/tmp/echo_data/ECHO_EXPORTER.csv
pnpm --filter @btd/data-collection echo:dry   # dry run
pnpm --filter @btd/data-collection echo        # live
```

---

### EPA ICIS-Air (`icis-air`)

**Source:** [EPA ICIS-Air Bulk Download](https://echo.epa.gov/files/echodownloads/ICIS-AIR_downloads.zip) — 64 MB ZIP, updated weekly.

**What we pull:** Facilities in Chesapeake watershed states (VA, MD, PA, DE, WV, NY, DC) with air operating status `PLN` (planned — construction permit application filed) or `CNS` (under construction), filtered to NAICS 518210 or SIC 7374.

**Why:** ICIS-Air tracks facilities at the air permitting stage, which can precede construction by months or years. The `PLN` status appears when a facility files a construction permit application with a state air agency — earlier in the project lifecycle than anything in the ECHO Exporter. Note: state entry of `PLN` records into ICIS-Air is inconsistent, so this source is sparse but worth monitoring as a forward-looking signal.

**Key fields captured:** Facility name, address, air operating status, NAICS/SIC codes, air pollutant class, local air control region, High Priority Violator (HPV) flag. No coordinates — geocoding is deferred.

**Dedup key:** `external_ids.echo_registry_id` (FRS Registry ID, shared with ECHO Exporter) with fallback to `external_ids.icis_air_pgm_sys_id`.

**Schedule:** Every Monday, 07:00 UTC.

**Run locally:**
```bash
curl -L -o /tmp/icis_air.zip https://echo.epa.gov/files/echodownloads/ICIS-AIR_downloads.zip
unzip -d /tmp/icis_air_data /tmp/icis_air.zip
export ICIS_AIR_CSV_PATH=/tmp/icis_air_data/ICIS_AIR_FACILITIES.csv
pnpm --filter @btd/data-collection icis-air:dry   # dry run
pnpm --filter @btd/data-collection icis-air        # live
```

---

### SEC EDGAR (`edgar`)

**Source:** [SEC EDGAR full-text search API](https://efts.sec.gov/LATEST/search-index) — free JSON API, `User-Agent` header required.

**What we pull:** 8-K press releases from target public companies (Amazon, Microsoft, Alphabet/Google, Equinix, Digital Realty, Iron Mountain, Meta, Apple) that mention "data center" alongside a Chesapeake watershed state (Virginia, Maryland, Pennsylvania, Delaware, West Virginia, New York).

**Why:** Public companies file 8-K press releases when they announce new data center campuses — often a year or more before construction permits are filed with state agencies. This provides the earliest available signal for hyperscaler expansions. Because SEC filings are unstructured text, extracted records carry `confidence: low` and need editorial review before publication.

**Key fields captured:** Company name, filing date, matched state, extracted city (best-effort regex from press release text), 3-sentence excerpt from the filing, direct URL to the matching document.

**Dedup key:** `external_ids.sec_edgar_id` — format `{CIK}:{accession_number}`, unique per filing.

**Schedule:** Every Monday, 08:00 UTC. `EDGAR_LOOKBACK_MONTHS` controls how far back to search (default 12).

**Run locally:**
```bash
pnpm --filter @btd/data-collection edgar:dry   # dry run
pnpm --filter @btd/data-collection edgar        # live
# Optionally scan further back:
EDGAR_LOOKBACK_MONTHS=24 pnpm --filter @btd/data-collection edgar:dry
```

---

### FracTracker Alliance (`fractracker`)

**Source:** [FracTracker Alliance U.S. Data Centers Tracker](https://experience.arcgis.com/experience/5a4d072ad01449bba5698a80103fb909) — ArcGIS Online feature layer (`data_centers_v4_agol_all`), public REST API, no auth required.

**What we pull:** All data center records in Chesapeake watershed states (VA, MD, PA, DE, NY, DC), plus West Virginia filtered to the eight eastern panhandle counties that drain to the Potomac (Berkeley, Jefferson, Morgan, Hampshire, Hardy, Mineral, Grant, Pendleton). Pennsylvania and New York records land with `watershed.verified = false` pending PostGIS boundary verification, since parts of those states drain to the Delaware or Atlantic rather than the Bay.

**Why:** FracTracker (compiled largely from [Piedmont Environmental Council](https://www.pecva.org) data for Virginia) tracks ~600+ watershed-area facilities including hundreds of proposed projects that have never touched an EPA regulatory program and won't appear in ECHO or ICIS-Air for years. It also carries power capacity (MW), operator/tenant, cooling type, and square footage data that federal sources don't publish. This makes it the richest single source for proposed and under-construction facilities.

**Dedup strategy (tiered):**
1. `external_ids.fractracker_id` exact match — fastest path on re-runs
2. Coordinate proximity ≤250m (Haversine) — matches against any existing facility with lat/lng
3. Normalized name + city — strips legal suffixes, collapses punctuation, requires both to match

**Fields augmented on existing records:** `location.lat/lng`, `location.county`, `capacity.power_capacity_mw`, `capacity.building_sqft`, `capacity.site_area_acres`, `capacity.cooling_type`. Only fills empty fields — never overwrites data set by another source or editor.

**Key fields captured:** Facility name, address, lat/lon, status, operator, tenant, MW capacity (low/high), cooling type, building sqft, site acres, expected online date, FracTracker source citation.

**Dedup key:** `external_ids.fractracker_id` (FracTracker's internal `facility_id`)

**Schedule:** Every Monday, 09:00 UTC.

**Run locally:**
```bash
pnpm --filter @btd/data-collection fractracker:dry   # dry run
pnpm --filter @btd/data-collection fractracker        # live
```

---

### Virginia DEQ (`va-deq`) — planned

**Source:** Virginia DEQ pending air permit applications.

**What we will pull:** Pending construction permit applications for NAICS 518210 facilities in Virginia.

**Why:** Virginia (primarily Loudoun, Prince William, and Fairfax counties) hosts the densest concentration of data centers in the watershed. DEQ air permit applications appear when a data center proposes backup diesel generators — before groundbreaking — making this the best early-stage signal for new Virginia facilities.

---

### Maryland MDE (`md-mde`) — planned

**Source:** [Maryland MDE Open Data](https://opendata.maryland.gov) air permits dataset.

**What we will pull:** Air permit records for NAICS 518210 facilities in Maryland.

**Why:** Maryland hosts significant data center development in the DC suburbs (Montgomery, Prince George's counties) and along the I-270 corridor. MDE data provides state-level coverage complementing the federal EPA sources.

---

## Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database

### Install

```bash
pnpm install
```

### Environment

Copy `apps/cms/.env.example` to `apps/cms/.env` and fill in:

```
DATABASE_URI=postgresql://...
PAYLOAD_SECRET=...
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

### Run CMS

```bash
pnpm --filter @btd/cms dev
```

## GitHub Actions secrets required

| Secret | Description |
|---|---|
| `DATABASE_URI` | PostgreSQL connection string |
| `PAYLOAD_SECRET` | Payload CMS secret key |
