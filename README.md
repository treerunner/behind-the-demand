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

### SEC EDGAR (`edgar`) — planned

**Source:** [SEC EDGAR full-text search API](https://efts.sec.gov/LATEST/search-index) — free JSON API, no key required.

**What we will pull:** 8-K press releases and 10-K disclosures from major public data center operators (Amazon/AWS, Microsoft/Azure, Alphabet/Google, Equinix, Digital Realty, Iron Mountain) mentioning data center expansion in Chesapeake watershed states.

**Why:** Public companies announce data center campuses in SEC filings — often in 8-K press releases — before construction permits are filed with state agencies. This gives the earliest available signal for hyperscaler expansions in Virginia, Maryland, Pennsylvania, and New York.

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
