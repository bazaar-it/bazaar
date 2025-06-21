# Bazaar-Vid Scripts

This directory contains development and maintenance scripts for the Bazaar-Vid application.

## Structure

- `bin/` - Executable entry points for common tasks
- `lib/` - Shared utilities and libraries
  - `db/` - Database utilities
  - `components/` - Component-related utilities
  - `build/` - Build system utilities
- `commands/` - Individual command implementations
  - `components/` - Component-related commands
    - `fix/` - Component fixing commands
    - `analyze/` - Component analysis commands
    - `verify/` - Component verification commands
  - `db/` - Database commands
    - `migrate/` - Database migrations
    - `analyze/` - Database analysis
- `test/` - Test scripts
- `debug/` - Debugging utilities
- `config/` - Configuration files
  - `schema/` - JSON schemas for configuration

## Usage

Install dependencies:

```bash
cd src/scripts
npm install
```

Run a script:

```bash
# Fix components
npm run fix

# Analyze components
npm run analyze

# Run database migrations
npm run migrate
```

## Adding New Scripts

1. Add your script to the appropriate directory in `commands/`
2. Create or update an entry point in `bin/` if needed
3. Add any new dependencies to `package.json`
4. Update this README with usage instructions
