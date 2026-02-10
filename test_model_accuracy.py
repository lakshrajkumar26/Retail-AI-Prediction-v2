"""
Quick Model Accuracy Test
Run this to see your model's accuracy
"""

import subprocess
import sys
from pathlib import Path

print("\n" + "="*70)
print("🧪 MODEL ACCURACY TEST")
print("="*70)

print("\n📋 This script will:")
print("   1. Check if model is trained")
print("   2. Run comprehensive evaluation")
print("   3. Show accuracy metrics")
print("   4. Generate detailed reports")

# Check if model exists
model_path = Path("inventory_model/models/demand_model.pkl")
if not model_path.exists():
    print("\n❌ Model not found!")
    print("   Please run training first:")
    print("   cd inventory_model/src")
    print("   python train.py")
    sys.exit(1)

print("\n✅ Model found!")
print("\n🔄 Running evaluation...")
print("="*70 + "\n")

# Run evaluation
try:
    result = subprocess.run(
        [sys.executable, "inventory_model/src/evaluate_model.py"],
        capture_output=False,
        text=True
    )
    
    if result.returncode == 0:
        print("\n" + "="*70)
        print("✅ EVALUATION COMPLETE!")
        print("="*70)
        print("\n📁 Generated Files:")
        print("   • inventory_model/models/evaluation_results.pkl")
        print("   • inventory_model/data/prediction_evaluation.csv")
        print("\n💡 Tip: Check the CSV file for detailed prediction analysis")
    else:
        print("\n❌ Evaluation failed!")
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nTry running manually:")
    print("   cd inventory_model/src")
    print("   python evaluate_model.py")
