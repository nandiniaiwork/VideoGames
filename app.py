from flask import Flask, render_template, jsonify, request, redirect, url_for, flash, session
import pandas as pd
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'  # Change this in production!

# Load dataset
DATA_PATH = "vgsales.csv"
df = pd.read_csv(DATA_PATH)

# Simple file-based user storage (in production, use a proper database)
USERS_FILE = "users.json"

def load_users():
    """Load users from JSON file"""
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_users(users):
    """Save users to JSON file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def is_logged_in():
    """Check if user is logged in"""
    return 'user_id' in session

def require_login(f):
    """Decorator to require login for routes"""
    def decorated_function(*args, **kwargs):
        if not is_logged_in():
            flash('Please log in to access this page', 'error')
            return redirect(url_for('auth'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@app.route('/')
@require_login
def home():
    """Main dashboard - requires login"""
    user_email = session.get('user_email', 'User')
    user_name = session.get('user_name', 'User')
    return render_template('index.html', user_email=user_email, user_name=user_name)

@app.route('/auth')
@app.route('/login', methods=['GET'])
def auth():
    """Render the authentication page"""
    # If already logged in, redirect to home
    if is_logged_in():
        return redirect(url_for('home'))
    return render_template('auth.html')

@app.route('/login', methods=['POST'])
def login():
    """Handle login form submission"""
    email = request.form.get('email')
    password = request.form.get('password')
    
    if not email or not password:
        flash('Please fill in all fields', 'error')
        return redirect(url_for('auth'))
    
    users = load_users()
    
    # Check if user exists and password is correct
    if email in users:
        if check_password_hash(users[email]['password'], password):
            # Create session
            session['user_id'] = email
            session['user_email'] = email
            session['user_name'] = users[email]['name']
            flash(f'Welcome back, {users[email]["name"]}!', 'success')
            return redirect(url_for('home'))
        else:
            flash('Invalid email or password', 'error')
            return redirect(url_for('auth'))
    else:
        flash('Invalid email or password', 'error')
        return redirect(url_for('auth'))

@app.route('/signup', methods=['POST'])
def signup():
    """Handle signup form submission"""
    name = request.form.get('name')
    email = request.form.get('email')
    password = request.form.get('password')
    confirm_password = request.form.get('confirm_password')
    
    if not all([name, email, password, confirm_password]):
        flash('Please fill in all fields', 'error')
        return redirect(url_for('auth'))
    
    if password != confirm_password:
        flash('Passwords do not match', 'error')
        return redirect(url_for('auth'))
    
    if len(password) < 8:
        flash('Password must be at least 8 characters', 'error')
        return redirect(url_for('auth'))
    
    users = load_users()
    
    # Check if user already exists
    if email in users:
        flash('An account with this email already exists', 'error')
        return redirect(url_for('auth'))
    
    # Create new user
    users[email] = {
        'name': name,
        'email': email,
        'password': generate_password_hash(password)
    }
    save_users(users)
    
    # Create session
    session['user_id'] = email
    session['user_email'] = email
    session['user_name'] = name
    
    flash(f'Account created successfully! Welcome, {name}!', 'success')
    return redirect(url_for('home'))

@app.route('/logout')
def logout():
    """Handle logout"""
    if is_logged_in():
        user_name = session.get('user_name', 'User')
        session.clear()
        flash(f'You have been logged out. Goodbye, {user_name}!', 'success')
    return redirect(url_for('auth'))

@app.route('/api/summary')
def summary():
    summary = {
        "total_games": len(df),
        "total_global_sales": df["Global_Sales"].sum(),
        "top_genres": df["Genre"].value_counts().head(5).to_dict(),
        "top_platforms": df["Platform"].value_counts().head(5).to_dict()
    }
    return jsonify(summary)

@app.route('/api/overview')
def overview():
    """API endpoint for dashboard overview statistics"""
    total_sales = df["Global_Sales"].sum()
    # Handle NaN values
    if pd.isna(total_sales):
        total_sales = 0.0
    return jsonify({
        "rows": len(df),
        "columns": len(df.columns),
        "total_global_sales": float(total_sales)
    })

@app.route('/api/top-games')
def top_games():
    """API endpoint for top games data"""
    # Convert DataFrame to list of dictionaries
    games = df.to_dict('records')
    # Replace NaN values with None (which becomes null in JSON)
    for game in games:
        for key, value in game.items():
            if pd.isna(value):
                game[key] = None
    return jsonify(games)

if __name__ == '__main__':
    app.run(debug=True)
