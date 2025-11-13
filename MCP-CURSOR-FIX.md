# MCP Configuration Fix for Cursor

## Issue Found
The MCPs were configured in the wrong file. Cursor uses `~/.cursor/mcp.json`, not `~/.config/claude/mcp.json`.

## Status

### ✅ Fixed
1. **GitHub MCP** - Added to Cursor config with API token
2. **Hugging Face MCP** - Added to Cursor config with API token

### ⚠️ Issue with Render/Vercel MCPs
The Render and Vercel MCPs are using the `@llmindset/mcp-hfspace` package, which expects Hugging Face Space IDs in the format `vendor/space` (e.g., `username/model-name`).

However, the provided IDs:
- Render: `rnd_4MRat9M19I42UfSQqigEXTK60SRH`
- Vercel: `3B02w9PrZkZmAeqv2CmDMLKH`

These appear to be service IDs, not Hugging Face Space IDs in the correct format.

**Error Message:**
```
Error loading rnd_4MRat9M19I42UfSQqigEXTK60SRH: Invalid space path format [rnd_4MRat9M19I42UfSQqigEXTK60SRH]. 
Use: vendor/space or vendor/space/endpoint
```

## Next Steps

### Option 1: Convert IDs to Hugging Face Space Format
If these are Hugging Face Spaces, they need to be in the format:
- `username/space-name` or
- `username/space-name/endpoint`

You would need to:
1. Find the actual Hugging Face Space URLs for Render and Vercel
2. Convert them to the `vendor/space` format
3. Update the MCP configuration

### Option 2: Use Official Render/Vercel MCP Packages
If these are Render/Vercel service IDs (not Hugging Face Spaces), we need to:
1. Find official Render and Vercel MCP packages
2. Use their proper configuration format
3. Configure them with the correct API keys

### Option 3: Verify the IDs
Please verify:
- Are `rnd_4MRat9M19I42UfSQqigEXTK60SRH` and `3B02w9PrZkZmAeqv2CmDMLKH` Hugging Face Space IDs?
- If yes, what are their `vendor/space` formats?
- If no, what service/platform do they belong to?

## Current Configuration

The Cursor MCP config file is at: `~/.cursor/mcp.json`

All 4 MCPs are configured, but Render and Vercel may not work until the ID format issue is resolved.

## Testing

Run the test script:
```bash
./test-cursor-mcps.sh
```

This will verify:
- Config file exists and is valid
- All MCPs are in the config
- Packages are accessible

## Restart Cursor

After fixing the configuration, **restart Cursor completely** to load the new MCP configurations.

