#!/usr/bin/env python3
"""
Quick test script to verify deployment setup
Run: python test_deployment.py
"""
import os
import sys

def test_imports():
    """Test if all required modules can be imported"""
    print("Testing imports...")
    try:
        import flask
        import pandas
        import werkzeug
        print("[OK] Core imports successful")
        try:
            import gunicorn
            print("[OK] Gunicorn available (optional for local testing)")
        except ImportError:
            print("[INFO] Gunicorn not installed locally (will be installed during deployment)")
        return True
    except ImportError as e:
        print(f"[FAIL] Import error: {e}")
        return False

def test_csv_file():
    """Test if CSV file exists"""
    print("\nTesting CSV file...")
    if os.path.exists("vgsales.csv"):
        size = os.path.getsize("vgsales.csv")
        print(f"[OK] vgsales.csv found ({size:,} bytes)")
        return True
    else:
        print("[FAIL] vgsales.csv NOT found")
        return False

def test_app_load():
    """Test if app can be loaded"""
    print("\nTesting app loading...")
    try:
        # Set a test secret key
        os.environ['SECRET_KEY'] = 'test-key-for-deployment-check'
        from app import app
        print("[OK] App loaded successfully")
        return True
    except Exception as e:
        print(f"[FAIL] App load error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_requirements():
    """Check if requirements.txt exists"""
    print("\nTesting requirements.txt...")
    if os.path.exists("requirements.txt"):
        with open("requirements.txt", "r") as f:
            lines = [l.strip() for l in f.readlines() if l.strip() and not l.startswith("#")]
            print(f"[OK] requirements.txt found ({len(lines)} packages)")
            if "gunicorn" in "".join(lines):
                print("[OK] Gunicorn in requirements.txt")
            else:
                print("[WARN] Gunicorn not in requirements.txt")
        return True
    else:
        print("[FAIL] requirements.txt NOT found")
        return False

def test_procfile():
    """Check if Procfile exists and is correct"""
    print("\nTesting Procfile...")
    if os.path.exists("Procfile"):
        with open("Procfile", "r") as f:
            content = f.read().strip()
            if "gunicorn app:app" in content:
                print("[OK] Procfile found and correct")
                return True
            else:
                print(f"[WARN] Procfile found but content may be incorrect: {content}")
                return False
    else:
        print("[FAIL] Procfile NOT found")
        return False

def main():
    """Run all tests"""
    print("=" * 50)
    print("DEPLOYMENT SETUP TEST")
    print("=" * 50)
    
    results = []
    results.append(("Imports", test_imports()))
    results.append(("CSV File", test_csv_file()))
    results.append(("Requirements", test_requirements()))
    results.append(("Procfile", test_procfile()))
    results.append(("App Load", test_app_load()))
    
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    all_passed = True
    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{name}: {status}")
        if not result:
            all_passed = False
    
    if all_passed:
        print("\n[SUCCESS] All tests passed! Ready for deployment.")
        print("\nNext steps:")
        print("1. Set SECRET_KEY environment variable in your deployment platform")
        print("2. Ensure vgsales.csv is committed to Git")
        print("3. Deploy to your chosen platform")
        return 0
    else:
        print("\n[WARNING] Some tests failed. Fix issues before deploying.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

