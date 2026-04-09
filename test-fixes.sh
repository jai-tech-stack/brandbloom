#!/bin/bash

BASE_URL="http://localhost:3000"
USER_TOKEN="" # Will set this after registration

echo "🧪 Testing BrandBloom Fixes"
echo "============================"

# Test 1: Brand creation with URL
echo -e "\n✅ Test 1: URL Extraction"
curl -X POST $BASE_URL/api/brands/create \
  -H "Content-Type: application/json" \
  -d '{"method": "url", "url": "https://voltaleadership.com"}' \
  2>/dev/null | jq '.data.brand | {name, sourceType, domain}'

# Test 2: Instagram extraction
echo -e "\n✅ Test 2: Instagram Extraction"  
curl -X POST $BASE_URL/api/brands/create \
  -H "Content-Type: application/json" \
  -d '{"method": "instagram", "instagramHandle": "@brandbloom_ai"}' \
  2>/dev/null | jq '.data.brand | {name, sourceType}'

# Test 3: Asset generation (no dummy images)
echo -e "\n✅ Test 3: Asset Generation - Real Images or Error"
curl -X POST $BASE_URL/api/generate-assets \
  -H "Content-Type: application/json" \
  -d '{"brand": {"name": "Test", "colors": ["#ea751d"], "description": "Test brand"}, "ideaType": "instagram_post", "limit": 1}' \
  2>/dev/null | jq '.error, (.assets[0] | {url, type})'

echo -e "\n✅ All tests complete!"
