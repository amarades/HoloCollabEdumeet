"""
Download MediaPipe Hands files for offline use
"""
import os
import urllib.request
from pathlib import Path

MEDIAPIPE_VERSION = "0.4.1675469240"
CDN_BASE = f"https://cdn.jsdelivr.net/npm/@mediapipe/hands@{MEDIAPIPE_VERSION}"

FILES = [
    "hands.binarypb",
    "hands_solution_packed_assets.data",
    "hands_solution_packed_assets_loader.js",
    "hands_solution_simd_wasm_bin.js",
    "hands_solution_simd_wasm_bin.wasm"
]

def download_mediapipe_files():
    """Download MediaPipe files to public directory"""
    
    # Create directory
    target_dir = Path("apps/web/public/mediapipe/hands")
    target_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("Downloading MediaPipe Hands Files")
    print("=" * 60)
    print()
    
    for filename in FILES:
        url = f"{CDN_BASE}/{filename}"
        target_path = target_dir / filename
        
        if target_path.exists():
            print(f"✓ {filename} (already exists)")
            continue
        
        try:
            print(f"⬇ Downloading {filename}...")
            urllib.request.urlretrieve(url, target_path)
            print(f"✅ {filename} downloaded")
        except Exception as e:
            print(f"❌ Failed to download {filename}: {e}")
    
    print()
    print("=" * 60)
    print("Download complete!")
    print("=" * 60)
    print()
    print("MediaPipe files are now available locally.")
    print("The app will use these files instead of CDN.")

if __name__ == "__main__":
    download_mediapipe_files()
