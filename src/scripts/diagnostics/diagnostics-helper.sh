#!/bin/bash
# src/scripts/diagnostics/diagnostics-helper.sh
# Helper script for diagnostic and debugging operations

set -e  # Exit on error

# Text formatting
BOLD="\033[1m"
RESET="\033[0m"
GREEN="\033[32m"
BLUE="\033[34m"
RED="\033[31m"
YELLOW="\033[33m"

function show_header() {
  echo -e "${BOLD}${BLUE}========================================${RESET}"
  echo -e "${BOLD}${BLUE}     Bazaar-vid Diagnostics Tools       ${RESET}"
  echo -e "${BOLD}${BLUE}========================================${RESET}"
  echo ""
}

function show_menu() {
  echo -e "${BOLD}Choose a diagnostic tool:${RESET}"
  echo -e "${BOLD}1)${RESET} Debug database connection"
  echo -e "${BOLD}2)${RESET} Debug component build"
  echo -e "${BOLD}3)${RESET} Analyze component errors"
  echo -e "${BOLD}4)${RESET} Run standalone tests"
  echo -e "${BOLD}b)${RESET} Back to main menu"
  echo -e "${BOLD}q)${RESET} Quit"
  echo ""
  echo -n "Enter your choice: "
}

function debug_database() {
  echo -e "${BLUE}Debugging database connection...${RESET}"
  npx tsx src/scripts/diagnostics/debug-db.ts
}

function debug_component_build() {
  echo -e "${YELLOW}Please provide the component ID to debug:${RESET}"
  read component_id
  
  echo -e "${BLUE}Debugging component build for ${component_id}...${RESET}"
  npx tsx src/scripts/diagnostics/diagnose-component.ts "$component_id"
}

function analyze_component_errors() {
  echo -e "${BLUE}Analyzing component errors...${RESET}"
  npx node src/scripts/diagnostics/analyze-errors.js
}

function run_standalone_tests() {
  echo -e "${BLUE}Running standalone tests...${RESET}"
  npx tsx src/scripts/diagnostics/debug-standalone.ts
}

# Main program
show_header

# Process command line arguments
if [ "$1" == "--db" ] || [ "$1" == "-d" ]; then
  debug_database
  exit 0
elif [ "$1" == "--component" ] || [ "$1" == "-c" ]; then
  debug_component_build
  exit 0
elif [ "$1" == "--errors" ] || [ "$1" == "-e" ]; then
  analyze_component_errors
  exit 0
elif [ "$1" == "--standalone" ] || [ "$1" == "-s" ]; then
  run_standalone_tests
  exit 0
fi

# Interactive mode
while true; do
  show_menu
  read choice
  
  case $choice in
    1) debug_database; echo ""; ;;
    2) debug_component_build; echo ""; ;;
    3) analyze_component_errors; echo ""; ;;
    4) run_standalone_tests; echo ""; ;;
    b|B) exit 0; ;;  # Return to main menu
    q|Q) echo "Exiting..."; exit 0; ;;
    *) echo -e "${RED}Invalid option. Please try again.${RESET}"; echo ""; ;;
  esac
done
