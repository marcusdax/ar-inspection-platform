# GitHub Push Commands for AR Inspection Platform

## Step 1: Add GitHub Remote
Replace `YOUR_USERNAME` with your GitHub username below:

```bash
# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/ar-inspection-platform.git

# OR for SSH (recommended)
# git remote add origin git@github.com:YOUR_USERNAME/ar-inspection-platform.git
```

## Step 2: Push to GitHub

```bash
# Push to GitHub (first time)
git push -u origin main

# If you get an error about existing commits, force push:
# git push -f origin main
```

## Step 3: Verify Push

```bash
# Check remote configuration
git remote -v

# Check status
git status

# Check if pushed
git log --oneline -3
```

## Alternative: Use GitHub CLI (if installed)

```bash
# Authenticate with GitHub
gh auth login

# Create repository and push in one command
gh repo create ar-inspection-platform --public --source=. --remote=origin --push
```

## After Push
- Visit your repository: https://github.com/YOUR_USERNAME/ar-inspection-platform
- Verify all files are present
- Check if README displays correctly
- Enable GitHub Actions for CI/CD if needed

## Common Issues & Solutions

### Error: "remote origin already exists"
```bash
# Remove existing remote
git remote remove origin
# Add new remote
git remote add origin https://github.com/YOUR_USERNAME/ar-inspection-platform.git
```

### Error: "Updates were rejected"
```bash
# Force push (use carefully)
git push -f origin main
```

### Error: "Authentication failed"
```bash
# Configure Git credentials
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Or use GitHub CLI for authentication
gh auth login
```

## Repository URL After Push
Your repository will be available at:
https://github.com/YOUR_USERNAME/ar-inspection-platform