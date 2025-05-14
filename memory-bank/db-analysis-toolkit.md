# Database Analysis Toolkit

The Database Analysis Toolkit provides a comprehensive set of utilities for examining and troubleshooting issues with components in the Bazaar-Vid platform.

## Overview

The toolkit helps developers diagnose issues with custom components by:

1. Exploring the database structure
2. Listing and filtering components
3. Analyzing specific components in detail
4. Detecting patterns in component errors
5. Verifying R2 storage status for components

## Getting Started

Run the toolkit from the project root directory:

```bash
./src/scripts/db-tools/run-analysis.sh <command> [arguments]
```

## Available Commands

| Command | Description | Arguments |
|---------|-------------|-----------|
| `explore` | Explore database structure | None |
| `list` | List all components | `--status=<status>` `--limit=<number>` |
| `project` | Get components for a project | `<projectId>` |
| `analyze` | Analyze a specific component | `<componentId>` |
| `errors` | Analyze error patterns | `--limit=<number>` |
| `r2-check` | Check component in R2 storage | `<componentId>` |
| `help` | Show help message | None |

## Example Usage

```bash
# Explore database structure
./src/scripts/db-tools/run-analysis.sh explore

# List components with errors
./src/scripts/db-tools/run-analysis.sh list --status=error --limit=10

# Analyze a specific component
./src/scripts/db-tools/run-analysis.sh analyze e6ed348b-c7f2-4d26-9de4-6e03c9cd283a

# Check if a component exists in R2 storage
./src/scripts/db-tools/run-analysis.sh r2-check e6ed348b-c7f2-4d26-9de4-6e03c9cd283a
```

## Analysis Reports

All reports are saved to the `analysis/` directory with the following structure:

- `/analysis/database_structure.md` - Database overview
- `/analysis/component_list_[status]_[timestamp].md` - Component listings
- `/analysis/components/[componentId]/analysis.md` - Component analysis
- `/analysis/components/[componentId]/code.tsx` - Component source code
- `/analysis/projects/[projectId]/components.md` - Project components
- `/analysis/error_pattern_report.md` - Error pattern analysis
- `/analysis/r2/[componentId]/[componentId].js` - Downloaded component from R2

## Common Component Issues Detected

The toolkit can detect several common issues in component code:

1. 'use client' directives in component code
2. Destructured import statements
3. Single-letter React variables
4. Missing window.__REMOTION_COMPONENT assignments
5. Missing imports for Remotion hooks

## Usage Tips

- Start with the `explore` command to get a high-level overview of the database
- Use the `list` command with appropriate filters to find problematic components
- Analyze specific components with the `analyze` command to get detailed information
- Use the `errors` command to identify patterns in component failures
- Check R2 storage status with the `r2-check` command

## Implementation Details

The toolkit is implemented as a set of NodeJS scripts in the `src/scripts/db-tools/` directory. It connects directly to the production Neon PostgreSQL database and the Cloudflare R2 storage. 