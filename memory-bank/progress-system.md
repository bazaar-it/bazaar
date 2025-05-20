//memory-bank/progress-system.md
# Progress & TODO Guidelines

This document explains how progress updates and TODO lists are organized.

## Progress Logs

- **Main log**: `/memory-bank/progress.md` contains brief highlights and an index
  of sprint progress files.
- **Sprint logs**: Each sprint keeps a detailed progress file under
  `/memory-bank/sprints/<sprint>/progress.md`.
- **Special topics**: Additional progress files such as
  `/memory-bank/a2a/progress.md` or `/memory-bank/scripts/progress.md` are linked
  from the main log.

When adding new progress notes:
1. Update the relevant sprint's `progress.md` with detailed information.
2. Add a short summary to `/memory-bank/progress.md` if it is a major update.

## TODO Lists

- **Main TODO**: `/memory-bank/TODO.md` gathers outstanding tasks.
- **Sprint TODOs**: Each sprint may include a `TODO.md` for sprint‑specific
  tasks.
- **High priority**: `/memory-bank/TODO-critical.md` tracks urgent issues.

Keep these documents up to date and reference them from Pull Requests so the team
has a single source of truth for work status.

## Log Retention Policy

The first 200 lines of `/memory-bank/progress.md` should always contain the most
important recent updates. Older entries should be moved to
`/memory-bank/progress-history.md` rather than deleted. This keeps the main log
focused while preserving a complete history.
