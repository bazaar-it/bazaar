#!/bin/bash
# src/scripts/component-tools/component-helper.sh
# Helper script for component-related operations

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
  echo -e "${BOLD}${BLUE}     Bazaar-vid Component Manager       ${RESET}"
  echo -e "${BOLD}${BLUE}========================================${RESET}"
  echo ""
}

function show_menu() {
  echo -e "${BOLD}Choose an operation:${RESET}"
  echo -e "${BOLD}1)${RESET} Create a new component"
  echo -e "${BOLD}2)${RESET} Fix components"
  echo -e "${BOLD}3)${RESET} Analyze components"
  echo -e "${BOLD}4)${RESET} Check component status"
  echo -e "${BOLD}b)${RESET} Back to main menu"
  echo -e "${BOLD}q)${RESET} Quit"
  echo ""
  echo -n "Enter your choice: "
}

function get_project_id() {
  # If a project ID was passed as a parameter, use it
  if [ ! -z "$1" ]; then
    echo "$1"
    return
  fi
  
  # If PROJECT_ID is already set, use it
  if [ ! -z "$PROJECT_ID" ]; then
    echo "$PROJECT_ID"
    return
  fi
  
  echo -e "${YELLOW}Please provide the project ID:${RESET}"
  read PROJECT_ID
  echo "$PROJECT_ID"
}

function create_component_menu() {
  echo -e "${BOLD}Create Component Options:${RESET}"
  echo -e "${BOLD}1)${RESET} Create test component (guaranteed working)"
  echo -e "${BOLD}2)${RESET} Create simple shape component"
  echo -e "${BOLD}3)${RESET} Register simple scene"
  echo -e "${BOLD}b)${RESET} Back"
  echo ""
  echo -n "Enter your choice: "
  
  read subchoice
  
  case $subchoice in
    1) create_test_component; ;;
    2) create_simple_shape; ;;
    3) register_simple_scene; ;;
    b|B) return; ;;
    *) echo -e "${RED}Invalid option. Please try again.${RESET}"; create_component_menu; ;;
  esac
}

function fix_component_menu() {
  echo -e "${BOLD}Fix Component Options:${RESET}"
  echo -e "${BOLD}1)${RESET} Fix specific component by ID"
  echo -e "${BOLD}2)${RESET} Fix components with missing outputUrl"
  echo -e "${BOLD}3)${RESET} Fix inconsistent components"
  echo -e "${BOLD}4)${RESET} Fix components with Remotion assignment issues"
  echo -e "${BOLD}5)${RESET} Fix all issues in a project (batch mode)"
  echo -e "${BOLD}b)${RESET} Back"
  echo ""
  echo -n "Enter your choice: "
  
  read subchoice
  
  case $subchoice in
    1) fix_specific_component; ;;
    2) fix_missing_output_url; ;;
    3) fix_inconsistent_components; ;;
    4) fix_component_assignment; ;;
    5) fix_all_components; ;;
    b|B) return; ;;
    *) echo -e "${RED}Invalid option. Please try again.${RESET}"; fix_component_menu; ;;
  esac
}

function analyze_component_menu() {
  echo -e "${BOLD}Analyze Component Options:${RESET}"
  echo -e "${BOLD}1)${RESET} Analyze component by ID"
  echo -e "${BOLD}2)${RESET} Analyze component errors"
  echo -e "${BOLD}3)${RESET} Analyze all components in a project"
  echo -e "${BOLD}b)${RESET} Back"
  echo ""
  echo -n "Enter your choice: "
  
  read subchoice
  
  case $subchoice in
    1) analyze_component; ;;
    2) analyze_errors; ;;
    3) analyze_project_components; ;;
    b|B) return; ;;
    *) echo -e "${RED}Invalid option. Please try again.${RESET}"; analyze_component_menu; ;;
  esac
}

# Create component functions
function create_test_component() {
  local project_id=$(get_project_id $1)
  echo -e "${BLUE}Creating a guaranteed working component for project ${project_id}...${RESET}"
  npx tsx src/scripts/component-tools/create-test-component.ts "$project_id"
}

function create_simple_shape() {
  local project_id=$(get_project_id $1)
  echo -e "${BLUE}Creating a simple shape component for project ${project_id}...${RESET}"
  # Using an ESM script
  NODE_OPTIONS="--experimental-specifier-resolution=node" npx node src/scripts/component-tools/create-simple-shape.mjs "$project_id"
}

