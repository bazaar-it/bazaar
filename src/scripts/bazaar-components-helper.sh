#!/bin/bash
# bazaar-components-helper.sh
# A comprehensive helper script for Bazaar-vid custom components

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
  echo -e "${BOLD}${BLUE}   Bazaar-vid Component Helper Tool     ${RESET}"
  echo -e "${BOLD}${BLUE}========================================${RESET}"
  echo ""
}

function show_menu() {
  echo -e "${BOLD}Choose an option:${RESET}"
  echo -e "${BOLD}1)${RESET} Create a guaranteed working component"
  echo -e "${BOLD}2)${RESET} Fix existing component"
  echo -e "${BOLD}3)${RESET} Fix all problematic components in a project"
  echo -e "${BOLD}4)${RESET} Show component status"
  echo -e "${BOLD}5)${RESET} Run all fixes (batch mode)"
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

function create_working_component() {
  local project_id=$(get_project_id $1)
  echo -e "${BLUE}Creating a guaranteed working component for project ${project_id}...${RESET}"
  npx tsx src/scripts/create-test-component.ts "$project_id"
}

function fix_component() {
  echo -e "${YELLOW}Please provide the component ID to fix:${RESET}"
  read component_id
  
  echo -e "${BLUE}Fixing component ${component_id}...${RESET}"
  npx tsx src/scripts/fix-component-syntax.ts "$component_id"
  
  echo -e "${GREEN}Component fixed and queued for rebuild. Check the UI for status.${RESET}"
}

function fix_all_components() {
  local project_id=$(get_project_id $1)
  echo -e "${BLUE}Fixing all problematic components for project ${project_id}...${RESET}"
  
  # First, fix components with missing outputUrl
  echo -e "${YELLOW}Step 1: Fixing components with missing outputUrl...${RESET}"
  npx tsx src/scripts/fix-missing-outputUrl.ts "$project_id"
  
  # Next, fix inconsistent components (ready but missing outputUrl)
  echo -e "${YELLOW}Step 2: Fixing inconsistent components...${RESET}"
  npx tsx src/scripts/fix-inconsistent-components.ts --fix
  
  # Finally, fix components with syntax issues
  echo -e "${YELLOW}Step 3: Fixing components with Remotion assignment issues...${RESET}"
  npx tsx src/scripts/fix-remotion-component-assignment.ts "$project_id"
  
  echo -e "${GREEN}All fixes applied. Components are being rebuilt. Check the UI for status.${RESET}"
}

function show_component_status() {
  local project_id=$(get_project_id $1)
  echo -e "${BLUE}Showing component status for project ${project_id}...${RESET}"
  
  # Get list of all components for the project
  npx tsx -e "
    import { db } from './src/server/db';
    import { customComponentJobs } from './src/server/db/schema';
    import { eq } from 'drizzle-orm';
    
    async function getComponentStatus() {
      try {
        const components = await db.query.customComponentJobs.findMany({
          where: eq(customComponentJobs.projectId, '$project_id')
        });
        
        if (!components || components.length === 0) {
          console.log('No components found for this project');
          return;
        }
        
        console.log('Found ${BOLD}' + components.length + '${RESET} components:');
        console.log('');
        console.log('ID                                   | Status     | Output URL                | Name');
        console.log('--------------------------------------|------------|--------------------------|------------------');
        
        components.forEach(comp => {
          const status = comp.status || 'unknown';
          const statusColor = 
            status === 'ready' || status === 'complete' ? '${GREEN}' : 
            status === 'error' || status === 'failed' ? '${RED}' : 
            status === 'pending' ? '${YELLOW}' : '${RESET}';
          
          const outputUrlStatus = comp.outputUrl ? '${GREEN}Yes${RESET}' : '${RED}No${RESET}';
          
          console.log(
            comp.id.substring(0, 36).padEnd(36) + ' | ' + 
            statusColor + status.padEnd(10) + '${RESET} | ' + 
            outputUrlStatus.padEnd(24) + ' | ' + 
            (comp.effect || '').substring(0, 40)
          );
        });
      } catch (error) {
        console.error('Error:', error);
      }
    }
    
    getComponentStatus();
  "
}

function run_all_fixes() {
  local project_id=$(get_project_id $1)
  
  echo -e "${BLUE}Running all fixes in batch mode for project ${project_id}...${RESET}"
  
  # First, create a working test component
  echo -e "${YELLOW}Step 1: Creating a guaranteed working component...${RESET}"
  create_working_component "$project_id"
  
  # Next, fix all problematic components
  echo -e "${YELLOW}Step 2: Fixing all problematic components...${RESET}"
  fix_all_components "$project_id"
  
  echo -e "${YELLOW}Step 3: Showing updated component status...${RESET}"
  show_component_status "$project_id"
  
  echo -e "${GREEN}${BOLD}All operations completed!${RESET}"
  echo -e "${GREEN}1. Open the project in the UI${RESET}"
  echo -e "${GREEN}2. Look for the 'Guaranteed Working Component' in the Custom Components panel${RESET}"
  echo -e "${GREEN}3. Click the 'Add' button to add it to your video${RESET}"
  echo -e "${GREEN}4. The component should play properly in the video preview${RESET}"
}

# Main program
show_header

# Check if we're in batch mode with a project ID
if [ "$1" = "--all" ] && [ ! -z "$2" ]; then
  run_all_fixes "$2"
  exit 0
fi

# Interactive mode
while true; do
  show_menu
  read choice
  
  case $choice in
    1) create_working_component; echo ""; ;;
    2) fix_component; echo ""; ;;
    3) fix_all_components; echo ""; ;;
    4) show_component_status; echo ""; ;;
    5) run_all_fixes; echo ""; ;;
    q|Q) echo "Exiting..."; exit 0; ;;
    *) echo -e "${RED}Invalid option. Please try again.${RESET}"; echo ""; ;;
  esac
done 