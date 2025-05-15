#!/bin/bash
# src/scripts/bazaar-tools.sh
# Main entry point for all Bazaar-vid tools and utilities

set -e  # Exit on error

# Text formatting
BOLD="\033[1m"
RESET="\033[0m"
GREEN="\033[32m"
BLUE="\033[34m"
RED="\033[31m"
YELLOW="\033[33m"
CYAN="\033[36m"

function show_header() {
  echo -e "${BOLD}${BLUE}========================================${RESET}"
  echo -e "${BOLD}${BLUE}       Bazaar-vid Developer Tools       ${RESET}"
  echo -e "${BOLD}${BLUE}========================================${RESET}"
  echo ""
}

function show_menu() {
  echo -e "${BOLD}Choose a tool category:${RESET}"
  echo -e "${BOLD}1)${RESET} ${CYAN}Component Tools${RESET} - Create, fix, and manage components"
  echo -e "${BOLD}2)${RESET} ${CYAN}Database Tools${RESET} - Query and analyze database"
  echo -e "${BOLD}3)${RESET} ${CYAN}Migration Tools${RESET} - Run migrations and schema updates"
  echo -e "${BOLD}4)${RESET} ${CYAN}Diagnostics${RESET} - Debug and troubleshoot issues"
  echo -e "${BOLD}q)${RESET} Quit"
  echo ""
  echo -n "Enter your choice: "
}

function run_component_tools() {
  src/scripts/component-tools/component-helper.sh "$@"
}

function run_db_tools() {
  src/scripts/db-tools/run-analysis.sh "$@"
}

function run_migration_tools() {
  src/scripts/migration-tools/migration-helper.sh "$@"
}

function run_diagnostics() {
  src/scripts/diagnostics/diagnostics-helper.sh "$@"
}

# Main program
show_header

# Process command line arguments
if [ "$1" == "--component" ] || [ "$1" == "-c" ]; then
  shift
  run_component_tools "$@"
  exit 0
elif [ "$1" == "--db" ] || [ "$1" == "-d" ]; then
  shift
  run_db_tools "$@"
  exit 0
elif [ "$1" == "--migration" ] || [ "$1" == "-m" ]; then
  shift
  run_migration_tools "$@"
  exit 0
elif [ "$1" == "--diagnostics" ] || [ "$1" == "--diag" ]; then
  shift
  run_diagnostics "$@"
  exit 0
fi

# Interactive mode
while true; do
  show_menu
  read choice
  
  case $choice in
    1) run_component_tools; echo ""; ;;
    2) run_db_tools; echo ""; ;;
    3) run_migration_tools; echo ""; ;;
    4) run_diagnostics; echo ""; ;;
    q|Q) echo "Exiting..."; exit 0; ;;
    *) echo -e "${RED}Invalid option. Please try again.${RESET}"; echo ""; ;;
  esac
done
