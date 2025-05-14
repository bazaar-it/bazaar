# Database and Component Analysis Tools

## Overview

This document provides detailed information about a set of specialized tools developed to analyze, debug, and monitor custom components in the Bazaar-Vid application. These tools directly connect to the Neon Postgres database and R2 storage to provide comprehensive diagnostics and analysis capabilities.

## Purpose

The database and component analysis tools were created to:

1. Provide direct access to the database for diagnostic purposes
2. Analyze component issues and patterns
3. Check component availability in R2 storage
4. Generate comprehensive reports about components, projects, and errors
5. Facilitate debugging of custom component issues

## Tool Suite Location

All tools are located in the `src/scripts/db-tools/` directory and can be run directly using Node.js.

## Setup

Before using the tools, ensure you have the required dependencies installed:

```bash
npm install pg
```

For R2 storage analysis, you may also need:

```bash
npm install @aws-sdk/client-s3
```

## Available Tools

### Database Exploration

#### 1. Explore Database Structure
Lists all tables, their schemas, and provides detailed information about component-related tables.

```bash
node src/scripts/db-tools/explore-db.js
```

This tool generates a comprehensive Markdown report in `analysis/database_structure.md` with details about:
- All tables and their row counts
- Component-related table schemas
- Status breakdown of components
- Sample data from key tables

#### 2. List All Projects
Lists all projects in the database with their IDs, names, and creation dates.

```bash
node src/scripts/db-tools/list-projects.js [--limit=20]
```

#### 3. List All Components
Lists all components in the database with their IDs, statuses, and effects.

```bash
node src/scripts/db-tools/list-all-components.js [--status=<status>] [--limit=50]
```

Options:
- `--status`: Filter by status (success, error, building, complete)
- `--limit`: Limit the number of results (default: 50)

Output includes:
- Status breakdown across all components
- Detailed list of components matching the criteria
- Markdown report saved to `analysis/` directory

### Project and Component Analysis

#### 4. Get Project Components
Lists all components associated with a specific project ID.

```bash
node src/scripts/db-tools/get-project-components.js <projectId>
```

Output includes:
- Project details
- Status breakdown of components in the project
- Detailed list of components grouped by status
- Markdown report saved to `analysis/projects/<projectId>/components.md`

#### 5. Analyze Specific Component
Performs detailed analysis of a single component by ID.

```bash
node src/scripts/db-tools/analyze-component.js <componentId>
```

Analysis includes:
- Basic component details
- Related project and ADB information
- Code analysis for common issues
- Code metrics and samples
- Saved component code files
- Markdown report in `analysis/components/<componentId>/analysis.md`

#### 6. Analyze Error Patterns
Analyzes patterns in component errors across the database.

```bash
node src/scripts/db-tools/analyze-errors.js [--limit=50]
```

Output includes:
- Error type categorization and statistics
- Code pattern analysis across failed components
- Sample error components for each error type
- Markdown report saved to `analysis/error_pattern_report.md`

### R2 Storage Analysis

#### 7. Check Component in R2
Checks if a component exists in R2 storage and downloads it if found.

```bash
node src/scripts/db-tools/check-r2-component.js <componentId>
```

Output includes:
- Component database details
- R2 storage path information
- Availability status in R2
- Downloaded component file (if available)

#### 8. Compare Database and R2
Compares components in the database with objects in R2 storage.

```bash
node src/scripts/db-tools/compare-db-r2.js [--status=<status>]
```

Output includes:
- Summary of database vs. R2 component counts
- List of missing components in R2
- Detailed comparison report

## Common Usage Scenarios

### Scenario 1: Debug a failing component

```bash
# 1. Find a failing component by listing all error components
node src/scripts/db-tools/list-all-components.js --status=error --limit=10

# 2. Analyze the specific component that's failing
node src/scripts/db-tools/analyze-component.js <componentId>

# 3. Check if the component exists in R2 storage
node src/scripts/db-tools/check-r2-component.js <componentId>
```

### Scenario 2: Analyze all components for a project

```bash
# 1. List all projects to find the project ID
node src/scripts/db-tools/list-projects.js

# 2. Get all components for a specific project
node src/scripts/db-tools/get-project-components.js <projectId>
```

