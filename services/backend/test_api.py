import requests
import os

BASE_URL = "http://localhost:8000"

def test_upload():
    print("Testing model upload...")
    # Create a dummy GLB file content (minimal valid GLB header)
    glb_content = b'glTF' + (2).to_bytes(4, 'little') + (12).to_bytes(4, 'little')
    
    with open("test.glb", "wb") as f:
        f.write(glb_content)
    
    try:
        with open("test.glb", "rb") as f:
            files = {'model': ('test.glb', f, 'application/octet-stream')}
            data = {'name': 'Test Model', 'category': 'Testing'}
            response = requests.post(f"{BASE_URL}/api/models/upload", files=files, data=data)
            
        if response.status_code == 200:
            print("Upload successful!")
            print(response.json())
        else:
            print(f"Upload failed with status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if os.path.exists("test.glb"):
            os.remove("test.glb")

def test_list():
    print("Testing model list...")
    try:
        response = requests.get(f"{BASE_URL}/api/models/")
        if response.status_code == 200:
            models = response.json()
            print(f"Found {len(models)} models.")
            for m in models:
                print(f"- {m['name']} (Curated: {m.get('is_curated', False)})")
        else:
            print(f"List failed with status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_list()
    test_upload()
    test_list()
