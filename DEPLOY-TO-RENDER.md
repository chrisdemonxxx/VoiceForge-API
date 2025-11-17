# Deploy to Render

## Prerequisites
- GitHub repository (public or private)
- Render account with API access

## Steps

### 1. Push to GitHub
```bash
# If not already on GitHub, create a repo and push:
git remote add origin https://github.com/YOUR_USERNAME/voiceforge.git
git push -u origin main
```

### 2. Deploy via Render Dashboard
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: voiceforge-api
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter (or higher)

### 3. Set Environment Variables
In Render dashboard, add these environment variables:
- `NODE_ENV=production`
- `PORT=5000` (Render sets this automatically)
- `TRUEVOICE_API_KEY=your_key`
- `TWILIO_ACCOUNT_SID=your_sid`
- `TWILIO_AUTH_TOKEN=your_token`
- `DATABASE_URL=your_database_url` (if using database)
- `BASE_URL` will be auto-set to your Render URL

### 4. Deploy
Click "Create Web Service" and Render will:
- Clone your repo
- Run `npm install`
- Start your service with `npm start`
- Provide a public URL (e.g., `https://voiceforge-api.onrender.com`)

### 5. Update Twilio Webhooks
Once deployed, update Twilio webhooks:
```bash
export BASE_URL=https://your-app.onrender.com
npx tsx update-single-number-webhook.ts +18776118846
```

## Using Render API (Alternative)
If you prefer API deployment, use the MCP Render tools.
