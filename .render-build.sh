#!/bin/bash
# Render Build Script - Auto-deletes vite files

echo "Building application..."
npm install

echo "Removing vite files..."
rm -f server/vite.ts vite.config.ts

echo "✅ Build complete!"
