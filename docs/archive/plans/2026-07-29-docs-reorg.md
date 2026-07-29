# Docs & Ticket Reorg — Implementation Plan

**Date:** 2026-07-29
**Goal:** Reorganize all docs, specs, and GitHub issue #79 so the ticket shows a clear project picture.

## Locked Decisions

1. **Target tree:** `docs/` with 9 consolidated domain docs, `docs/archive/adr/` (all 175 originals), `docs/operations/`, `docs/archive/plans/`, `docs/archive/specs/`, `docs/archive/design/`. `.scratch/` deleted.
2. **ADR strategy:** All 175 originals archived untouched. Obsolete ADRs (AppSheet, Next.js, Airtable, superseded decisions) excluded from domain-doc synthesis. Non-obsolete ADRs merged into 9 domain docs with footer source citations. Master `adr-index.md` maps every ADR → domain doc + obsolete status.
3. **Culling criteria for domain docs:** AppSheet-era, Airtable, Next.js, Google Forms, external hosting, and decisions explicitly superseded by later ADRs → skip from synthesis.
4. **Issue #79:** Rewrite body with intro narrative + status dashboard table + preserved acceptance criteria below.
5. **Verification:** `adr-index.md` cross-checks all 175 numbers accounted for. Domain doc footers cite source ADRs. `git diff --stat` before/after for file moves.

## Phases

### Phase 1: Scaffold target directories
- Create `docs/archive/adr/`, `docs/archive/plans/`, `docs/archive/specs/`, `docs/archive/design/`, `docs/operations/`
- Move all 175 `docs/adr/*.md` → `docs/archive/adr/`
- Move old design docs `archive/docs/*.md` → `docs/archive/design/`
- Move `archive/docs/adr/*.md` → `docs/archive/adr/`
- Move `docs/specs/0002-*.md`, `docs/specs/pr-47-completion.md` → `docs/archive/specs/`
- Rename `docs/specs/committee-finance-web-app.md` → `docs/spec.md`
- Move `docs/omp-plans/`, `docs/superpowers/plans/`, `docs/ceo-plans/` → `docs/archive/plans/`
- Move `docs/airtable-scripting-research.md` → `docs/archive/`
- Move `docs/PREMERGE.md`, `docs/staging-release-evidence-checklist.md`, `docs/wave-a-verification-2026-07-27.md` → `docs/operations/`
- Delete `.scratch/`
- Delete empty dirs: `docs/adr/`, `docs/specs/`, `docs/omp-plans/`, `docs/superpowers/`, `docs/ceo-plans/`, `archive/`

### Phase 2: Classify all 175 ADRs (scout agent)
- Read every ADR in `docs/archive/adr/`
- Classify each as OBSOLETE or ACTIVE with reason
- Assign each ACTIVE ADR to one of 9 domain docs
- Note: resolve numbering collisions (two 0001 files, archive vs current 0001-0003)
- Output: classification table

### Phase 3: Synthesize 9 domain docs (9 parallel task agents)
- Each agent receives its assigned ACTIVE ADRs + domain scope
- Produce consolidated doc in `docs/<domain>.md`
- Footer must list all source ADR numbers
- Summarize decisions, not verbatim copy

### Phase 4: Produce master index
- `docs/adr-index.md`: table of all 175 ADRs → status (ACTIVE/OBSOLETE) → domain doc (if ACTIVE) → reason (if OBSOLETE)

### Phase 5: Rewrite GitHub issue #79
- Read current #79 body
- Add intro narrative section
- Add status dashboard table (waves A-E, sub-tickets, status)
- Preserve acceptance criteria
- Link to consolidated domain docs

### Phase 6: Verification
- `adr-index.md` → all 175 numbers present
- Each domain doc footer → grep for ADR numbers, cross-check against index
- `git diff --stat` confirms expected file moves
- `npm run check` passes
- Issue #79 renders cleanly on GitHub
