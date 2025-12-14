# Champions 11 CC — Free Hosted Team DB

This is a **static website** (no backend). It reads `data.json` and renders:
- Overview
- Players (career summary)
- Matches + scorecards
- Leaderboards

## Free hosting options
### Option 1: GitHub Pages (recommended)
1. Create a GitHub repo (example: `champions11-db`).
2. Upload these files:
   - index.html
   - styles.css
   - app.js
   - data.json
3. In GitHub: Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / root
4. Your site will be live at:
   `https://<your-username>.github.io/<repo-name>/`

### Option 2: Netlify / Cloudflare Pages
- Drag & drop this folder or connect the repo.

## Updating data
Whenever you update the Excel:
1. Regenerate `data.json`
2. Replace the old `data.json` in the repo
3. GitHub Pages auto-updates

## Notes
If you open `index.html` by double-clicking, `fetch('data.json')` may fail due to browser security.
Use GitHub Pages or run a local server:
- Python: `python -m http.server 8000`
- Then open: http://localhost:8000/
