#!/bin/bash

# Fix imports in admin app to use monorepo packages

echo "Fixing imports in admin app..."

# Fix tRPC imports
find src app -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { api } from "~/trpc/react"|import { api } from "@bazaar/trpc/react"|g'
find src app -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|import { api } from '~/trpc/react'|import { api } from '@bazaar/trpc/react'|g"

# Fix UI component imports
find src app -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|from "~/components/ui/\([^"]*\)"|from "@bazaar/ui"|g'
find src app -name "*.tsx" -o -name "*.ts" | xargs sed -i '' "s|from '~/components/ui/\([^']*\)'|from '@bazaar/ui'|g"

# Fix specific component imports that should be local
find src app -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import AdminSidebar from "~/components/AdminSidebar"|import AdminSidebar from "../components/AdminSidebar"|g'

# List files that still have ~ imports for manual review
echo -e "\nFiles that may still need manual import fixes:"
grep -r "from ['\"]~/" src app --include="*.tsx" --include="*.ts" || echo "No remaining ~ imports found!"

echo -e "\nImport fixes complete!"