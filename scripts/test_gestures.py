"""
Gesture System Debug Script
Tests the complete gesture detection pipeline
"""
import requests
import json

def test_cv_service():
    """Test CV service gesture classification"""
    print("=" * 60)
    print("Testing CV Service")
    print("=" * 60)
    
    # Sample hand landmarks (21 points)
    sample_landmarks = [
        {"x": 0.5, "y": 0.5, "z": 0.0},  # Wrist
        {"x": 0.52, "y": 0.48, "z": 0.0},
        {"x": 0.54, "y": 0.46, "z": 0.0},
        {"x": 0.56, "y": 0.44, "z": 0.0},
        {"x": 0.58, "y": 0.42, "z": 0.0},  # Thumb tip
        {"x": 0.52, "y": 0.45, "z": 0.0},
        {"x": 0.54, "y": 0.40, "z": 0.0},
        {"x": 0.56, "y": 0.35, "z": 0.0},
        {"x": 0.58, "y": 0.30, "z": 0.0},  # Index tip
        {"x": 0.50, "y": 0.45, "z": 0.0},
        {"x": 0.50, "y": 0.40, "z": 0.0},
        {"x": 0.50, "y": 0.35, "z": 0.0},
        {"x": 0.50, "y": 0.30, "z": 0.0},  # Middle tip
        {"x": 0.48, "y": 0.45, "z": 0.0},
        {"x": 0.48, "y": 0.40, "z": 0.0},
        {"x": 0.48, "y": 0.35, "z": 0.0},
        {"x": 0.48, "y": 0.30, "z": 0.0},  # Ring tip
        {"x": 0.46, "y": 0.45, "z": 0.0},
        {"x": 0.46, "y": 0.40, "z": 0.0},
        {"x": 0.46, "y": 0.35, "z": 0.0},
        {"x": 0.46, "y": 0.30, "z": 0.0},  # Pinky tip
    ]
    
    try:
        response = requests.post(
            "http://localhost:8001/classify",
            json={"landmarks": sample_landmarks},
            timeout=2
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ CV Service Response:")
            print(f"   Action: {result.get('action')}")
            print(f"   Confidence: {result.get('confidence')}")
            print(f"   Value: {result.get('value')}")
            return True
        else:
            print(f"❌ CV Service Error: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to CV Service (Port 8001)")
        print("   Make sure CV Service is running")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_realtime_service():
    """Test Realtime service"""
    print("\n" + "=" * 60)
    print("Testing Realtime Service")
    print("=" * 60)
    
    try:
        response = requests.get("http://localhost:8002/health", timeout=2)
        if response.status_code == 200:
            print("✅ Realtime Service is running")
            data = response.json()
            print(f"   Active rooms: {data.get('active_rooms', 0)}")
            return True
        else:
            print(f"❌ Realtime Service Error: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Realtime Service (Port 8002)")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_backend_service():
    """Test Backend service"""
    print("\n" + "=" * 60)
    print("Testing Backend Service")
    print("=" * 60)
    
    try:
        response = requests.get("http://localhost:8000/api-info", timeout=2)
        if response.status_code == 200:
            print("✅ Backend Service is running")
            data = response.json()
            print(f"   Version: {data.get('version')}")
            return True
        else:
            print(f"❌ Backend Service Error: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Backend Service (Port 8000)")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("\n" + "=" * 60)
    print("HoloCollab EduMeet - Gesture System Debug")
    print("=" * 60 + "\n")
    
    results = []
    
    # Test all services
    results.append(("Backend", test_backend_service()))
    results.append(("CV Service", test_cv_service()))
    results.append(("Realtime", test_realtime_service()))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{name:20} {status}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ All tests passed! Gesture system is ready.")
        print("\nNext steps:")
        print("1. Open frontend: http://localhost:5173")
        print("2. Create/join a session")
        print("3. Allow camera permissions")
        print("4. Try hand gestures in front of camera")
    else:
        print("❌ Some tests failed. Please fix the issues above.")
        print("\nTroubleshooting:")
        print("1. Make sure all services are running (START_DEV.bat)")
        print("2. Check service logs for errors")
        print("3. Verify ports are not in use by other applications")
    print("=" * 60)

if __name__ == "__main__":
    main()
