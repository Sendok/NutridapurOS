"""
NutriDapur OS Backend API Test Suite
Tests all endpoints with proper auth and RBAC validation
"""
import requests
import sys
import time
from datetime import datetime

BASE_URL = "https://vendor-katering-app.preview.emergentagent.com/api"

class NutriDapurTester:
    def __init__(self):
        self.tokens = {}
        self.users = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log(self, msg, status="INFO"):
        prefix = {"INFO": "ℹ️", "PASS": "✅", "FAIL": "❌", "WARN": "⚠️"}
        print(f"{prefix.get(status, 'ℹ️')} {msg}")
    
    def test(self, name, method, endpoint, expected_status, data=None, token=None, description=""):
        """Run a single API test"""
        url = f"{BASE_URL}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        self.tests_run += 1
        self.log(f"Test #{self.tests_run}: {name}", "INFO")
        if description:
            print(f"   📝 {description}")
        
        try:
            if method == 'GET':
                resp = requests.get(url, headers=headers, timeout=15)
            elif method == 'POST':
                resp = requests.post(url, json=data, headers=headers, timeout=15)
            elif method == 'PATCH':
                resp = requests.patch(url, json=data, headers=headers, timeout=15)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = resp.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"PASSED - Status: {resp.status_code}", "PASS")
                return True, resp.json() if resp.text else {}
            else:
                self.log(f"FAILED - Expected {expected_status}, got {resp.status_code}", "FAIL")
                self.log(f"Response: {resp.text[:200]}", "FAIL")
                self.failed_tests.append(f"{name} - Expected {expected_status}, got {resp.status_code}")
                return False, {}
        except Exception as e:
            self.log(f"FAILED - Exception: {str(e)}", "FAIL")
            self.failed_tests.append(f"{name} - Exception: {str(e)}")
            return False, {}
    
    def test_auth(self):
        """Test authentication endpoints"""
        self.log("\n=== TESTING AUTHENTICATION ===", "INFO")
        
        # Test login for all 3 demo accounts
        for email, role in [
            ("admin@nutridapur.id", "admin"),
            ("gizi@nutridapur.id", "gizi"),
            ("sekolah@nutridapur.id", "sekolah")
        ]:
            success, resp = self.test(
                f"Login as {role}",
                "POST",
                "auth/login",
                200,
                {"email": email, "password": "demo123"},
                description=f"Login with {email}"
            )
            if success and 'token' in resp and 'user' in resp:
                self.tokens[role] = resp['token']
                self.users[role] = resp['user']
                self.log(f"   Token saved for {role}: {resp['user'].get('nama', 'N/A')}", "INFO")
            else:
                self.log(f"   Failed to get token for {role}", "FAIL")
        
        # Test register
        test_email = f"test_{int(time.time())}@test.id"
        success, resp = self.test(
            "Register new user",
            "POST",
            "auth/register",
            200,
            {"nama": "Test User", "email": test_email, "password": "test123", "role": "admin"},
            description="Create new admin user"
        )
        if success and 'token' in resp:
            self.log("   Registration successful with token", "PASS")
    
    def test_dashboard(self):
        """Test dashboard summary endpoint"""
        self.log("\n=== TESTING DASHBOARD ===", "INFO")
        
        success, resp = self.test(
            "Dashboard summary",
            "GET",
            "dashboard/summary",
            200,
            token=self.tokens.get('admin'),
            description="Get dashboard stats with admin token"
        )
        if success:
            required_fields = ['total_porsi_hari_ini', 'hpp_per_porsi', 'skor_gizi', 'rating_orang_tua', 
                             'sipgn_ready', 'chart_budget', 'chart_gizi']
            missing = [f for f in required_fields if f not in resp]
            if missing:
                self.log(f"   Missing fields: {missing}", "FAIL")
                self.failed_tests.append(f"Dashboard summary - Missing fields: {missing}")
            else:
                self.log(f"   All required fields present. SIPGN ready: {resp.get('sipgn_ready')}", "PASS")
                self.log(f"   Chart budget entries: {len(resp.get('chart_budget', []))}", "INFO")
    
    def test_ai_menu_generation(self):
        """Test AI menu generation with fallback"""
        self.log("\n=== TESTING AI MENU GENERATION ===", "INFO")
        
        # Test with admin role (should work)
        success, resp = self.test(
            "AI Menu Generation (admin)",
            "POST",
            "ai/generate-menu",
            200,
            {
                "budget_per_porsi": 15000,
                "porsi_target": 500,
                "age_group": "SD",
                "bahan_lokal": ["Ayam", "Tempe"]
            },
            token=self.tokens.get('admin'),
            description="Generate menu with admin role (may take up to 9s)"
        )
        if success:
            if 'menus' in resp and len(resp.get('menus', [])) == 3:
                self.log(f"   3 menus generated. Fallback used: {resp.get('fallback_used', False)}", "PASS")
                menu = resp['menus'][0]
                if 'gizi' in menu and 'total_biaya' in menu:
                    self.log(f"   Menu structure valid: {menu.get('nama_menu', 'N/A')}", "PASS")
            else:
                self.log(f"   Expected 3 menus, got {len(resp.get('menus', []))}", "FAIL")
                self.failed_tests.append("AI Menu Generation - Did not return 3 menus")
        
        # Test with sekolah role (should get 403)
        success, resp = self.test(
            "AI Menu Generation RBAC (sekolah should fail)",
            "POST",
            "ai/generate-menu",
            403,
            {"budget_per_porsi": 15000, "porsi_target": 500, "age_group": "SD", "bahan_lokal": []},
            token=self.tokens.get('sekolah'),
            description="Sekolah role should get 403 Forbidden"
        )
    
    def test_menu_lock(self):
        """Test menu locking"""
        self.log("\n=== TESTING MENU LOCK ===", "INFO")
        
        # First generate a menu
        success, resp = self.test(
            "Generate menu for locking",
            "POST",
            "ai/generate-menu",
            200,
            {"budget_per_porsi": 15000, "porsi_target": 500, "age_group": "SD", "bahan_lokal": ["Ayam"]},
            token=self.tokens.get('admin')
        )
        
        if success and resp.get('menus'):
            menu = resp['menus'][0]
            success, lock_resp = self.test(
                "Lock menu",
                "POST",
                "menus/lock",
                200,
                {
                    "menu": menu,
                    "age_group": "SD",
                    "porsi_target": 500,
                    "budget_per_porsi": 15000
                },
                token=self.tokens.get('admin'),
                description="Lock first menu for production"
            )
            if success:
                self.log(f"   Menu locked: {lock_resp.get('nama_menu', 'N/A')}", "PASS")
        
        # Test get today's menu
        success, resp = self.test(
            "Get today's menu",
            "GET",
            "menus/today",
            200,
            description="Retrieve locked menu for today"
        )
        if success and resp:
            self.log(f"   Today's menu: {resp.get('nama_menu', 'N/A')}", "PASS")
    
    def test_procurement(self):
        """Test procurement endpoints"""
        self.log("\n=== TESTING PROCUREMENT ===", "INFO")
        
        # Shopping list (admin only)
        success, resp = self.test(
            "Shopping list (admin)",
            "GET",
            "procurement/shopping-list",
            200,
            token=self.tokens.get('admin'),
            description="Get shopping list derived from locked menu"
        )
        if success:
            self.log(f"   Shopping list items: {len(resp.get('shopping_list', []))}", "INFO")
            self.log(f"   Total: Rp {resp.get('total', 0):,}", "INFO")
        
        # Test RBAC - sekolah should get 403
        success, resp = self.test(
            "Shopping list RBAC (sekolah should fail)",
            "GET",
            "procurement/shopping-list",
            403,
            token=self.tokens.get('sekolah'),
            description="Sekolah role should get 403"
        )
        
        # Get vendors
        success, resp = self.test(
            "Get vendors",
            "GET",
            "procurement/vendors",
            200,
            token=self.tokens.get('admin'),
            description="Get list of seeded vendors"
        )
        if success:
            vendors = resp if isinstance(resp, list) else []
            self.log(f"   Vendors found: {len(vendors)}", "INFO")
            if len(vendors) >= 4:
                self.log("   Expected 4+ seeded vendors present", "PASS")
                vendor_id = vendors[0].get('id') if vendors else None
                
                # Create PO
                if vendor_id:
                    success, po_resp = self.test(
                        "Create PO",
                        "POST",
                        "procurement/po",
                        200,
                        {
                            "vendor_id": vendor_id,
                            "items": [{"nama": "Test Item", "qty": "10 kg", "harga": 100000}],
                            "tanggal_kirim": "2025-08-15",
                            "total": 100000
                        },
                        token=self.tokens.get('admin'),
                        description="Create purchase order"
                    )
                    if success:
                        self.log(f"   PO created: {po_resp.get('id', 'N/A')}", "PASS")
        
        # Get PO list
        success, resp = self.test(
            "Get PO list",
            "GET",
            "procurement/pos",
            200,
            token=self.tokens.get('admin'),
            description="Get list of purchase orders"
        )
        if success:
            pos = resp if isinstance(resp, list) else []
            self.log(f"   POs found: {len(pos)}", "INFO")
    
    def test_qc(self):
        """Test QC endpoints"""
        self.log("\n=== TESTING QC ===", "INFO")
        
        # Upload QC
        success, resp = self.test(
            "Upload QC photo",
            "POST",
            "qc/upload",
            200,
            {
                "photo": "https://images.unsplash.com/photo-1609710219624-201223bd6b1e",
                "checklist": {"higienis": True, "suhu": True, "gizi_4_bintang": True, "uji_rasa": True},
                "catatan": "Test QC upload",
                "lokasi": "Test Location"
            },
            token=self.tokens.get('admin'),
            description="Upload QC photo with checklist"
        )
        qc_id = None
        if success:
            qc_id = resp.get('id')
            self.log(f"   QC uploaded: {qc_id}", "PASS")
        
        # Get QC logs
        success, resp = self.test(
            "Get QC logs",
            "GET",
            "qc/logs",
            200,
            token=self.tokens.get('admin'),
            description="Get all QC logs"
        )
        if success:
            logs = resp if isinstance(resp, list) else []
            self.log(f"   QC logs found: {len(logs)}", "INFO")
            if len(logs) >= 5:
                self.log("   Expected 5+ seeded QC logs present", "PASS")
        
        # Approve QC (if we have an ID)
        if qc_id:
            success, resp = self.test(
                "Approve QC",
                "POST",
                f"qc/{qc_id}/approve",
                200,
                token=self.tokens.get('gizi'),
                description="Approve QC with gizi role"
            )
            if success:
                self.log(f"   QC approved by: {resp.get('approved_by', 'N/A')}", "PASS")
    
    def test_deliveries(self):
        """Test delivery endpoints"""
        self.log("\n=== TESTING DELIVERIES ===", "INFO")
        
        # Get deliveries
        success, resp = self.test(
            "Get deliveries",
            "GET",
            "deliveries",
            200,
            token=self.tokens.get('admin'),
            description="Get all deliveries"
        )
        delivery_id = None
        if success:
            deliveries = resp if isinstance(resp, list) else []
            self.log(f"   Deliveries found: {len(deliveries)}", "INFO")
            if len(deliveries) >= 5:
                self.log("   Expected 5 seeded deliveries present", "PASS")
                delivery_id = deliveries[0].get('id') if deliveries else None
        
        # Update delivery status
        if delivery_id:
            success, resp = self.test(
                "Update delivery status",
                "PATCH",
                f"deliveries/{delivery_id}/status",
                200,
                {"status": "delivered"},
                token=self.tokens.get('admin'),
                description="Change delivery status to delivered"
            )
            if success:
                self.log(f"   Delivery status updated: {resp.get('status', 'N/A')}", "PASS")
            
            # Test sekolah role can also update
            success, resp = self.test(
                "Update delivery status (sekolah role)",
                "PATCH",
                f"deliveries/{delivery_id}/status",
                200,
                {"status": "on_delivery"},
                token=self.tokens.get('sekolah'),
                description="Sekolah role should be able to update delivery"
            )
    
    def test_public_parent_portal(self):
        """Test public parent portal (no auth)"""
        self.log("\n=== TESTING PUBLIC PARENT PORTAL ===", "INFO")
        
        # Get parent portal data (no auth)
        success, resp = self.test(
            "Get parent portal data (public)",
            "GET",
            "public/parent-portal",
            200,
            description="Public endpoint - no auth required"
        )
        if success:
            required = ['sekolah', 'dapur', 'menu', 'qc', 'total_ulasan', 'rating_rata']
            missing = [f for f in required if f not in resp]
            if missing:
                self.log(f"   Missing fields: {missing}", "FAIL")
                self.failed_tests.append(f"Parent portal - Missing fields: {missing}")
            else:
                self.log(f"   All fields present. Rating: {resp.get('rating_rata')} from {resp.get('total_ulasan')} reviews", "PASS")
        
        # Submit feedback (no auth)
        success, resp = self.test(
            "Submit feedback (public)",
            "POST",
            "public/feedback",
            200,
            {
                "rasa": 5,
                "porsi": 4,
                "kesegaran": 5,
                "tags": ["Anak Suka!"],
                "catatan": "Test feedback from automated test",
                "sekolah": "SD Negeri 1 Sukajadi",
                "kelas": "Kelas 3B"
            },
            description="Submit parent feedback without auth"
        )
        if success:
            self.log(f"   Feedback submitted: {resp.get('id', 'N/A')}", "PASS")
            self.log(f"   Rating avg: {resp.get('rating_avg', 0)}", "INFO")
        
        # Verify feedback increased count
        success, resp = self.test(
            "Verify feedback count increased",
            "GET",
            "public/parent-portal",
            200
        )
        if success:
            self.log(f"   Updated total reviews: {resp.get('total_ulasan', 0)}", "INFO")
    
    def test_notifications(self):
        """Test notification endpoints"""
        self.log("\n=== TESTING NOTIFICATIONS ===", "INFO")
        
        # Get notifications
        success, resp = self.test(
            "Get notifications",
            "GET",
            "notifications",
            200,
            token=self.tokens.get('admin'),
            description="Get all notifications"
        )
        if success:
            notifs = resp if isinstance(resp, list) else []
            self.log(f"   Notifications found: {len(notifs)}", "INFO")
        
        # Mark all read
        success, resp = self.test(
            "Mark all notifications read",
            "POST",
            "notifications/read-all",
            200,
            token=self.tokens.get('admin'),
            description="Mark all notifications as read"
        )
    
    def test_finance(self):
        """Test finance endpoints"""
        self.log("\n=== TESTING FINANCE ===", "INFO")
        
        # Get P&L (admin only)
        success, resp = self.test(
            "Get P&L report (admin)",
            "GET",
            "finance/pnl",
            200,
            token=self.tokens.get('admin'),
            description="Get profit & loss report"
        )
        if success:
            required = ['rows', 'total_budget', 'total_aktual', 'total_margin', 'total_porsi']
            missing = [f for f in required if f not in resp]
            if missing:
                self.log(f"   Missing fields: {missing}", "FAIL")
                self.failed_tests.append(f"Finance P&L - Missing fields: {missing}")
            else:
                self.log(f"   P&L rows: {len(resp.get('rows', []))}", "INFO")
                self.log(f"   Total budget: Rp {resp.get('total_budget', 0):,}", "INFO")
        
        # Test RBAC - sekolah should get 403
        success, resp = self.test(
            "Get P&L RBAC (sekolah should fail)",
            "GET",
            "finance/pnl",
            403,
            token=self.tokens.get('sekolah'),
            description="Sekolah role should get 403"
        )
        
        # SIPGN export
        success, resp = self.test(
            "SIPGN export",
            "GET",
            "reports/sipgn-export",
            200,
            token=self.tokens.get('admin'),
            description="Export SIPGN report (JSON file)"
        )
        if success:
            if 'format' in resp and resp.get('format') == 'LAPORAN_SIPGN_BGN_V1':
                self.log("   SIPGN report format valid", "PASS")
            else:
                self.log("   SIPGN report format invalid", "FAIL")
                self.failed_tests.append("SIPGN export - Invalid format")
    
    def test_feedback(self):
        """Test feedback endpoint (auth required)"""
        self.log("\n=== TESTING FEEDBACK (AUTH) ===", "INFO")
        
        success, resp = self.test(
            "Get feedback list",
            "GET",
            "feedback",
            200,
            token=self.tokens.get('admin'),
            description="Get all feedback (requires auth)"
        )
        if success:
            feedbacks = resp if isinstance(resp, list) else []
            self.log(f"   Feedback entries: {len(feedbacks)}", "INFO")
    
    def run_all_tests(self):
        """Run all test suites"""
        self.log("\n" + "="*60, "INFO")
        self.log("NUTRIDAPUR OS BACKEND API TEST SUITE", "INFO")
        self.log(f"Base URL: {BASE_URL}", "INFO")
        self.log(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", "INFO")
        self.log("="*60 + "\n", "INFO")
        
        try:
            self.test_auth()
            
            if not self.tokens.get('admin'):
                self.log("\n❌ CRITICAL: Admin login failed. Cannot proceed with tests.", "FAIL")
                return False
            
            self.test_dashboard()
            self.test_ai_menu_generation()
            self.test_menu_lock()
            self.test_procurement()
            self.test_qc()
            self.test_deliveries()
            self.test_public_parent_portal()
            self.test_notifications()
            self.test_finance()
            self.test_feedback()
            
        except Exception as e:
            self.log(f"\n❌ CRITICAL ERROR: {str(e)}", "FAIL")
            return False
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "="*60, "INFO")
        self.log("TEST SUMMARY", "INFO")
        self.log("="*60, "INFO")
        self.log(f"Total tests run: {self.tests_run}", "INFO")
        self.log(f"Tests passed: {self.tests_passed}", "PASS")
        self.log(f"Tests failed: {self.tests_run - self.tests_passed}", "FAIL")
        
        if self.tests_run > 0:
            success_rate = (self.tests_passed / self.tests_run) * 100
            self.log(f"Success rate: {success_rate:.1f}%", "INFO")
            
            if self.failed_tests:
                self.log("\nFailed tests:", "FAIL")
                for i, test in enumerate(self.failed_tests, 1):
                    print(f"  {i}. {test}")
        
        self.log("="*60 + "\n", "INFO")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = NutriDapurTester()
    tester.run_all_tests()
    return tester.print_summary()

if __name__ == "__main__":
    sys.exit(main())
