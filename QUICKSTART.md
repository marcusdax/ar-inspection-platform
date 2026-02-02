# Quick Start Guide - AR Inspection Platform

## 🚀 Start the Application NOW

### Step 1: Open IntelliJ IDEA
1. Launch IntelliJ IDEA
2. Click **File > Open**
3. Navigate to: `C:\Windows\System32\ar-inspection-platform`
4. Click **OK**

### Step 2: Run the Application
1. Look for the run configurations dropdown in the top-right toolbar
2. Select **"Full Stack"** from the dropdown
3. Click the green **Play** button ▶️
4. Wait for both services to start (30-60 seconds)

### Step 3: Access the Application
- **Backend API**: http://localhost:3000/health
- **Web Client**: http://localhost:3000

## ✅ What's Already Running
- ✅ PostgreSQL database (port 5432)
- ✅ Redis cache (port 6379)

## 🎯 Alternative: Command Line

```bash
# Open two terminals

# Terminal 1 - Backend
cd C:\Windows\System32\ar-inspection-platform\backend
npm run dev

# Terminal 2 - Web Client
cd C:\Windows\System32\ar-inspection-platform\web-client
npm start
```

## 🎯 Alternative: Batch Scripts

```bash
# Terminal 1
start-backend.bat

# Terminal 2
start-web.bat
```

## 📝 IntelliJ Configuration (First Time Only)

If run configurations don't appear:
1. Go to **Run > Edit Configurations...**
2. Click **+** > **npm**
3. For Backend:
   - Name: `Backend Dev`
   - package.json: `backend/package.json`
   - Command: `run`
   - Scripts: `dev`
4. For Web Client:
   - Name: `Web Client Dev`
   - package.json: `web-client/package.json`
   - Command: `run`
   - Scripts: `start`

## 🔍 Verify Everything Works

1. **Check Backend Health**
   - Open browser: http://localhost:3000/health
   - Should see JSON response with status "ok"

2. **Check Web Client**
   - Open browser: http://localhost:3000
   - Should see the React application

3. **Check Docker Services**
   ```bash
   docker-compose ps
   ```
   Both PostgreSQL and Redis should show "Up"

## 🛑 Stop the Application

### In IntelliJ:
- Click the red **Stop** button ⏹️

### In Command Line:
- Press `Ctrl+C` in each terminal

### Stop Docker Services:
```bash
docker-compose down
```

## 📚 More Information
- Full setup details: `SETUP_COMPLETE.md`
- IntelliJ configuration: `INTELLIJ_SETUP.md`
- Project overview: `README.md`

---
**That's it! You're ready to develop! 🎉**
