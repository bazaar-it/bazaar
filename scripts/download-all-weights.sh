#!/bin/bash

# Create fonts directory if it doesn't exist
mkdir -p public/fonts

# Function to download a font
download_font() {
  local family="$1"
  local weight="$2"
  local name="$3"
  local filename="$4"
  
  if [ -f "public/fonts/$filename" ]; then
    echo "✓ Already exists: $filename"
  else
    echo "⬇ Downloading $filename..."
    # Get CSS from Google Fonts
    css=$(curl -s "https://fonts.googleapis.com/css2?family=${family}:wght@${weight}")
    # Extract woff2 URL
    url=$(echo "$css" | grep -o 'https://fonts.gstatic.com[^)]*\.woff2' | head -1)
    if [ ! -z "$url" ]; then
      curl -s "$url" -o "public/fonts/$filename"
      echo "✓ Downloaded: $filename"
    else
      echo "✗ Failed to find URL for $filename"
    fi
  fi
}

echo "🚀 Downloading all font weights..."

# Inter
download_font "Inter" "300" "Inter" "Inter-Light.woff2"
download_font "Inter" "400" "Inter" "Inter-Regular.woff2"
download_font "Inter" "500" "Inter" "Inter-Medium.woff2"
download_font "Inter" "600" "Inter" "Inter-SemiBold.woff2"
download_font "Inter" "700" "Inter" "Inter-Bold.woff2"
download_font "Inter" "800" "Inter" "Inter-ExtraBold.woff2"
download_font "Inter" "900" "Inter" "Inter-Black.woff2"

# DM Sans
download_font "DM+Sans" "400" "DM Sans" "DMSans-Regular.woff2"
download_font "DM+Sans" "500" "DM Sans" "DMSans-Medium.woff2"
download_font "DM+Sans" "700" "DM Sans" "DMSans-Bold.woff2"

# Plus Jakarta Sans
download_font "Plus+Jakarta+Sans" "300" "Plus Jakarta Sans" "PlusJakartaSans-Light.woff2"
download_font "Plus+Jakarta+Sans" "400" "Plus Jakarta Sans" "PlusJakartaSans-Regular.woff2"
download_font "Plus+Jakarta+Sans" "500" "Plus Jakarta Sans" "PlusJakartaSans-Medium.woff2"
download_font "Plus+Jakarta+Sans" "600" "Plus Jakarta Sans" "PlusJakartaSans-SemiBold.woff2"
download_font "Plus+Jakarta+Sans" "700" "Plus Jakarta Sans" "PlusJakartaSans-Bold.woff2"
download_font "Plus+Jakarta+Sans" "800" "Plus Jakarta Sans" "PlusJakartaSans-ExtraBold.woff2"

# Roboto
download_font "Roboto" "100" "Roboto" "Roboto-Thin.woff2"
download_font "Roboto" "300" "Roboto" "Roboto-Light.woff2"
download_font "Roboto" "400" "Roboto" "Roboto-Regular.woff2"
download_font "Roboto" "500" "Roboto" "Roboto-Medium.woff2"
download_font "Roboto" "700" "Roboto" "Roboto-Bold.woff2"
download_font "Roboto" "900" "Roboto" "Roboto-Black.woff2"

# Poppins
download_font "Poppins" "100" "Poppins" "Poppins-Thin.woff2"
download_font "Poppins" "200" "Poppins" "Poppins-ExtraLight.woff2"
download_font "Poppins" "300" "Poppins" "Poppins-Light.woff2"
download_font "Poppins" "400" "Poppins" "Poppins-Regular.woff2"
download_font "Poppins" "500" "Poppins" "Poppins-Medium.woff2"
download_font "Poppins" "600" "Poppins" "Poppins-SemiBold.woff2"
download_font "Poppins" "700" "Poppins" "Poppins-Bold.woff2"
download_font "Poppins" "800" "Poppins" "Poppins-ExtraBold.woff2"
download_font "Poppins" "900" "Poppins" "Poppins-Black.woff2"

