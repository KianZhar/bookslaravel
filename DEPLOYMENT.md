# Frontend Deployment Guide

## Quick Start for GitHub Pages

1. **Initialize Git Repository** (if not already done)
   ```bash
   cd frontend
   git init
   git add .
   git commit -m "Initial commit: E-commerce Book Store Frontend"
   ```

2. **Create GitHub Repository**
   - Go to GitHub and create a new repository
   - Name it something like `bookstore-frontend`

3. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/bookstore-frontend.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click on **Settings**
   - Scroll down to **Pages** section
   - Under **Source**, select **main** branch and **/ (root)** folder
   - Click **Save**
   - Your site will be available at: `https://yourusername.github.io/bookstore-frontend`

5. **Update Backend CORS**
   - Edit `config/cors.php` in your Laravel backend
   - Add your GitHub Pages URL to allowed origins:
   ```php
   'allowed_origins' => [
       'http://localhost:3000',
       'https://yourusername.github.io',
   ],
   ```

6. **Update Frontend Config** (if needed)
   - If your backend is not on localhost, update `config.js` with your backend URL
   - For production, you might want to use environment variables or a config service

## Alternative: Deploy to Netlify/Vercel

### Netlify
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run: `netlify deploy` (for draft) or `netlify deploy --prod` (for production)
3. Or connect your GitHub repo to Netlify for automatic deployments

### Vercel
1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel` (for preview) or `vercel --prod` (for production)
3. Or connect your GitHub repo to Vercel for automatic deployments

## Local Development

For local development, use any static file server:

```bash
# Python
python -m http.server 3000

# Node.js
npx http-server -p 3000

# PHP
php -S localhost:3000
```

Then open `http://localhost:3000` in your browser.

## Important Notes

- Make sure your backend is running and accessible
- Update `config.js` if your backend is on a different host/port
- Ensure CORS is properly configured on the backend
- All API calls require authentication (except registration/login)



