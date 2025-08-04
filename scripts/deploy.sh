#!/bin/bash

# Deployment script for yoklick-2
echo "🚀 Starting deployment process..."

# Clean up previous builds
echo "🧹 Cleaning up previous builds..."
rm -rf .next
rm -rf out
rm -rf dist

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run type check (optional - can be skipped for faster deployment)
if [ "$1" != "--no-type-check" ]; then
    echo "🔍 Running type check..."
    npm run type-check
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!" 