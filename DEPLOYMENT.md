# 🚀 Deployment Guide

Complete guide for deploying RetailAI to production.

## 📋 Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] API keys secured
- [ ] CORS settings updated
- [ ] Build process tested

## 🌐 Frontend Deployment

### Option 1: Vercel (Recommended)

```bash
cd client

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

**Configuration:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### Option 2: Netlify

```bash
cd client

# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Production
netlify deploy --prod
```

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Option 3: AWS S3 + CloudFront

```bash
# Build
cd client
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### Environment Variables

Create `.env.production`:
```env
VITE_API_URL=https://api.yourapp.com
```

Update `client/src/api.js`:
```javascript
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
```

## 🐍 Backend Deployment

### Option 1: Railway

1. Create account at railway.app
2. New Project → Deploy from GitHub
3. Add environment variables
4. Deploy

**railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn src.api:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Option 2: Render

1. Create account at render.com
2. New Web Service
3. Connect repository
4. Configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn src.api:app --host 0.0.0.0 --port $PORT`

### Option 3: AWS EC2

```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-ip

# Install dependencies
sudo apt update
sudo apt install python3-pip nginx

# Clone repository
git clone your-repo
cd inventory_model

# Install Python packages
pip3 install -r requirements.txt

# Install PM2 for process management
sudo npm install -g pm2

# Start with PM2
pm2 start "uvicorn src.api:app --host 0.0.0.0 --port 8000" --name retailai-api
pm2 save
pm2 startup
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name api.yourapp.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 4: Docker

**Dockerfile:**
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build and Run:**
```bash
# Build
docker build -t retailai-api .

# Run
docker run -p 8000:8000 retailai-api

# Push to registry
docker tag retailai-api your-registry/retailai-api
docker push your-registry/retailai-api
```

### Environment Variables

Create `.env`:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com
MODEL_PATH=/app/models/demand_model.pkl
```

Update `inventory_model/src/api.py`:
```python
import os
from dotenv import load_dotenv

load_dotenv()

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 🗄️ Database Deployment

### PostgreSQL on Railway

1. Add PostgreSQL service
2. Copy DATABASE_URL
3. Update `.env`

### Prisma Migrations

```bash
cd server

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed
```

## 🔒 Security Checklist

### API Security
- [ ] Enable HTTPS only
- [ ] Set up API rate limiting
- [ ] Add authentication middleware
- [ ] Validate all inputs
- [ ] Use environment variables for secrets
- [ ] Enable CORS only for trusted domains

### Frontend Security
- [ ] Remove console.logs
- [ ] Minify and obfuscate code
- [ ] Use HTTPS
- [ ] Set security headers
- [ ] Implement CSP (Content Security Policy)

## 📊 Monitoring

### Backend Monitoring

**Sentry Integration:**
```python
import sentry_sdk

sentry_sdk.init(
    dsn="your-sentry-dsn",
    traces_sample_rate=1.0,
)
```

**Health Check Endpoint:**
```python
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}
```

### Frontend Monitoring

**Sentry Integration:**
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

## 🚀 CI/CD Pipeline

### GitHub Actions

**.github/workflows/deploy.yml:**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: cd client && npm install
      - run: cd client && npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - run: cd inventory_model && pip install -r requirements.txt
      - run: cd inventory_model && pytest
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## 📈 Performance Optimization

### Frontend
- Enable gzip compression
- Use CDN for static assets
- Implement code splitting
- Lazy load components
- Optimize images

### Backend
- Enable response caching
- Use connection pooling
- Optimize database queries
- Implement Redis caching
- Use async endpoints

## 🔄 Rollback Strategy

### Frontend
```bash
# Vercel
vercel rollback

# Netlify
netlify rollback
```

### Backend
```bash
# Railway - use dashboard
# Render - use dashboard

# Docker
docker pull your-registry/retailai-api:previous-tag
docker stop current-container
docker run -p 8000:8000 your-registry/retailai-api:previous-tag
```

## 📝 Post-Deployment

- [ ] Test all endpoints
- [ ] Verify CORS settings
- [ ] Check error logging
- [ ] Monitor performance
- [ ] Set up alerts
- [ ] Update documentation
- [ ] Notify team

## 🆘 Troubleshooting

### Common Issues

**CORS Errors:**
- Update CORS_ORIGINS in backend
- Check frontend API URL

**Build Failures:**
- Clear node_modules and reinstall
- Check Node/Python versions
- Verify environment variables

**Database Connection:**
- Check DATABASE_URL format
- Verify network access
- Test connection manually

## 📞 Support

For deployment issues:
1. Check logs in deployment platform
2. Review error messages
3. Test locally first
4. Contact support if needed

---

**Ready to Deploy?** Follow this guide step by step for a smooth deployment! 🚀
