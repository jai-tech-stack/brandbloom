#!/usr/bin/env python3
"""
Backend API Testing for AI Brand Asset Generator
Tests all API endpoints: /api/extract-brand, /api/generate-assets, /api/brands
"""

import requests
import json
import sys
from datetime import datetime

class BrandAssetAPITester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_extract_brand_api(self):
        """Test /api/extract-brand endpoint with stripe.com"""
        print("\n🔍 Testing Brand Extraction API...")
        
        try:
            url = f"{self.base_url}/api/extract-brand"
            payload = {"url": "https://stripe.com"}
            
            response = self.session.post(url, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["name", "description", "colors", "domain", "siteUrl"]
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_test("Extract Brand API - Response Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Extract Brand API - Response Structure", True)
                
                # Check if brand data makes sense
                if data.get("name") and data.get("domain") and data.get("colors"):
                    self.log_test("Extract Brand API - Data Quality", True)
                    print(f"   Brand: {data.get('name')}")
                    print(f"   Domain: {data.get('domain')}")
                    print(f"   Colors: {len(data.get('colors', []))} colors found")
                    return data
                else:
                    self.log_test("Extract Brand API - Data Quality", False, "Missing essential brand data")
                    return None
            else:
                self.log_test("Extract Brand API - Status Code", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
                return None
                
        except Exception as e:
            self.log_test("Extract Brand API - Request", False, str(e))
            return None

    def test_generate_assets_api(self, brand_data=None):
        """Test /api/generate-assets endpoint"""
        print("\n🎨 Testing Asset Generation API...")
        
        try:
            url = f"{self.base_url}/api/generate-assets"
            
            # Use extracted brand data or fallback
            if brand_data:
                payload = {
                    "url": brand_data.get("siteUrl", "https://stripe.com"),
                    "brand": {
                        "name": brand_data.get("name", "Test Brand"),
                        "colors": brand_data.get("colors", ["#635BFF"]),
                        "description": brand_data.get("description", "Test description")
                    },
                    "limit": 2,
                    "aspectRatio": "1:1"
                }
            else:
                payload = {
                    "url": "https://stripe.com",
                    "brand": {
                        "name": "Stripe",
                        "colors": ["#635BFF"],
                        "description": "Online payment processing"
                    },
                    "limit": 2,
                    "aspectRatio": "1:1"
                }
            
            response = self.session.post(url, json=payload, timeout=120)
            
            if response.status_code == 200:
                data = response.json()
                
                if "assets" in data and isinstance(data["assets"], list):
                    assets = data["assets"]
                    if len(assets) > 0:
                        self.log_test("Generate Assets API - Response", True)
                        
                        # Check asset structure
                        asset = assets[0]
                        required_asset_fields = ["id", "url", "label", "type", "width", "height"]
                        missing_asset_fields = [field for field in required_asset_fields if field not in asset]
                        
                        if missing_asset_fields:
                            self.log_test("Generate Assets API - Asset Structure", False, f"Missing fields: {missing_asset_fields}")
                        else:
                            self.log_test("Generate Assets API - Asset Structure", True)
                        
                        # Check if demo mode
                        if data.get("demo"):
                            print("   ⚠️  Running in demo mode (placeholder images)")
                        else:
                            print("   🎯 Real AI image generation working")
                        
                        print(f"   Generated {len(assets)} assets")
                        for asset in assets:
                            print(f"   - {asset.get('label')}: {asset.get('width')}x{asset.get('height')}")
                        
                        return True
                    else:
                        self.log_test("Generate Assets API - Assets Count", False, "No assets generated")
                        return False
                else:
                    self.log_test("Generate Assets API - Response Format", False, "Invalid response format")
                    return False
            else:
                self.log_test("Generate Assets API - Status Code", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            self.log_test("Generate Assets API - Request", False, str(e))
            return False

    def test_brands_api_unauthorized(self):
        """Test /api/brands endpoint without authentication"""
        print("\n🔒 Testing Brands API (unauthorized)...")
        
        try:
            url = f"{self.base_url}/api/brands"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 401:
                self.log_test("Brands API - Unauthorized Access", True)
                return True
            else:
                self.log_test("Brands API - Unauthorized Access", False, f"Expected 401, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Brands API - Request", False, str(e))
            return False

    def test_homepage_accessibility(self):
        """Test if homepage loads correctly"""
        print("\n🏠 Testing Homepage Accessibility...")
        
        try:
            response = self.session.get(self.base_url, timeout=10)
            
            if response.status_code == 200:
                content = response.text
                
                # Check for key elements
                if "AI Brand Asset Generator" in content or "Brand" in content:
                    self.log_test("Homepage - Content Check", True)
                else:
                    self.log_test("Homepage - Content Check", False, "Missing expected content")
                
                if len(content) > 1000:  # Basic size check
                    self.log_test("Homepage - Size Check", True)
                else:
                    self.log_test("Homepage - Size Check", False, f"Content too small: {len(content)} chars")
                
                return True
            else:
                self.log_test("Homepage - Status Code", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Homepage - Request", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Backend API Tests for AI Brand Asset Generator")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test homepage first
        self.test_homepage_accessibility()
        
        # Test brand extraction
        brand_data = self.test_extract_brand_api()
        
        # Test asset generation
        self.test_generate_assets_api(brand_data)
        
        # Test brands API (should be unauthorized)
        self.test_brands_api_unauthorized()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check details above.")
            return 1

def main():
    tester = BrandAssetAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())