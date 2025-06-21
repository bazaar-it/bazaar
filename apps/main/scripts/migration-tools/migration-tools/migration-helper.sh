#!/bin/bash
# src/scripts/migration-tools/migration-helper.sh
# Helper script for database migrations and schema updates

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
  echo -e "${BOLD}${BLUE}     Bazaar-vid Migration Manager       ${RESET}"
  echo -e "${BOLD}${BLUE}========================================${RESET}"
  echo ""
}

function show_menu() {
  echo -e "${BOLD}Choose an operation:${RESET}"
  echo -e "${BOLD}1)${RESET} Run schema migrations"
  echo -e "${BOLD}2)${RESET} Add recovery columns"
  echo -e "${BOLD}3)${RESET} Verify schema"
  echo -e "${BOLD}b)${RESET} Back to main menu"
  echo -e "${BOLD}q)${RESET} Quit"
  echo ""
  echo -n "Enter your choice: "
}

function run_schema_migrations() {
  echo -e "${BLUE}Running schema migrations...${RESET}"
  npx tsx src/scripts/migration-tools/migrate-schema.ts
  echo -e "${GREEN}Schema migrations completed.${RESET}"
}

function add_recovery_columns_menu() {
  echo -e "${BOLD}Add Recovery Columns Options:${RESET}"
  echo -e "${BOLD}1)${RESET} Add component recovery columns"
  echo -e "${BOLD}2)${RESET} Add message recovery columns"
  echo -e "${BOLD}3)${RESET} Add animation design brief recovery columns"
  echo -e "${BOLD}b)${RESET} Back"
  echo ""
  echo -n "Enter your choice: "
  
  read subchoice
  
  case $subchoice in
    1) add_component_recovery_columns; ;;
    2) add_message_recovery_columns; ;;
    3) add_adb_recovery_columns; ;;
    b|B) return; ;;
    *) echo -e "${RED}Invalid option. Please try again.${RESET}"; add_recovery_columns_menu; ;;
  esac
}

function add_component_recovery_columns() {
  echo -e "${BLUE}Adding component recovery columns...${RESET}"
  npx tsx src/scripts/migration-tools/add-component-recovery-columns.ts
  echo -e "${GREEN}Component recovery columns added.${RESET}"
}

function add_message_recovery_columns() {
  echo -e "${BLUE}Adding message recovery columns...${RESET}"
  npx tsx src/scripts/migration-tools/add-message-recovery-columns.ts
  echo -e "${GREEN}Message recovery columns added.${RESET}"
}

function add_adb_recovery_columns() {
  echo -e "${BLUE}Adding animation design brief recovery columns...${RESET}"
  npx tsx src/scripts/migration-tools/add-adb-recovery-columns.ts
  echo -e "${GREEN}Animation design brief recovery columns added.${RESET}"
}

function verify_schema() {
  echo -e "${BLUE}Verifying database schema...${RESET}"
  npx tsx src/scripts/migration-tools/verify-recovery-schema.ts
  echo -e "${GREEN}Schema verification completed.${RESET}"
}

# Main program
show_header

# Process command line arguments
if [ "$1" == "--migrate" ] || [ "$1" == "-m" ]; then
  run_schema_migrations
  exit 0
elif [ "$1" == "--recovery" ] || [ "$1" == "-r" ]; then
  add_recovery_columns_menu
  exit 0
elif [ "$1" == "--verify" ] || [ "$1" == "-v" ]; then
  verify_schema
  exit 0
fi

# Interactive mode
while true; do
  show_menu
  read choice
  
  case $choice in
    1) run_schema_migrations; echo ""; ;;
    2) add_recovery_columns_menu; echo ""; ;;
    3) verify_schema; echo ""; ;;
    b|B) exit 0; ;;  # Return to main menu
    q|Q) echo "Exiting..."; exit 0; ;;
    *) echo -e "${RED}Invalid option. Please try again.${RESET}"; echo ""; ;;
  esac
done
