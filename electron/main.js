
const { app, BrowserWindow } = require('electron')
const path = require('path')

// Disable sandbox to allow running as root. 
// This is necessary because Chrome/Electron does not support running as root without it.
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-setuid-sandbox')
const { spawn } = require('child_process')
const fs = require('fs')

let mainWindow
let backendProcess

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        backgroundColor: '#fdf2f8', // Light pink gradient start
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    })

    // Always load from React frontend
    const indexPath = path.join(__dirname, '../front/dist/index.html')

    console.log(`>>> ByteAlchemy <<<`)
    console.log(`Loading: ${indexPath}`)

    if (isDev && process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(indexPath).catch(() => {
            console.error(`Failed to load: ${indexPath}`)
        })
    }
}

const PY_HOST = '127.0.0.1'
const PY_PORT = 3335

function startBackend() {
    console.log('Starting Python backend...')

    let backendExecutable
    let args = []

    if (isDev) {
        // Development mode: Run from script using virtual environment
        const venvPythonPath = path.join(__dirname, '../.venv/bin/python')

        // Fallback to system Python if venv doesn't exist
        let pythonPath
        if (fs.existsSync(venvPythonPath)) {
            pythonPath = venvPythonPath
            console.log(`Using venv Python: ${pythonPath}`)
        } else {
            pythonPath = 'python3'
            console.log(`Venv not found, using system Python: ${pythonPath}`)
        }

        const scriptPath = path.join(__dirname, '../backend/server.py')
        backendExecutable = pythonPath
        args = [scriptPath]
        console.log(`Development mode detected (${process.platform}).`)
    } else {
        // Packaged mode: Run the bundled executable
        // The binary is placed in resources/backend-server/backend-server
        backendExecutable = path.join(process.resourcesPath, 'backend-server/backend-server')
        console.log(`Packaged mode detected. Using executable: ${backendExecutable}`)
    }

    backendProcess = spawn(backendExecutable, args)

    backendProcess.on('error', (err) => {
        console.error('Failed to start backend process:', err)
    })

    backendProcess.stdout.on('data', (data) => {
        console.log(`python: ${data}`)
    })

    backendProcess.stderr.on('data', (data) => {
        console.error(`python error: ${data}`)
    })

    backendProcess.on('close', (code) => {
        console.log(`python process exited with code ${code}`)
    })
}

app.whenReady().then(() => {
    // Skip backend start if launched from run.py (run.py already starts the backend)
    if (process.env.SKIP_ELECTRON_BACKEND !== '1') {
        startBackend()
    } else {
        console.log('Skipping backend start (launched from run.py)')
    }
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})


app.on('before-quit', () => {
    if (backendProcess) {
        backendProcess.kill()
    }
})