function register_simple_scene() {
  local project_id=$(get_project_id $1)
  echo -e "${BLUE}Registering a simple scene for project ${project_id}...${RESET}"
  npx node src/scripts/component-tools/register-simple-scene.js "$project_id"
}

# Fix component functions
function fix_specific_component() {
  echo -e "${YELLOW}Please provide the component ID to fix:${RESET}"
  read component_id
  
  echo -e "${BLUE}Fixing component ${component_id}...${RESET}"
  npx tsx src/scripts/component-tools/fix-component-syntax.ts "$component_id"
  
  echo -e "${GREEN}Component fixed and queued for rebuild. Check the UI for status.${RESET}"
}

function fix_missing_output_url() {
  local project_id=$(get_project_id $1)
  echo -e "${BLUE}Fixing components with missing outputUrl for project ${project_id}...${RESET}"
  npx tsx src/scripts/component-tools/fix-missing-outputUrl.ts "$project_id"
}

function fix_inconsistent_components() {
  echo -e "${BLUE}Fixing inconsistent components...${RESET}"
  npx tsx src/scripts/component-tools/fix-inconsistent-components.ts --fix
}

function fix_component_assignment() {
  local project_id=$(get_project_id $1)
  echo -e "${BLUE}Fixing components with Remotion assignment issues for project ${project_id}...${RESET}"
  npx tsx src/scripts/component-tools/fix-remotion-component-assignment.ts "$project_id"
}

function fix_all_components() {
  local project_id=$(get_project_id $1)
  echo -e "${BLUE}Fixing all problematic components for project ${project_id}...${RESET}"
  
  # First, fix components with missing outputUrl
  echo -e "${YELLOW}Step 1: Fixing components with missing outputUrl...${RESET}"
  fix_missing_output_url "$project_id"
  
  # Next, fix inconsistent components (ready but missing outputUrl)
  echo -e "${YELLOW}Step 2: Fixing inconsistent components...${RESET}"
  fix_inconsistent_components
  
  # Finally, fix components with syntax issues
  echo -e "${YELLOW}Step 3: Fixing components with Remotion assignment issues...${RESET}"
  fix_component_assignment "$project_id"
  
  echo -e "${GREEN}All fixes applied. Components are being rebuilt. Check the UI for status.${RESET}"
}

# Analyze component functions
function analyze_component() {
  echo -e "${YELLOW}Please provide the component ID to analyze:${RESET}"
  read component_id
  
  echo -e "${BLUE}Analyzing component ${component_id}...${RESET}"
  npx tsx src/scripts/component-tools/analyze-component.ts "$component_id"
}

function analyze_errors() {
  echo -e "${BLUE}Analyzing component errors...${RESET}"
  npx node src/scripts/component-tools/analyze-errors.js
}

function analyze_project_components() {
  local project_id=$(get_project_id $1)
  echo -e "${BLUE}Analyzing all components for project ${project_id}...${RESET}"
  npx node src/scripts/component-tools/analyze-project-components.js "$project_id"
}

function show_component_status() {
  local project_id=$(get_project_id $1)
  echo -e "${BLUE}Showing component status for project ${project_id}...${RESET}"
  npx tsx src/scripts/component-tools/list-components.ts "$project_id"
}

# Main program
show_header

# Process command line arguments
if [ "$1" == "--create" ] || [ "$1" == "-c" ]; then
  shift
  create_component_menu "$@"
  exit 0
elif [ "$1" == "--fix" ] || [ "$1" == "-f" ]; then
  shift
  fix_component_menu "$@"
  exit 0
elif [ "$1" == "--analyze" ] || [ "$1" == "-a" ]; then
  shift
  analyze_component_menu "$@"
  exit 0
elif [ "$1" == "--status" ] || [ "$1" == "-s" ]; then
  shift
  show_component_status "$@"
  exit 0
elif [ "$1" == "--all" ]; then
  shift
  fix_all_components "$1"
  exit 0
fi

# Interactive mode
while true; do
  show_menu
  read choice
  
  case $choice in
    1) create_component_menu; echo ""; ;;
    2) fix_component_menu; echo ""; ;;
    3) analyze_component_menu; echo ""; ;;
    4) show_component_status; echo ""; ;;
    b|B) exit 0; ;;  # Return to main menu
    q|Q) echo "Exiting..."; exit 0; ;;
    *) echo -e "${RED}Invalid option. Please try again.${RESET}"; echo ""; ;;
  esac
done
