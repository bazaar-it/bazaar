# Database and Storage Analysis Tools

This directory contains scripts for analyzing and exploring the database and R2 storage of the Bazaar-Vid application. These tools are designed to help diagnose issues with custom components and understand the state of the data.

## Setup

Before running any scripts, install the required dependencies:

```bash
npm install pg
```

## Available Tools

### 1. Database Exploration

#### `explore-db.js`
Lists all tables in the database with row counts and details about component-related tables.

```bash
node src/scripts/db-tools/explore-db.js
```

#### `list-projects.js`
Lists all projects in the database with their IDs, names, and creation dates.

```bash
node src/scripts/db-tools/list-projects.js
```

#### `get-project-components.js`
Lists all components associated with a specific project ID.

```bash
node src/scripts/db-tools/get-project-components.js <projectId>
```

#### `list-all-components.js`
Lists all components in the database with their IDs, statuses, and effects.

```bash
node src/scripts/db-tools/list-all-components.js [--status=<status>] [--limit=<number>]
```
Options:
- `--status`: Filter by status (success, error, building, complete)
- `--limit`: Limit the number of results (default: 20)

### 2. Component Analysis

#### `analyze-component.js`
Analyzes a specific component by ID.

```bash
node src/scripts/db-tools/analyze-component.js <componentId>
```

#### `analyze-errors.js`
Analyzes patterns in component errors.

```bash
node src/scripts/db-tools/analyze-errors.js [--limit=<number>]
```

#### `analyze-by-project.js`
Analyzes all components for a specific project.

```bash
node src/scripts/db-tools/analyze-by-project.js <projectId>
```

### 3. R2 Storage Analysis

#### `list-r2-objects.js`
Lists objects in the R2 bucket (requires AWS S3 SDK).

```bash
node src/scripts/db-tools/list-r2-objects.js [--prefix=<prefix>] [--limit=<number>]
```

#### `check-r2-component.js`
Checks if a component exists in R2 storage.

```bash
node src/scripts/db-tools/check-r2-component.js <componentId>
```

#### `compare-db-r2.js`
Compares components in the database with objects in R2 storage.

```bash
node src/scripts/db-tools/compare-db-r2.js [--status=<status>]
```

## Output Formats

Most scripts will output information in the console, but many also create files in the `analysis/` directory with more detailed information:

- `analysis/components/`: Component code samples
- `analysis/errors/`: Error samples and patterns
- `analysis/projects/`: Project analysis results
- `analysis/r2/`: R2 storage analysis results

## Common Usage Scenarios

### Scenario 1: Find all components for a project

```bash
node src/scripts/db-tools/get-project-components.js 12345678-1234-1234-1234-123456789abc
```

### Scenario 2: Analyze error patterns

```bash
node src/scripts/db-tools/analyze-errors.js --limit=100
```

### Scenario 3: Check if a component exists in R2

```bash
node src/scripts/db-tools/check-r2-component.js 87654321-4321-4321-4321-cba987654321
```

### Scenario 4: List all tables and their row counts

```bash
node src/scripts/db-tools/explore-db.js
```

## Troubleshooting

If you encounter issues with any of the tools:

1. Ensure required dependencies are installed (`npm install pg @aws-sdk/client-s3`)
2. Check that the database connection URL is correct in the scripts
3. Verify that you have proper permissions to access the database and R2 storage
4. Some scripts may require the creation of directories; ensure you have write permissions

## Notes

- These tools use direct database connection and are meant for diagnostic purposes only
- No data modifications are made by these tools unless explicitly noted
- All scripts use the ES modules syntax
- Database credentials are hardcoded for simplicity; in production, use environment variables 