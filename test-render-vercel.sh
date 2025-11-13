#!/bin/bash

echo "========================================="
echo "Testing Render and Vercel MCPs"
echo "========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CONFIG_FILE="$HOME/.cursor/mcp.json"

echo -e "${YELLOW}1. Checking Vercel MCP Configuration...${NC}"
if grep -q '"vercel"' "$CONFIG_FILE"; then
    if grep -q '"url".*"https://mcp.vercel.com"' "$CONFIG_FILE"; then
        echo -e "   ${GREEN}✓${NC} Vercel MCP configured with official URL"
        echo -e "   ${GREEN}✓${NC} Vercel uses OAuth authentication (will prompt in Cursor)"
        
        # Test if the URL is reachable
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://mcp.vercel.com" 2>&1)
        if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "403" ]; then
            echo -e "   ${GREEN}✓${NC} Vercel MCP server is reachable (HTTP $HTTP_CODE - auth required)"
            VERCEL_STATUS="PASS"
        else
            echo -e "   ${YELLOW}⚠${NC} Vercel MCP server returned HTTP $HTTP_CODE"
            VERCEL_STATUS="WARN"
        fi
    else
        echo -e "   ${RED}✗${NC} Vercel MCP not using official URL format"
        VERCEL_STATUS="FAIL"
    fi
else
    echo -e "   ${RED}✗${NC} Vercel MCP not found in config"
    VERCEL_STATUS="FAIL"
fi
echo ""

echo -e "${YELLOW}2. Checking Render MCP Configuration...${NC}"
if grep -q '"render"' "$CONFIG_FILE"; then
    echo -e "   ${YELLOW}⚠${NC} Render MCP is configured"
    
    # Check if it's using the HF Space format
    if grep -q '@llmindset/mcp-hfspace' "$CONFIG_FILE"; then
        echo -e "   ${YELLOW}⚠${NC} Render MCP is using @llmindset/mcp-hfspace package"
        echo -e "   ${YELLOW}⚠${NC} This requires Hugging Face Space ID in 'vendor/space' format"
        
        # Check the ID format
        RENDER_ID=$(grep -A 5 '"render"' "$CONFIG_FILE" | grep -E '"[^"]+"' | tail -1 | sed 's/.*"\(.*\)".*/\1/')
        if [[ "$RENDER_ID" =~ ^[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+ ]]; then
            echo -e "   ${GREEN}✓${NC} Render ID appears to be in correct format: $RENDER_ID"
            RENDER_STATUS="PASS"
        else
            echo -e "   ${RED}✗${NC} Render ID '$RENDER_ID' is NOT in 'vendor/space' format"
            echo -e "   ${YELLOW}⚠${NC} Expected format: username/space-name"
            echo -e "   ${YELLOW}⚠${NC} Current ID: $RENDER_ID"
            RENDER_STATUS="FAIL"
        fi
    else
        echo -e "   ${YELLOW}⚠${NC} Render MCP configuration format unknown"
        RENDER_STATUS="WARN"
    fi
else
    echo -e "   ${RED}✗${NC} Render MCP not found in config"
    RENDER_STATUS="FAIL"
fi
echo ""

echo "========================================="
echo -e "${YELLOW}Test Summary:${NC}"
echo "========================================="
echo -e "Vercel MCP:  ${VERCEL_STATUS:-UNKNOWN}"
echo -e "Render MCP:  ${RENDER_STATUS:-UNKNOWN}"
echo "========================================="
echo ""
echo -e "${YELLOW}Notes:${NC}"
echo "- Vercel MCP: Uses official server at https://mcp.vercel.com"
echo "  * Will require OAuth authentication in Cursor"
echo "  * Should work after restarting Cursor and authorizing"
echo ""
echo "- Render MCP: Currently using @llmindset/mcp-hfspace"
echo "  * Requires Hugging Face Space ID in 'vendor/space' format"
echo "  * The ID 'rnd_4MRat9M19I42UfSQqigEXTK60SRH' is NOT in this format"
echo "  * Need to find the actual Hugging Face Space URL or use different approach"
echo ""
