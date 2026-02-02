# AR Inspection Platform - IntelliJ Configuration

## Project Setup in IntelliJ IDEA

### 1. Open Project
1. Open IntelliJ IDEA
2. Select "Open" from the welcome screen
3. Navigate to your project directory (e.g., `C:\Windows\System32\ar-inspection-platform`)
4. Click "OK" to open as a project
5. IntelliJ will automatically detect the workspace structure and load all modules

### 2. Configure Node.js
1. Go to `File` > `Settings` > `Languages & Frameworks` > `Node.js and NPM`
2. Enable "Coding assistance for Node.js"
3. Set "Node.js version" to 18.x
4. Click "Apply" and "OK"

### 3. Configure TypeScript
1. Go to `File` > `Settings` > `Languages & Frameworks` > `TypeScript`
2. Enable "TypeScript Compiler Service"
3. Set "Service version" to match project tsconfig.json
4. Click "Apply" and "OK"

### 4. Configure React
1. Go to `File` > `Settings` > `Languages & Frameworks` > `JavaScript` > `React`
2. Enable "React" support
3. Set "JSX" support to enabled
4. Click "Apply" and "OK"

### 5. Configure ESLint
1. Go to `File` > `Settings` > `Editor` > `Inspections` > `ESLint`
2. Enable "ESLint"
3. Set "ESLint package" to use project's .eslintrc.json
4. Add custom rules if needed
5. Click "Apply" and "OK"

### 6. Run Configuration
The project includes pre-configured run configurations in `.idea/runConfigurations/`:
- **Backend Dev** - Runs the backend server on port 3000
- **Web Client Dev** - Runs the web client on port 3000 (proxied to backend)
- **Full Stack** - Runs both backend and web client simultaneously

These configurations should appear automatically in IntelliJ. If not:
1. Go to `Run` > `Edit Configurations...`
2. The configurations should be listed under "npm"
3. Select "Full Stack" to run the entire application

**Note**: Make sure Docker services (PostgreSQL and Redis) are running first:
```bash
docker-compose up -d
```

### 7. Build Tasks
1. Go to `File` > `Settings` > `Tools` > `External Tools`
2. Add "npm" as tool
3. Set:
   - **Name**: "npm build"
   - **Program**: `npm`
   - **Arguments**: `run build`
   - **Working directory**: `$ProjectFileDir$`

### 8. Test Configuration
1. Go to `File` > `Settings` > `Tools` > `External Tools`
2. Add "npm" as tool
3. Set:
   - **Name**: "npm test"
   - **Program**: `npm`
   - **Arguments**: `test`
   - **Working directory**: `$ProjectFileDir$`

### 9. Debug Configuration
For debugging React Native mobile app:
1. Install React Native Tools plugin
2. Configure port forwarding for Metro bundler
3. Set up React Native debug configuration

### 10. Recommended Plugins
Install these plugins via `File` > `Settings` > `Plugins`:
- **Node.js**
- **React**
- **TypeScript**
- **ESLint**
- **Prettier**
- **Docker**
- **Git**

### 11. Database Integration
1. Install PostgreSQL plugin
2. Configure database connection in IntelliJ
3. Enable SQL console for database queries

### 12. Code Style
Import the code style settings:
```json
{
  "code_style": {
    "language": "typescript",
    "format_on_save": true,
    "use_prettier": true
  }
}
```

### 13. Version Control
1. Enable Git integration
2. Configure .gitignore rules
3. Set up commit hooks if needed

## Development Workflow

### Running the Full Stack

#### Option 1: Using IntelliJ Run Configurations (Recommended)
1. Ensure Docker services are running: `docker-compose up -d`
2. In IntelliJ, select "Full Stack" from the run configurations dropdown
3. Click the green play button to start both backend and web client

#### Option 2: Using Command Line
```bash
# Start Docker services (PostgreSQL and Redis)
docker-compose up -d

# In one terminal - Start backend
cd backend
npm run dev

# In another terminal - Start web client
cd web-client
npm start
```

#### Option 3: Using Batch Scripts (Windows)
```bash
# Start all Docker services
start-all.bat

# Then in separate terminals:
start-backend.bat
start-web.bat
```

### Service URLs
- **Backend API**: http://localhost:3000
- **Web Client**: http://localhost:3000 (React dev server)
- **PostgreSQL**: localhost:5432 (user: dev, password: devpassword)
- **Redis**: localhost:6379

### Code Navigation
Use these shortcuts in IntelliJ:
- `Ctrl + N`: Navigate to class/file
- `Ctrl + Shift + N`: Navigate to symbol
- `Alt + F7/F8`: Navigate to next/previous error
- `F12`: Go to definition
- `Ctrl + B`: Go to implementation

### Debugging Tips
1. Use Node.js debugger for backend
2. Use Chrome DevTools for web client
3. Use React Native debugger for mobile app
4. Set breakpoints in TypeScript files
5. Use console.log for debugging (will be configured in ESLint)

This configuration provides optimal development experience for the AR Inspection Platform in IntelliJ IDEA.