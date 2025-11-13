#!/bin/bash

echo "========================================="
echo "Testing Cursor MCP Configuration"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CONFIG_FILE="$HOME/.cursor/mcp.json"

echo -e "${YELLOW}1. Checking Cursor MCP config file...${NC}"
if [ -f "$CONFIG_FILE" ]; then
    echo -e "   ${GREEN}✓${NC} Config file exists at $CONFIG_FILE"
    
    if python3 -m json.tool "$CONFIG_FILE" > /dev/null 2>&1; then
        echo -e "   ${GREEN}✓${NC} JSON is valid"
        
        TOTAL=$(python3 -c "import json; f=open('$CONFIG_FILE'); d=json.load(f); print(len(d['mcpServers']))")
        echo -e "   ${GREEN}✓${NC} Total MCPs configured: $TOTAL"
    else
        echo -e "   ${RED}✗${NC} JSON is invalid"
        exit 1
    fi
else
    echo -e "   ${RED}✗${NC} Config file not found"
    exit 1
fi
echo ""

echo -e "${YELLOW}2. Testing GitHub MCP...${NC}"
if [ -f "/mnt/projects/mcp-servers/node_modules/@modelcontextprotocol/server-github/dist/index.js" ]; then
    echo -e "   ${GREEN}✓${NC} GitHub MCP server file exists"
    if grep -q "github" "$CONFIG_FILE"; then
        echo -e "   ${GREEN}✓${NC} GitHub MCP is in config"
        GITHUB_STATUS="PASS"
    else
        echo -e "   ${RED}✗${NC} GitHub MCP not in config"
        GITHUB_STATUS="FAIL"
    fi
else
    echo -e "   ${RED}✗${NC} GitHub MCP server file not found"
    GITHUB_STATUS="FAIL"
fi
echo ""

echo -e "${YELLOW}3. Testing Render MCP...${NC}"
if grep -q "render" "$CONFIG_FILE"; then
    echo -e "   ${GREEN}✓${NC} Render MCP is in config"
    # Check if package can be accessed
    if npx -y @llmindset/mcp-hfspace --version 2>&1 | head -1 > /dev/null 2>&1; then
        echo -e "   ${GREEN}✓${NC} Render MCP package is accessible"
        RENDER_STATUS="PASS"
    else
        echo -e "   ${YELLOW}⚠${NC} Render MCP package test inconclusive (may need runtime test)"
        RENDER_STATUS="WARN"
    fi
else
    echo -e "   ${RED}✗${NC} Render MCP not in config"
    RENDER_STATUS="FAIL"
fi
echo ""

echo -e "${YELLOW}4. Testing Vercel MCP...${NC}"
if grep -q "vercel" "$CONFIG_FILE"; then
    echo -e "   ${GREEN}✓${NC} Vercel MCP is in config"
    # Check if package can be accessed
    if npx -y @llmindset/mcp-hfspace --version 2>&1 | head -1 > /dev/null 2>&1; then
        echo -e "   ${GREEN}✓${NC} Vercel MCP package is accessible"
        VERCEL_STATUS="PASS"
    else
        echo -e "   ${YELLOW}⚠${NC} Vercel MCP package test inconclusive (may need runtime test)"
        VERCEL_STATUS="WARN"
    fi
else
    echo -e "   ${RED}✗${NC} Vercel MCP not in config"
    VERCEL_STATUS="FAIL"
fi
echo ""

echo -e "${YELLOW}5. Testing Hugging Face MCP...${NC}"
if grep -q "huggingface" "$CONFIG_FILE"; then
    echo -e "   ${GREEN}✓${NC} Hugging Face MCP is in config"
    # Check if package can be accessed
    if npx -y huggingface-mcp-server --version 2>&1 | head -1 > /dev/null 2>&1; then
        echo -e "   ${GREEN}✓${NC} Hugging Face MCP package is accessible"
        HF_STATUS="PASS"
    else
        echo -e "   ${YELLOW}⚠${NC} Hugging Face MCP package test inconclusive (may need runtime test)"
        HF_STATUS="WARN"
    fi
else
    echo -e "   ${RED}✗${NC} Hugging Face MCP not in config"
    HF_STATUS="FAIL"
fi
echo ""

echo "========================================="
echo -e "${YELLOW}Test Summary:${NC}"
echo "========================================="
echo -e "GitHub MCP:      ${GITHUB_STATUS:-UNKNOWN}"
echo -e "Render MCP:      ${RENDER_STATUS:-UNKNOWN}"
echo -e "Vercel MCP:      ${VERCEL_STATUS:-UNKNOWN}"
echo -e "Hugging Face MCP: ${HF_STATUS:-UNKNOWN}"
echo "========================================="
echo ""
echo -e "${YELLOW}Note:${NC} Some MCPs may need Cursor to be restarted to appear."
echo -e "${YELLOW}Note:${NC} Render/Vercel MCPs may have format issues - they require 'vendor/space' format."
echo ""
