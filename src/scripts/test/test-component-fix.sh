#!/bin/bash
# Simple script to test the component fix tRPC procedures

# Usage: ./test-component-fix.sh <component_id>
# Example: ./test-component-fix.sh 8d478778-d937-4677-af65-f613da8aee6b

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
  echo -e "${RED}Error: No component ID provided${NC}"
  echo "Usage: ./test-component-fix.sh <component_id>"
  exit 1
fi

# Component ID to test
COMPONENT_ID=$1

echo -e "${GREEN}Testing Component Fix Procedures${NC}"
echo -e "${GREEN}=============================${NC}"
echo ""

# Get info about the component (requires project permissions)
echo -e "${YELLOW}Getting component data from database...${NC}"
node src/scripts/diagnostics/direct-component-list.js | grep -A 10 "$COMPONENT_ID"

# First, apply the syntax fix (this doesn't modify the component yet, just returns potential fixes)
echo -e "\n${YELLOW}Step 1: Applying syntax fix to show preview...${NC}"
echo -e "${YELLOW}curl -X POST http://localhost:3000/api/trpc/customComponent.applySyntaxFix -H \"Content-Type: application/json\" -d '{\"json\":{\"componentId\":\"$COMPONENT_ID\"}}'${NC}"
curl -X POST http://localhost:3000/api/trpc/customComponent.applySyntaxFix -H "Content-Type: application/json" -d "{\"json\":{\"componentId\":\"$COMPONENT_ID\"}}"
echo ""

# Ask user if they want to continue with the confirmation
echo -e "\n${YELLOW}Step 2: Do you want to apply the fix? (y/n)${NC}"
read -r APPLY

if [ "$APPLY" == "y" ]; then
  echo -e "\n${YELLOW}Confirming syntax fix...${NC}"
  echo -e "${YELLOW}curl -X POST http://localhost:3000/api/trpc/customComponent.confirmSyntaxFix -H \"Content-Type: application/json\" -d '{\"json\":{\"componentId\":\"$COMPONENT_ID\"}}'${NC}"
  curl -X POST http://localhost:3000/api/trpc/customComponent.confirmSyntaxFix -H "Content-Type: application/json" -d "{\"json\":{\"componentId\":\"$COMPONENT_ID\"}}"
  echo ""
  
  # Check the component status after the fix
  echo -e "\n${GREEN}Checking component status after fix:${NC}"
  node src/scripts/diagnostics/direct-component-list.js | grep -A 10 "$COMPONENT_ID"
else
  echo -e "${RED}Syntax fix was not applied.${NC}"
fi
