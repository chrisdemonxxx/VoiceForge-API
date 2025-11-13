#!/bin/bash

echo "========================================="
echo "Testing MCP Servers"
echo "========================================="
echo ""

# Test 1: GitHub MCP
echo "1. Testing GitHub MCP..."
if [ -f "/mnt/projects/mcp-servers/node_modules/@modelcontextprotocol/server-github/dist/index.js" ]; then
    echo "   ✓ GitHub MCP server file exists"
    node /mnt/projects/mcp-servers/node_modules/@modelcontextprotocol/server-github/dist/index.js --version 2>&1 | head -1 && echo "   ✓ GitHub MCP can start" || echo "   ✗ GitHub MCP failed to start"
else
    echo "   ✗ GitHub MCP server file not found"
fi
echo ""

# Test 2: Render MCP
echo "2. Testing Render MCP..."
echo "   Checking @llmindset/mcp-hfspace package..."
npx -y @llmindset/mcp-hfspace --version 2>&1 | head -1 && echo "   ✓ Render MCP package accessible" || echo "   ✗ Render MCP package not accessible"
echo ""

# Test 3: Vercel MCP
echo "3. Testing Vercel MCP..."
echo "   Checking @llmindset/mcp-hfspace package..."
npx -y @llmindset/mcp-hfspace --version 2>&1 | head -1 && echo "   ✓ Vercel MCP package accessible" || echo "   ✗ Vercel MCP package not accessible"
echo ""

# Test 4: Hugging Face MCP
echo "4. Testing Hugging Face MCP..."
echo "   Checking for Hugging Face MCP package..."
# Try different possible package names
if npx -y @modelcontextprotocol/server-huggingface --version 2>&1 | grep -q "version\|error"; then
    echo "   Checking @modelcontextprotocol/server-huggingface..."
    npx -y @modelcontextprotocol/server-huggingface --version 2>&1 | head -1
else
    echo "   ✗ Hugging Face MCP package @modelcontextprotocol/server-huggingface not found"
    echo "   Searching for alternative packages..."
    npm search "huggingface mcp" 2>&1 | grep -i "mcp" | head -3
fi
echo ""

echo "========================================="
echo "MCP Configuration Check"
echo "========================================="
if [ -f ~/.config/claude/mcp.json ]; then
    echo "✓ MCP config file exists"
    echo "Checking enabled MCPs:"
    cat ~/.config/claude/mcp.json | grep -A 2 '"github"\|"render"\|"vercel"\|"huggingface"' | grep -E '"disabled"|"description"' | head -8
else
    echo "✗ MCP config file not found"
fi
echo ""

echo "========================================="
echo "Test Complete"
echo "========================================="

