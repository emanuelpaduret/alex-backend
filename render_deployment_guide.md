# Deployment Guide for Render.com

This guide covers deploying your submission management API to Render.com.

## 🚀 Quick Setup

### 1. Prepare Your Repository

Make sure your repository has these files:
- `package.json` with start script
- `app.js` (your main application)
- `render.yaml` (optional but recommended)

### 2. Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended for auto-deploys)
3. Connect your GitHub repository

### 3. Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repo
3. Configure the service:
   - **Name**: `submission-api` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Start with "Starter" (free), upgrade as needed

### 4. Set Environment Variables

In your Render dashboard, go to "Environment" and add:

```bash
# Required
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Optional (Render sets these automatically)
NODE_ENV=production
PORT=10000
RENDER_EXTERNAL_URL=https://your-service.onrender.com
```

## 📋 Environment Variables Guide

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/submissions` |

### Automatic Variables (Set by Render)

| Variable | Description | Auto-Set Value |
|----------|-------------|----------------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `10000` |
| `RENDER_EXTERNAL_URL` | Your app URL | `https://your-app.onrender.com` |

## 🔧 Package.json Requirements

Make sure your `package.json` has the correct start script:

```json
{
  "name": "submission-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^7.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  }
}
```

## 🌐 Database Setup (MongoDB Atlas)

### 1. Create MongoDB Atlas Account

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create free account
3. Create a new cluster

### 2. Configure Network Access

1. Go to "Network Access" in Atlas
2. Add IP Address: `0.0.0.0/0` (allow all - Render uses dynamic IPs)
3. Or add Render's IP ranges if available

### 3. Create Database User

1. Go to "Database Access"
2. Create user with read/write permissions
3. Note username and password

### 4. Get Connection String

1. Go to "Clusters" → "Connect"
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your actual password

## 📊 Monitoring & Logs

### View Logs
- Go to your Render dashboard
- Click on your service
- Click "Logs" tab
- Real-time logs show all console.log outputs

### Health Checks
- Render automatically monitors `/health` endpoint
- If health check fails, Render restarts your service
- Check service health in the dashboard

### Performance Monitoring
- View CPU and memory usage in dashboard
- Monitor response times and error rates
- Set up alerts for downtime

## 🔄 Auto-Deployment

### Setup Auto-Deploy
1. Connect GitHub repository to Render
2. Choose branch (usually `main`)
3. Enable "Auto-Deploy"
4. Every push to main triggers automatic deployment

### Deployment Process
1. Push code to GitHub
2. Render detects changes
3. Runs build command (`npm install`)
4. Runs start command (`npm start`)
5. Performs health check
6. Routes traffic to new version

## 🌍 Custom Domain (Optional)

### Add Custom Domain
1. In Render dashboard, go to "Settings"
2. Add your domain under "Custom Domains"
3. Update your DNS records as instructed
4. Render provides free SSL certificates

### Update CORS Settings
If using custom domain, update CORS in your code:
```javascript
const allowedOrigins = [
  'https://yourdomain.com',
  'https://your-app.onrender.com'  // Keep Render URL too
];
```

## 🔧 Troubleshooting

### Common Issues

#### Build Fails
- Check package.json for correct dependencies
- Ensure Node.js version compatibility
- Check build logs for specific errors

#### Health Check Fails
- Verify `/health` endpoint works locally
- Check if app is binding to `0.0.0.0:$PORT`
- Review startup logs for errors

#### Database Connection Fails
- Verify MONGO_URI is correct
- Check MongoDB Atlas network access
- Ensure credentials are correct

#### CORS Issues
- Add your frontend domain to allowed origins
- Include Render URL in CORS settings
- Check browser network tab for specific errors

### Debug Steps
1. Check Render logs for errors
2. Test endpoints with Postman/curl
3. Verify environment variables are set
4. Test database connection separately

## 💰 Pricing Guide
