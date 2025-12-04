# GitHub Pages Setup for Bookslaravel

## Repository Information

- **GitHub Username:** kianzhar
- **Repository Name:** bookslaravel
- **Live URL:** https://kianzhar.github.io/bookslaravel/

## Quick Setup Steps

1. **Navigate to frontend folder**
   ```bash
   cd frontend
   ```

2. **Initialize Git (if not already done)**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: E-commerce Book Store Frontend"
   ```

3. **Add GitHub remote**
   ```bash
   git remote add origin https://github.com/kianzhar/bookslaravel.git
   git branch -M main
   ```

4. **Push to GitHub**
   ```bash
   git push -u origin main
   ```

5. **Enable GitHub Pages**
   - Go to: https://github.com/kianzhar/bookslaravel/settings/pages
   - Under **Source**, select:
     - Branch: `main`
     - Folder: `/ (root)`
   - Click **Save**
   - Wait a few minutes for GitHub to build your site

6. **Access Your Site**
   - Your site will be live at: https://kianzhar.github.io/bookslaravel/
   - It may take a few minutes to become available after enabling Pages

## Backend Configuration

The Laravel backend CORS has been configured to allow requests from:
- ✅ `https://kianzhar.github.io` (already added to `config/cors.php`)

## Frontend Configuration

The `config.js` file is set to connect to:
- Backend: `http://localhost:8000` (for local development)

**Important:** If your backend is deployed to a different server, update `config.js`:
```javascript
const SERVER_IP = 'your-backend-domain.com';  // Change this
const SERVER_PORT = '8000';  // Or remove if using standard ports
```

## Troubleshooting

### CORS Errors
If you see CORS errors, make sure:
1. Backend `config/cors.php` includes `https://kianzhar.github.io`
2. Backend is running and accessible
3. Backend allows credentials: `'supports_credentials' => true`

### 404 Errors on GitHub Pages
- Make sure all HTML files are in the root of the repository
- Check that GitHub Pages is enabled and pointing to the correct branch
- Wait a few minutes after enabling Pages for the site to build

### API Connection Issues
- Verify your backend is running on `localhost:8000` (or update `config.js`)
- Check browser console for specific error messages
- Ensure backend CORS is properly configured

## Updating the Site

After making changes to the frontend:

```bash
cd frontend
git add .
git commit -m "Update frontend"
git push
```

GitHub Pages will automatically rebuild your site (usually within 1-2 minutes).

