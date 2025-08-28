#!/bin/bash

# Update all prompt files to remove font loading instructions
FILES=(
  "src/config/prompts/active/description-to-code.ts"
  "src/config/prompts/active/image-recreator.ts"
  "src/config/prompts/active/typography-generator.ts"
  "src/config/prompts/active/youtube-reproduction.ts"
  "src/config/prompts/active/youtube-to-remotion.ts"
)

for file in "${FILES[@]}"; do
  echo "Updating $file..."
  
  # Replace font loading instructions with direct usage
  sed -i '' 's/window\.RemotionGoogleFonts\.loadFont[^;]*;//g' "$file"
  sed -i '' 's/ALWAYS call window\.RemotionGoogleFonts\.loadFont[^.]*\./Fonts are auto-loaded - just use fontFamily directly./g' "$file"
  sed -i '' 's/Font loading: Call window\.RemotionGoogleFonts\.loadFont[^)]*)/Fonts: Just set fontFamily directly/g' "$file"
  sed -i '' 's/window\.RemotionGoogleFonts: Font loader[^)]*)/Fonts auto-load - just use fontFamily: "FontName"/g' "$file"
  sed -i '' 's/window\.RemotionGoogleFonts: Pre-built shapes/Fonts auto-load/g' "$file"
  sed -i '' 's/try window\.RemotionGoogleFonts\.loadFont/just use fontFamily directly/g' "$file"
  sed -i '' 's/Default font: Inter[^)]*)/Default font: Just use fontFamily: "Inter"/g' "$file"
done

echo "All prompt files updated!"