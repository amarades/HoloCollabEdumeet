import time
import json

try:
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

# Simulated Gesture Ground Truth Data vs Predictions
# Classes: 0="None", 1="Open Palm", 2="Fist", 3="Pointing"
GESTURE_CLASSES = ["None", "Open Palm", "Fist", "Pointing"]

# Ground truth (Actual gestures user performed)
y_true = [0, 1, 2, 3, 1, 2, 2, 0, 1, 3, 3, 2, 1, 0, 0]

# Simulated predictions from our Model (with some errors to simulate real-world)
y_pred = [0, 1, 2, 3, 0, 2, 2, 0, 1, 3, 2, 2, 1, 0, 1]

def measure_performance():
    print("=========================================")
    print("   MODEL PERFORMANCE MEASUREMENT TEST    ")
    print("=========================================")
    print("Dataset Size:", len(y_true))
    print("Classes Tested:", GESTURE_CLASSES)
    print("-----------------------------------------")

    if not HAS_SKLEARN:
        print("scikit-learn not found. Measuring basic accuracy only.")
        correct = sum(1 for a, p in zip(y_true, y_pred) if a == p)
        accuracy = correct / len(y_true)
        print(f"Accuracy: {accuracy * 100:.2f}%")
        return

    # Calculate Metrics
    accuracy = accuracy_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_true, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_true, y_pred, average='weighted', zero_division=0)

    print(f"Overall Accuracy:  {accuracy * 100:.2f}%")
    print(f"Overall Precision: {precision * 100:.2f}%")
    print(f"Overall Recall:    {recall * 100:.2f}%")
    print(f"Overall F1-Score:  {f1 * 100:.2f}%")
    
    print("\n--- Detailed Classification Report ---")
    report = classification_report(y_true, y_pred, target_names=GESTURE_CLASSES, zero_division=0)
    print(report)
    print("=========================================")

if __name__ == "__main__":
    start_time = time.time()
    measure_performance()
    end_time = time.time()
    print(f"Measurement execution time: {(end_time - start_time) * 1000:.2f} ms")
