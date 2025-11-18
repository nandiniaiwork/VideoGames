# Deployment Guide

This guide will help you deploy the Video Game Sales Analysis Flask application to various platforms.

## Prerequisites

- Python 3.11+
- Git
- Account on your chosen deployment platform (Heroku, Railway, Render, etc.)

## Files Created for Deployment

1. **requirements.txt** - Lists all Python dependencies
2. **Procfile** - Tells the platform how to run your app (uses gunicorn)
3. **runtime.txt** - Specifies Python version
4. **.gitignore** - Excludes unnecessary files from version control

## Deployment Steps

### Option 1: Railway

1. Create an account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub repository
4. Railway will automatically detect the Flask app
5. Add environment variable:
   - `SECRET_KEY`: Generate a random secret key (e.g., use `python -c "import secrets; print(secrets.token_hex(32))"`)
6. Deploy!

### Option 2: Render

1. Create an account at [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. Add environment variable:
   - `SECRET_KEY`: Generate a random secret key
6. Deploy!

### Option 3: Heroku

1. Install Heroku CLI: [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set secret key: `heroku config:set SECRET_KEY=your-secret-key-here`
5. Deploy: `git push heroku main`

### Option 4: PythonAnywhere

1. Create account at [pythonanywhere.com](https://www.pythonanywhere.com)
2. Upload your files via Files tab
3. Create a new Web app
4. Configure WSGI file to point to your Flask app
5. Set environment variables in Web app settings
6. Reload the web app

## Environment Variables

Set these in your deployment platform:

- **SECRET_KEY**: A random secret key for Flask sessions (required)
  - Generate with: `python -c "import secrets; print(secrets.token_hex(32))"`

## Important Notes

1. **CSV File**: Make sure `vgsales.csv` is included in your repository
2. **Users File**: `users.json` will be created automatically (it's in .gitignore)
3. **Debug Mode**: Disabled by default in production (controlled by `FLASK_DEBUG` env var)
4. **Port**: Automatically uses `PORT` environment variable if set

## Troubleshooting

### App won't start
- Check that `vgsales.csv` exists in the root directory
- Verify all dependencies are in `requirements.txt`
- Check platform logs for error messages

### 500 Internal Server Error
- Ensure `SECRET_KEY` environment variable is set
- Check that the CSV file is accessible
- Review application logs

### Module not found errors
- Verify all packages are listed in `requirements.txt`
- Try rebuilding/redeploying

## Testing Locally

Before deploying, test locally:

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export SECRET_KEY=your-secret-key-here
export PORT=5000

# Run with gunicorn (production-like)
gunicorn app:app

# Or run with Flask (development)
python app.py
```

## Support

If you encounter issues:
1. Check the deployment platform's logs
2. Verify all files are committed to your repository
3. Ensure environment variables are set correctly
4. Check that the Python version matches `runtime.txt`

