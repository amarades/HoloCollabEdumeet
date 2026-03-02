"""
Service Health Check Script
Tests if all HoloCollab EduMeet services are running correctly
"""
import requests
import sys
from colorama import init, Fore, Style

# Initialize colorama for Windows
init()

SERVICES = [
    {"name": "Backend", "url": "http://127.0.0.1:8000/api-info"},
    {"name": "AI Service", "url": "http://127.0.0.1:8003/health"},
    {"name": "CV Service", "url": "http://127.0.0.1:8001/health"},
    {"name": "Realtime Service", "url": "http://127.0.0.1:8002/health"},
]

def check_service(service):
    """Check if a service is responding"""
    try:
        response = requests.get(service["url"], timeout=2)
        if response.status_code == 200:
            print(f"{Fore.GREEN}✓{Style.RESET_ALL} {service['name']}: {Fore.GREEN}Running{Style.RESET_ALL}")
            return True
        else:
            print(f"{Fore.RED}✗{Style.RESET_ALL} {service['name']}: {Fore.RED}Error (Status {response.status_code}){Style.RESET_ALL}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"{Fore.RED}✗{Style.RESET_ALL} {service['name']}: {Fore.RED}Not running{Style.RESET_ALL}")
        return False
    except requests.exceptions.Timeout:
        print(f"{Fore.YELLOW}⚠{Style.RESET_ALL} {service['name']}: {Fore.YELLOW}Timeout{Style.RESET_ALL}")
        return False
    except Exception as e:
        print(f"{Fore.RED}✗{Style.RESET_ALL} {service['name']}: {Fore.RED}Error - {str(e)}{Style.RESET_ALL}")
        return False

def main():
    print("=" * 60)
    print("HoloCollab EduMeet - Service Health Check")
    print("=" * 60)
    print()
    
    results = []
    for service in SERVICES:
        results.append(check_service(service))
    
    print()
    print("=" * 60)
    
    if all(results):
        print(f"{Fore.GREEN}All services are running correctly!{Style.RESET_ALL}")
        print()
        print("You can now:")
        print("  1. Start the frontend: cd apps\\web && npm run dev")
        print("  2. Access the app: http://localhost:5173")
        sys.exit(0)
    else:
        print(f"{Fore.RED}Some services are not running.{Style.RESET_ALL}")
        print()
        print("Please ensure all services are started:")
        print("  Run: START_DEV.bat")
        sys.exit(1)

if __name__ == "__main__":
    main()
