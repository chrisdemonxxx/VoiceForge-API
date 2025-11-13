# Database Connection Fix

## Problem Identified

The codebase was using `@neondatabase/serverless` driver which is designed specifically for Neon's serverless PostgreSQL. However, the deployment uses **Render PostgreSQL**, which is a standard PostgreSQL instance.

### Issue
- Neon serverless driver uses WebSockets and tries to connect via HTTPS (port 443)
- Render PostgreSQL requires standard PostgreSQL connection (port 5432)
- Connection timeout: `connect ETIMEDOUT 35.227.164.209:443`

## Solution

Switched from Neon serverless driver to `postgres-js` which supports standard PostgreSQL connections.

### Changes Made

1. **`db/index.ts`**:
   - Changed from `drizzle-orm/neon-serverless` to `drizzle-orm/postgres-js`
   - Replaced `@neondatabase/serverless` Pool with `postgres` from `postgres-js`
   - Added SSL configuration (`ssl: 'require'`) for Render PostgreSQL
   - Updated connection pool initialization

2. **`server/routes/health.ts`**:
   - Updated database connection check from `pool.query('SELECT 1')` to `pool\`SELECT 1\``
   - postgres-js uses template tag syntax instead of query method

3. **`package.json`**:
   - Added `postgres: "^3.4.5"` dependency

## Testing

After deployment, test the connection:

```bash
curl https://voiceforge-api.onrender.com/api/health | jq '.database'
```

Expected result:
```json
{
  "status": "connected",
  "type": "PostgreSQL"
}
```

## Next Steps

1. Commit and push changes
2. Wait for Render auto-deployment
3. Test database connection
4. Verify all database operations work correctly

