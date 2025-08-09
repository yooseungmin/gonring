"""
Test runner for the 'Integrated Content' backend system tests.
"""
import os
import sys
import pytest

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_tests():
    """Run all tests and display summary"""
    # Run pytest with output
    result = pytest.main(['-v', 'tests/'])
    
    # Print summary based on result code
    if result == 0:  # All tests passed
        print("\n===== TEST SUMMARY =====")
        print("✅ All tests PASSED")
        print("The 'Integrated Content' backend system is working as expected.")
    else:
        print("\n===== TEST SUMMARY =====")
        print("❌ Some tests FAILED")
        print("Please check the test output above for details.")
    
    return result

if __name__ == "__main__":
    run_tests()
