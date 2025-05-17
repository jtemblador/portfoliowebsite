# Website Development & Deployment Guide
# josetemblador.com

## Local Development Workflow

1. Start the development server:
   ```
   npm run dev
   ```
   This launches your site at http://localhost:5174

2. Make your changes to the source files
   - Edit files in src/ directory
   - Changes will automatically refresh in the browser

3. Test your changes thoroughly:
   - Check on different screen sizes (responsive design)
   - Test all interactive elements
   - Verify that all pages and components work correctly

4. Test a production build locally (recommended before deployment):
   ```
   npm run build
   npm run preview
   ```
   This builds and serves your site at http://localhost:4173

## Deployment Workflow

1. Commit your changes to your local repository:
   ```
   git add .
   git commit -m "Description of changes"
   ```

2. Push to GitHub (main branch):
   ```
   git push origin main
   ```

3. Deploy to GitHub Pages:
   ```
   npm run deploy
   ```
   This builds your site and pushes to the gh-pages branch

4. Wait a few minutes, then check your live site at josetemblador.com

## Additional Commands & Information

- Check build output (see what's generated):
  ```
  npm run build
  ls -la dist/
  ```

- If you make changes to vite.config.js:
  - Restart the development server
  - Always test a production build

- If you add new dependencies:
  ```
  npm install package-name
  ```

- If you change DNS settings:
  - Allow 24-48 hours for propagation
  - Check with dnschecker.org

## Troubleshooting

- If your site is down or blank:
  1. Check GitHub repository settings (Settings > Pages)
  2. Verify that gh-pages branch exists and has the correct files
  3. Run `npm run deploy` again
  4. Check browser console for JavaScript errors

- If styles/scripts aren't loading:
  1. Inspect your dist/index.html file
  2. Check browser dev tools (Network tab) for 404 errors
  3. Make sure base path in vite.config.js is set to '/'

- If GitHub shows DNS errors:
  1. Verify DNS settings at GoDaddy
  2. Make sure A records point to GitHub IPs:
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153
  3. Ensure www CNAME points to jtemblador.github.io

## Reminder: Important Files

- package.json: Contains deploy scripts
- vite.config.js: Build configuration
- public/CNAME: Custom domain for GitHub Pages
- .github/workflows/deploy.yml: GitHub Actions deployment (if used)

# Add this file to .gitignore so it stays local
