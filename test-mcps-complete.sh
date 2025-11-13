#!/bin/bash

echo "========================================="
echo "Complete MCP Server Test"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: GitHub MCP
echo -e "${YELLOW}1. Testing GitHub MCP...${NC}"
if [ -f "/mnt/projects/mcp-servers/node_modules/@modelcontextprotocol/server-github/dist/index.js" ]; then
    echo -e "   ${GREEN}✓${NC} GitHub MCP server file exists"
    if node /mnt/projects/mcp-servers/node_modules/@modelcontextprotocol/server-github/dist/index.js --version 2>&1 | grep -q "GitHub MCP Server"; then
        echo -e "   ${GREEN}✓${NC} GitHub MCP can start"
        GITHUB_STATUS="PASS"
    else
        echo -e "   ${RED}✗${NC} GitHub MCP failed to start"
        GITHUB_STATUS="FAIL"
    fi
else
    echo -e "   ${RED}✗${NC} GitHub MCP server file not found"
    GITHUB_STATUS="FAIL"
fi
echo ""

# Test 2: Render MCP
echo -e "${YELLOW}2. Testing Render MCP...${NC}"
if npx -y @llmindset/mcp-hfspace --version 2>&1 | head -1 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} Render MCP package (@llmindset/mcp-hfspace) is accessible"
    echo -e "   ${GREEN}✓${NC} Render MCP ID: rnd_4MRat9M19I42UfSQqigEXTK60SRH"
    RENDER_STATUS="PASS"
else
    echo -e "   ${RED}✗${NC} Render MCP package not accessible"
    RENDER_STATUS="FAIL"
fi
echo ""

# Test 3: Vercel MCP
echo -e "${YELLOW}3. Testing Vercel MCP...${NC}"
if npx -y @llmindset/mcp-hfspace --version 2>&1 | head -1 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} Vercel MCP package (@llmindset/mcp-hfspace) is accessible"
    echo -e "   ${GREEN}✓${NC} Vercel MCP ID: 3B02w9PrZkZmAeqv2CmDMLKH"
    VERCEL_STATUS="PASS"
else
    echo -e "   ${RED}✗${NC} Vercel MCP package not accessible"
    VERCEL_STATUS="FAIL"
fi
echo ""

# Test 4: Hugging Face MCP
echo -e "${YELLOW}4. Testing Hugging Face MCP...${NC}"
if npx -y huggingface-mcp-server --version 2>&1 | head -1 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} Hugging Face MCP package (huggingface-mcp-server) is accessible"
    HF_STATUS="PASS"
else
    echo -e "   ${RED}✗${NC} Hugging Face MCP package not accessible"
    HF_STATUS="FAIL"
fi
echo ""

# Configuration Check
echo -e "${YELLOW}Configuration Check:${NC}"
if [ -f ~/.config/claude/mcp.json ]; then
    echo -e "   ${GREEN}✓${NC} MCP config file exists at ~/.config/claude/mcp.json"
    
    # Check if JSON is valid
    if python3 -m json.tool ~/.config/claude/mcp.json > /dev/null 2>&1; then
        echo -e "   ${GREEN}✓${NC} MCP config JSON is valid"
        
        # Check each MCP in config
        if grep -q '"github".*"disabled": false' ~/.config/claude/mcp.json; then
            echo -e "   ${GREEN}✓${NC} GitHub MCP is enabled in config"
        else
            echo -e "   ${RED}✗${NC} GitHub MCP is disabled in config"
        fi
        
        if grep -q '"render".*"disabled": false' ~/.config/claude/mcp.json; then
            echo -e "   ${GREEN}✓${NC} Render MCP is enabled in config"
        else
            echo -e "   ${RED}✗${NC} Render MCP is disabled in config"
        fi
        
        if grep -q '"vercel".*"disabled": false' ~/.config/claude/mcp.json; then
            echo -e "   ${GREEN}✓${NC} Vercel MCP is enabled in config"
        else
            echo -e "   ${RED}✗${NC} Vercel MCP is disabled in config"
        fi
        
        if grep -q '"huggingface".*"disabled": false' ~/.config/claude/mcp.json; then
            echo -e "   ${GREEN}✓${NC} Hugging Face MCP is enabled in config"
        else
            echo -e "   ${RED}✗${NC} Hugging Face MCP is disabled in config"
        fi
    else
        echo -e "   ${RED}✗${NC} MCP config JSON is invalid"
    fi
else
    echo -e "   ${RED}✗${NC} MCP config file not found"
fi
echo ""

# Summary
echo "========================================="
echo -e "${YELLOW}Test Summary:${NC}"
echo "========================================="
echo -e "GitHub MCP:      ${GITHUB_STATUS:-UNKNOWN}"
echo -e "Render MCP:      ${RENDER_STATUS:-UNKNOWN}"
echo -e "Vercel MCP:      ${VERCEL_STATUS:-UNKNOWN}"
echo -e "Hugging Face MCP: ${HF_STATUS:-UNKNOWN}"
echo "========================================="