### Scenario 3: Identify common error patterns

```bash
# Run error analysis to identify patterns
node src/scripts/db-tools/analyze-errors.js --limit=100
```

## Output Directory Structure

All analysis reports and downloaded files are saved in the `analysis/` directory with the following structure:

```
analysis/
├── components/              # Component-specific analysis
│   └── <componentId>/       # One directory per analyzed component
│       ├── analysis.md      # Analysis report
│       ├── code.tsx         # Original TSX code
│       └── code.js          # JavaScript code (if available)
├── database_structure.md    # Database structure report
├── errors/                  # Error analysis files
│   └── sample_<error_type>.txt  # Sample errors by type
├── projects/                # Project-specific analysis
│   └── <projectId>/         # One directory per analyzed project
│       └── components.md    # Project components report
└── r2/                      # R2 storage analysis
    └── <componentId>/       # Downloaded component files
```

## Implementation Details

### Database Connection

The tools connect directly to the Neon Postgres database using hardcoded credentials. For production use, it's recommended to use environment variables instead.

```javascript
// Connection credentials
const DATABASE_URL = 'postgresql://bazaar-vid-db_owner:npg_MtB3K7XgkQqN@ep-still-salad-a4i8qp7g-pooler.us-east-1.aws.neon.tech/bazaar-vid-db?sslmode=require';
```

### R2 Storage Access

R2 storage access is performed using HTTPS requests to the public URL:

```javascript
// R2 credentials
const R2_PUBLIC_URL = 'https://bazaar-vid-components.3a37cf04c89e7483b59120fb95af6468.r2.dev/';
```

### Common Issues Analyzed

The component analysis tools check for several common issues:

1. **'use client' directive**: May cause issues in browser execution
2. **Destructured imports**: Can cause problems with variable availability
3. **Single-letter React variables**: May lead to undefined variable errors
4. **Missing Remotion component registration**: Required for proper component loading
5. **Missing or incorrect imports**: Particularly for Remotion hooks

## Extended Usage

For more advanced use cases, you can:

1. Modify the SQL queries in `db-utils.js` to extract different data
2. Add new analysis tools by using the existing utilities
3. Create custom reports by adapting the output generation code
4. Use the downloaded components for local testing and debugging

## Notes

- These tools use direct database access and are meant for diagnostic purposes only
- No data modifications are made unless explicitly indicated
- All scripts use ES modules syntax
- Credentials are hardcoded for simplicity; in production, use environment variables

# Database Analysis Tools - Technical Implementation

This document provides technical details about the implementation of the Database Analysis Toolkit for Bazaar-Vid.

## Architecture

The toolkit follows a modular architecture:

```
src/scripts/db-tools/
├── db-utils.js              # Shared database utilities
├── run-analysis.sh          # Command runner script
├── explore-db.js            # Database exploration tool
├── list-all-components.js   # Component listing tool
├── get-project-components.js # Project component analysis
├── analyze-component.js     # Single component analysis
├── analyze-errors.js        # Error pattern analysis
├── check-r2-component.js    # R2 storage verification
└── README.md                # Documentation
```

## Core Utilities (db-utils.js)

The `db-utils.js` file provides the foundation for all toolkit operations:

1. **Database Connection:**
   - Direct connection to Neon PostgreSQL via the pg library
   - Connection pooling for efficient query execution
   - Environment-specific connection strings

2. **Query Functions:**
   - Wrapper for SQL query execution with error handling
   - Table schema retrieval and exploration
   - Type-specific queries for projects and components

3. **Output Management:**
   - Directory creation and management
   - Standardized output paths for analysis artifacts

4. **Command-line Parsing:**
   - Argument parsing for positional and named parameters
   - Support for common option formats (--name=value)

5. **Storage Connection:**
   - R2 storage endpoint configuration
   - URL construction for component artifacts

## Implementation Details

### Database Connectivity

The toolkit connects directly to the production database using the following pattern:

```javascript
import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = 'postgresql://user:pass@hostname/dbname?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL });

async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
```

### Schema Exploration

The system discovers table schemas dynamically using information_schema queries:

