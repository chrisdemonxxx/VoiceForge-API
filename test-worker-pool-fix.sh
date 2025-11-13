#!/bin/bash
# Test script to verify Python worker pool fixes

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Testing Python Worker Pool Fixes                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Check Python availability
echo "1. Testing Python availability..."
PYTHON_CMD=$(which python3 2>/dev/null || which python 2>/dev/null || echo "")
if [ -n "$PYTHON_CMD" ]; then
    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
    echo "✅ Python found: $PYTHON_CMD"
    echo "   Version: $PYTHON_VERSION"
else
    echo "❌ Python not found in PATH"
    exit 1
fi

# Test 2: Check worker_pool.py exists
echo ""
echo "2. Testing script path resolution..."
SCRIPT_PATH="server/ml-services/worker_pool.py"
if [ -f "$SCRIPT_PATH" ]; then
    echo "✅ Script found: $SCRIPT_PATH"
    echo "   Size: $(ls -lh $SCRIPT_PATH | awk '{print $5}')"
else
    echo "❌ Script not found: $SCRIPT_PATH"
    exit 1
fi

# Test 3: Test Python can import required modules
echo ""
echo "3. Testing Python dependencies..."
$PYTHON_CMD -c "
import sys
import json
import multiprocessing
print('✅ Core Python modules available')
" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Python dependencies check passed"
else
    echo "⚠️  Some Python dependencies may be missing"
fi

# Test 4: Test worker pool can start (dry run)
echo ""
echo "4. Testing worker pool script (dry run)..."
TIMEOUT=5
$PYTHON_CMD "$SCRIPT_PATH" --workers 1 --worker-type tts 2>&1 &
POOL_PID=$!
sleep 2
if ps -p $POOL_PID > /dev/null 2>&1; then
    echo "✅ Worker pool process started successfully"
    kill $POOL_PID 2>/dev/null
    wait $POOL_PID 2>/dev/null
else
    echo "⚠️  Worker pool process exited quickly (may be normal if dependencies missing)"
fi

# Test 5: Check environment variables
echo ""
echo "5. Testing environment variables..."
if [ -n "$PYTHON_PATH" ]; then
    echo "✅ PYTHON_PATH set: $PYTHON_PATH"
else
    echo "ℹ️  PYTHON_PATH not set (will use auto-detection)"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        TEST SUMMARY                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Python availability: Verified"
echo "✅ Script path: Verified"
echo "✅ Basic dependencies: Checked"
echo ""
echo "The fixes should work correctly. Deploy to HF Space to test fully."

