#!/bin/bash
# Database Analysis Tools Runner
# Run from project root with: ./src/scripts/db-tools/run-analysis.sh <command> [arguments]

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create analysis directory if it doesn't exist
mkdir -p analysis

# Print header
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}    Bazaar-Vid Database Analysis Tool    ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check for command argument
if [ $# -eq 0 ]; then
  echo -e "${YELLOW}Usage:${NC} ./src/scripts/db-tools/run-analysis.sh <command> [arguments]"
  echo ""
  echo -e "${YELLOW}Available commands:${NC}"
  echo -e "  ${GREEN}explore${NC}     - Explore database structure"
  echo -e "  ${GREEN}list${NC}        - List all components [--status=<status>] [--limit=<number>]"
  echo -e "  ${GREEN}project${NC}     - Get components for a project <projectId>"
  echo -e "  ${GREEN}analyze${NC}     - Analyze a specific component <componentId>"
  echo -e "  ${GREEN}errors${NC}      - Analyze error patterns [--limit=<number>]"
  echo -e "  ${GREEN}r2-check${NC}    - Check component in R2 storage <componentId>"
  echo -e "  ${GREEN}help${NC}        - Show this help message"
  echo ""
  echo -e "${YELLOW}Examples:${NC}"
  echo -e "  ./src/scripts/db-tools/run-analysis.sh explore"
  echo -e "  ./src/scripts/db-tools/run-analysis.sh list --status=error --limit=10"
  echo -e "  ./src/scripts/db-tools/run-analysis.sh project 12345678-1234-1234-1234-123456789abc"
  echo -e "  ./src/scripts/db-tools/run-analysis.sh analyze 87654321-4321-4321-4321-cba987654321"
  exit 1
fi

# Get command from first argument
COMMAND=$1
shift # Remove the first argument (command) from the arguments list

# Execute appropriate tool based on command
case $COMMAND in
  explore|db)
    echo -e "${YELLOW}Exploring database structure...${NC}"
    node src/scripts/db-tools/explore-db.js
    echo -e "${GREEN}Analysis complete! Check analysis/database_structure.md for detailed report.${NC}"
    ;;
    
  list)
    echo -e "${YELLOW}Listing components...${NC}"
    node src/scripts/db-tools/list-all-components.js "$@"
    echo -e "${GREEN}Listing complete! Check analysis/ directory for the output file.${NC}"
    ;;
    
  project)
    if [ $# -eq 0 ]; then
      echo -e "${RED}Error: Missing project ID${NC}"
      echo -e "${YELLOW}Usage:${NC} ./src/scripts/db-tools/run-analysis.sh project <projectId>"
      exit 1
    fi
    
    echo -e "${YELLOW}Getting components for project: $1${NC}"
    node src/scripts/db-tools/get-project-components.js "$@"
    echo -e "${GREEN}Analysis complete! Check analysis/projects/$1/components.md for detailed report.${NC}"
    ;;
    
  analyze|component)
    if [ $# -eq 0 ]; then
      echo -e "${RED}Error: Missing component ID${NC}"
      echo -e "${YELLOW}Usage:${NC} ./src/scripts/db-tools/run-analysis.sh analyze <componentId>"
      exit 1
    fi
    
    echo -e "${YELLOW}Analyzing component: $1${NC}"
    node src/scripts/db-tools/analyze-component.js "$@"
    echo -e "${GREEN}Analysis complete! Check analysis/components/$1/analysis.md for detailed report.${NC}"
    ;;
    
  errors|patterns)
    echo -e "${YELLOW}Analyzing error patterns...${NC}"
    node src/scripts/db-tools/analyze-errors.js "$@"
    echo -e "${GREEN}Analysis complete! Check analysis/error_pattern_report.md for detailed report.${NC}"
    ;;
    
  r2-check|r2)
    if [ $# -eq 0 ]; then
      echo -e "${RED}Error: Missing component ID${NC}"
      echo -e "${YELLOW}Usage:${NC} ./src/scripts/db-tools/run-analysis.sh r2-check <componentId>"
      exit 1
    fi
    
    echo -e "${YELLOW}Checking component in R2 storage: $1${NC}"
    node src/scripts/db-tools/check-r2-component.js "$@"
    echo -e "${GREEN}Check complete! If the component was found, it was saved to analysis/r2/$1/${NC}"
    ;;
    
  help|--help|-h)
    echo -e "${YELLOW}Usage:${NC} ./src/scripts/db-tools/run-analysis.sh <command> [arguments]"
    echo ""
    echo -e "${YELLOW}Available commands:${NC}"
    echo -e "  ${GREEN}explore${NC}     - Explore database structure"
    echo -e "  ${GREEN}list${NC}        - List all components [--status=<status>] [--limit=<number>]"
    echo -e "  ${GREEN}project${NC}     - Get components for a project <projectId>"
    echo -e "  ${GREEN}analyze${NC}     - Analyze a specific component <componentId>"
    echo -e "  ${GREEN}errors${NC}      - Analyze error patterns [--limit=<number>]"
    echo -e "  ${GREEN}r2-check${NC}    - Check component in R2 storage <componentId>"
    echo -e "  ${GREEN}help${NC}        - Show this help message"
    ;;
    
  *)
    echo -e "${RED}Error: Unknown command '$COMMAND'${NC}"
    echo -e "${YELLOW}Run ${NC}./src/scripts/db-tools/run-analysis.sh help${YELLOW} for available commands${NC}"
    exit 1
    ;;
esac 