# Montserrat
download_font "Montserrat" "100" "Montserrat" "Montserrat-Thin.woff2"
download_font "Montserrat" "200" "Montserrat" "Montserrat-ExtraLight.woff2"
download_font "Montserrat" "300" "Montserrat" "Montserrat-Light.woff2"
download_font "Montserrat" "400" "Montserrat" "Montserrat-Regular.woff2"
download_font "Montserrat" "500" "Montserrat" "Montserrat-Medium.woff2"
download_font "Montserrat" "600" "Montserrat" "Montserrat-SemiBold.woff2"
download_font "Montserrat" "700" "Montserrat" "Montserrat-Bold.woff2"
download_font "Montserrat" "800" "Montserrat" "Montserrat-ExtraBold.woff2"
download_font "Montserrat" "900" "Montserrat" "Montserrat-Black.woff2"

# Raleway
download_font "Raleway" "100" "Raleway" "Raleway-Thin.woff2"
download_font "Raleway" "200" "Raleway" "Raleway-ExtraLight.woff2"
download_font "Raleway" "300" "Raleway" "Raleway-Light.woff2"
download_font "Raleway" "400" "Raleway" "Raleway-Regular.woff2"
download_font "Raleway" "500" "Raleway" "Raleway-Medium.woff2"
download_font "Raleway" "600" "Raleway" "Raleway-SemiBold.woff2"
download_font "Raleway" "700" "Raleway" "Raleway-Bold.woff2"
download_font "Raleway" "800" "Raleway" "Raleway-ExtraBold.woff2"
download_font "Raleway" "900" "Raleway" "Raleway-Black.woff2"

# Ubuntu
download_font "Ubuntu" "300" "Ubuntu" "Ubuntu-Light.woff2"
download_font "Ubuntu" "400" "Ubuntu" "Ubuntu-Regular.woff2"
download_font "Ubuntu" "500" "Ubuntu" "Ubuntu-Medium.woff2"
download_font "Ubuntu" "700" "Ubuntu" "Ubuntu-Bold.woff2"

# Playfair Display
download_font "Playfair+Display" "400" "Playfair Display" "PlayfairDisplay-Regular.woff2"
download_font "Playfair+Display" "500" "Playfair Display" "PlayfairDisplay-Medium.woff2"
download_font "Playfair+Display" "600" "Playfair Display" "PlayfairDisplay-SemiBold.woff2"
download_font "Playfair+Display" "700" "Playfair Display" "PlayfairDisplay-Bold.woff2"
download_font "Playfair+Display" "800" "Playfair Display" "PlayfairDisplay-ExtraBold.woff2"
download_font "Playfair+Display" "900" "Playfair Display" "PlayfairDisplay-Black.woff2"

# Merriweather
download_font "Merriweather" "300" "Merriweather" "Merriweather-Light.woff2"
download_font "Merriweather" "400" "Merriweather" "Merriweather-Regular.woff2"
download_font "Merriweather" "700" "Merriweather" "Merriweather-Bold.woff2"
download_font "Merriweather" "900" "Merriweather" "Merriweather-Black.woff2"

# Fira Code
download_font "Fira+Code" "300" "Fira Code" "FiraCode-Light.woff2"
download_font "Fira+Code" "400" "Fira Code" "FiraCode-Regular.woff2"
download_font "Fira+Code" "500" "Fira Code" "FiraCode-Medium.woff2"
download_font "Fira+Code" "600" "Fira Code" "FiraCode-SemiBold.woff2"
download_font "Fira+Code" "700" "Fira Code" "FiraCode-Bold.woff2"

# JetBrains Mono
download_font "JetBrains+Mono" "100" "JetBrains Mono" "JetBrainsMono-Thin.woff2"
download_font "JetBrains+Mono" "200" "JetBrains Mono" "JetBrainsMono-ExtraLight.woff2"
download_font "JetBrains+Mono" "300" "JetBrains Mono" "JetBrainsMono-Light.woff2"
download_font "JetBrains+Mono" "400" "JetBrains Mono" "JetBrainsMono-Regular.woff2"
download_font "JetBrains+Mono" "500" "JetBrains Mono" "JetBrainsMono-Medium.woff2"
download_font "JetBrains+Mono" "600" "JetBrains Mono" "JetBrainsMono-SemiBold.woff2"
download_font "JetBrains+Mono" "700" "JetBrains Mono" "JetBrainsMono-Bold.woff2"
download_font "JetBrains+Mono" "800" "JetBrains Mono" "JetBrainsMono-ExtraBold.woff2"

echo "✨ Download complete!"
ls -la public/fonts/*.woff2 | wc -l | xargs echo "Total fonts:"