```javascript
async function getTableSchema(tableName) {
  const sql = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  return await query(sql, [tableName]);
}
```

### Component Analysis

Component analysis follows a multi-step process:

1. Fetch component data from database
2. Extract related resources (project, ADBs)
3. Analyze code for common issues
4. Generate reports in Markdown format
5. Export code files for inspection

Example pattern analysis code:

```javascript
function analyzeCodeIssues(components) {
  const issues = {
    'Missing window.__REMOTION_COMPONENT': 0,
    'Destructured imports': 0,
    'Single-letter React variable': 0,
    'use client directive': 0,
    'Missing Remotion hooks imports': 0
  };
  
  for (const component of components) {
    if (!component.tsxCode) continue;
    
    if (!component.tsxCode.includes('window.__REMOTION_COMPONENT')) {
      issues['Missing window.__REMOTION_COMPONENT']++;
    }
    
    // Additional checks...
  }
  
  return issues;
}
```

### R2 Storage Integration

The toolkit interacts with Cloudflare R2 storage via HTTPS requests:

```javascript
function checkUrlExists(url) {
  return new Promise((resolve) => {
    const request = https.request(
      url,
      { method: 'HEAD' },
      (response) => {
        resolve(response.statusCode === 200);
      }
    );
    
    request.on('error', () => {
      resolve(false);
    });
    
    request.end();
  });
}
```

### Shell Integration

The `run-analysis.sh` script provides a unified interface to all tools:

```bash
#!/bin/bash
# Execute appropriate tool based on command
case $COMMAND in
  explore|db)
    echo -e "${YELLOW}Exploring database structure...${NC}"
    node src/scripts/db-tools/explore-db.js
    echo -e "${GREEN}Analysis complete! Check analysis/database_structure.md for detailed report.${NC}"
    ;;
  # Additional commands...
esac
```

## Type Issues and Challenges

The current implementation has several TypeScript-related issues that could be improved:

1. Missing type definitions for database query results
2. Implicit any types in function parameters
3. Non-typed access to object properties
4. Missing index signatures for dynamic objects

Example of a property type issue:
```javascript
// Current code with type issues
component.errorMessage.includes('Build error')

// Improved type-safe version
if (component.errorMessage && typeof component.errorMessage === 'string' && 
    component.errorMessage.includes('Build error')) {
  // ...
}
```

## Future Improvements

Planned technical improvements include:

1. **TypeScript Conversion:**
   - Convert all scripts to TypeScript
   - Add proper type definitions for database schemas
   - Implement proper error handling with typed errors

2. **Optimizations:**
   - Implement caching for repeated queries
   - Add parallel processing for bulk component analysis
   - Implement incremental analysis for large datasets

3. **Advanced Features:**
   - Add unit tests for analysis logic
   - Implement a component repair mode
   - Create interactive web UI for analysis results

## Security Considerations

The current implementation has these security aspects to be aware of:

1. Direct database access with credentials in code
2. No input validation for command-line parameters
3. Downloaded components are executed in an isolated context

Future improvements should address these concerns through:
- Environment variable configuration
- Input sanitization
- Improved access controls

## Initial Findings

From our initial analysis of the database, we've discovered several important insights:

1. **Component Distribution:**
   - 131 components with error status
   - 31 components with complete status
   - 25 components with success status
   - 19 components with building status

2. **Common Error Types:**
   - Symbol Redeclaration: Most components fail due to duplicate symbol declarations
   - Other error categories include Syntax Errors, Undefined Variables, and Missing Properties

3. **Code Issues:**
   - Missing window.__REMOTION_COMPONENT assignment
   - Missing imports for Remotion hooks (useVideoConfig, useCurrentFrame)
   - Destructured imports that don't work in the Remotion environment

4. **R2 Storage Discrepancies:**
   - Some components with success status have R2 URLs in the database
   - However, the files don't actually exist in R2 storage
   - This suggests a disconnection between the database state and actual R2 storage

5. **Project Structure:**
   - Projects are stored with a "title" field, not "name"
   - Components reference projects via projectId

These findings provide a foundation for developing fixes to the component generation and storage processes. The most common issues appear to be related to how components are transpiled and how they reference Remotion APIs. 