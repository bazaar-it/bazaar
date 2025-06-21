#!/bin/bash

# Script to fix UI imports from @bazaar/ui/component to @bazaar/ui

echo "Fixing UI imports..."

# List of UI components
components=(
  "accordion"
  "alert"
  "badge"
  "button"
  "calendar"
  "card"
  "checkbox"
  "dialog"
  "dropdown-menu"
  "icons"
  "input"
  "label"
  "popover"
  "progress"
  "select"
  "separator"
  "sheet"
  "skeleton"
  "slider"
  "spinner"
  "switch"
  "tabs"
  "textarea"
  "tooltip"
)

# Counter for tracking changes
total_files=0
total_changes=0

# Find all TypeScript files
for file in $(find src -name "*.ts" -o -name "*.tsx" 2>/dev/null); do
  if [ -f "$file" ]; then
    file_changed=false
    
    # Check each component
    for component in "${components[@]}"; do
      if grep -q "@bazaar/ui/$component" "$file"; then
        # Use sed to replace the import
        if [[ "$OSTYPE" == "darwin"* ]]; then
          # macOS version
          sed -i '' "s|@bazaar/ui/$component|@bazaar/ui|g" "$file"
        else
          # Linux version
          sed -i "s|@bazaar/ui/$component|@bazaar/ui|g" "$file"
        fi
        
        file_changed=true
        ((total_changes++))
        echo "  Fixed: @bazaar/ui/$component → @bazaar/ui in $file"
      fi
    done
    
    if [ "$file_changed" = true ]; then
      ((total_files++))
    fi
  fi
done

echo ""
echo "Summary:"
echo "- Files updated: $total_files"
echo "- Total imports fixed: $total_changes"
echo ""
echo "Import fix complete!"