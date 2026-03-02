#!/usr/bin/env python3
"""
Start all HoloCollab EduMeet services concurrently
"""
import subprocess
import sys
import os
import time
from pathlib import Path

# Get the project root directory (parent of scripts/)
PROJECT_ROOT = Path(__file__).parent.parent.resolve()

# Define services with their directories and ports
SERVICES = [
    {
        "name": "Backend",
        "dir": PROJECT_ROOT / "services" / "backend",
        "port": 8000,
        "color": "\033[92m"  # Green
    },
    {
        "name": "AI Service",
        "dir": PROJECT_ROOT / "services" / "ai-service",
        "port": 8003,
        "color": "\033[95m"  # Magenta
    },
    {
        "name": "CV Service",
        "dir": PROJECT_ROOT / "services" / "cv-service",
        "port": 8001,
        "color": "\033[94m"  # Blue
    },
    {
        "name": "Realtime Service",
        "dir": PROJECT_ROOT / "services" / "realtime",
        "port": 8002,
        "color": "\033[93m"  # Yellow
    }
]

RESET_COLOR = "\033[0m"

def start_service(service):
    """Start a single service"""
    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--reload",
        "--host",
        "127.0.0.1",
        "--port",
        str(service["port"])
    ]
    
    print(f"{service['color']}[{service['name']}] Starting on port {service['port']}...{RESET_COLOR}")
    
    process = subprocess.Popen(
        cmd,
        cwd=service["dir"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True
    )
    
    return process

def main():
    """Main function to start all services"""
    print("=" * 60)
    # Avoid Unicode emojis so this works on Windows terminals
    print("Starting HoloCollab EduMeet Services")
    print("=" * 60)
    
    processes = []
    
    try:
        # Start all services
        for service in SERVICES:
            process = start_service(service)
            processes.append((service, process))
            time.sleep(1)  # Small delay between starts
        
        print("\n" + "=" * 60)
        print("All services started!")
        print("=" * 60)
        print("\nService URLs:")
        for service in SERVICES:
            print(f"  {service['color']}{service['name']}{RESET_COLOR}: http://127.0.0.1:{service['port']}")
        print("\nPress Ctrl+C to stop all services")
        print("=" * 60 + "\n")
        
        # Monitor processes and print output
        import select
        if sys.platform != "win32":
            # Unix-like systems
            while True:
                for service, process in processes:
                    line = process.stdout.readline()
                    if line:
                        print(f"{service['color']}[{service['name']}]{RESET_COLOR} {line.rstrip()}")
                time.sleep(0.1)
        else:
            # Windows - simpler approach
            while True:
                alive = False
                for service, process in processes:
                    if process.poll() is None:
                        alive = True
                        line = process.stdout.readline()
                        if line:
                            print(f"{service['color']}[{service['name']}]{RESET_COLOR} {line.rstrip()}")
                
                if not alive:
                    print("\nAll services have stopped")
                    break
                    
                time.sleep(0.1)
    
    except KeyboardInterrupt:
        print("\n\n" + "=" * 60)
        print("Stopping all services...")
        print("=" * 60)
        
        for service, process in processes:
            print(f"{service['color']}[{service['name']}] Stopping...{RESET_COLOR}")
            process.terminate()
        
        # Wait for all processes to terminate
        for service, process in processes:
            process.wait()
            print(f"{service['color']}[{service['name']}] Stopped{RESET_COLOR}")
        
        print("\nAll services stopped successfully")
    
    except Exception as e:
        print(f"\nError: {e}")
        for service, process in processes:
            process.terminate()
        sys.exit(1)

if __name__ == "__main__":
    main()
