#!/bin/bash

echo "🎨 Creating app icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Please install it first:"
    echo "   brew install imagemagick"
    exit 1
fi

# Create different icon sizes
echo "📱 Creating 16x16 favicon..."
convert icon_ultra_minimal.svg -resize 16x16 favicon.ico

echo "📱 Creating 32x32 icon..."
convert icon_ultra_minimal.svg -resize 32x32 icon-32x32.png

echo "📱 Creating 192x192 icon..."
convert icon_ultra_minimal.svg -resize 192x192 logo192.png

echo "📱 Creating 512x512 icon..."
convert icon_ultra_minimal.svg -resize 512x512 logo512.png

echo "📱 Creating 1024x1024 app icon..."
convert icon_ultra_minimal.svg -resize 1024x1024 app-icon.png

echo "✅ All icons created successfully!"
echo ""
echo "📁 Generated files:"
echo "   - favicon.ico (16x16)"
echo "   - icon-32x32.png"
echo "   - logo192.png"
echo "   - logo512.png"
echo "   - app-icon.png (1024x1024)"
echo ""
echo "💡 To use these icons:"
echo "   1. Copy favicon.ico to web-app/app/public/"
echo "   2. Copy logo192.png and logo512.png to web-app/app/public/"
echo "   3. Use app-icon.png for macOS app icon"

