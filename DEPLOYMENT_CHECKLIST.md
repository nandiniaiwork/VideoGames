# Deployment Checklist

## Pre-Deployment Checklist

### ✅ Files Required
- [x] `app.py` - Main Flask application
- [x] `requirements.txt` - Python dependencies
- [x] `Procfile` - Process file for deployment
- [x] `runtime.txt` - Python version specification
- [x] `vgsales.csv` - Dataset file (MUST be in repository)
- [x] `.gitignore` - Git ignore file

### ✅ Code Fixes Applied
- [x] Environment variable for SECRET_KEY
- [x] Error handling for CSV loading
- [x] Error handling for API routes
- [x] Port configuration from environment
- [x] Debug mode disabled by default
- [x] Host binding to 0.0.0.0

## Deployment Steps

### 1. Verify Files Are Committed
```bash
git status
git add .
git commit -m "Prepare for deployment"
```

### 2. Set Environment Variables
**CRITICAL**: Set `SECRET_KEY` in your deployment platform:
- Generate key: `python -c "import secrets; print(secrets.token_hex(32))"`
- Set in platform's environment variables section

### 3. Verify CSV File
- Ensure `vgsales.csv` is in the root directory
- Check file size (should be ~1.3MB)
- Verify it's committed to Git

### 4. Deploy

#### Railway
1. Connect GitHub repo
2. Add environment variable: `SECRET_KEY`
3. Deploy

#### Render
1. New Web Service
2. Connect repo
3. Build: `pip install -r requirements.txt`
4. Start: `gunicorn app:app`
5. Add env var: `SECRET_KEY`
6. Deploy

#### Heroku
```bash
heroku create your-app-name
heroku config:set SECRET_KEY=your-secret-key
git push heroku main
```

## Common Deployment Errors & Solutions

### Error: "ModuleNotFoundError: No module named 'gunicorn'"
**Solution**: Ensure `gunicorn==21.2.0` is in `requirements.txt` ✅

### Error: "FileNotFoundError: vgsales.csv"
**Solution**: 
- Verify CSV is committed: `git ls-files | grep vgsales.csv`
- If missing: `git add vgsales.csv && git commit -m "Add CSV file"`

### Error: "Application failed to respond"
**Solution**: 
- Check Procfile: `web: gunicorn app:app` ✅
- Verify app variable name matches: `app = Flask(__name__)` ✅

### Error: "SECRET_KEY not set"
**Solution**: Set environment variable in deployment platform

### Error: "Port already in use"
**Solution**: App now uses `PORT` env var automatically ✅

## Testing Locally Before Deployment

```bash
# Install dependencies
pip install -r requirements.txt

# Test with gunicorn (production-like)
gunicorn app:app

# Or test with Flask
export SECRET_KEY=test-key-123
python app.py
```

## Post-Deployment Verification

1. ✅ App starts without errors
2. ✅ Can access `/auth` page
3. ✅ Can create account
4. ✅ Can log in
5. ✅ Dashboard loads data
6. ✅ API endpoints return data

## Need Help?

Check deployment platform logs for specific error messages.

