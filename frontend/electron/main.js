const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let mainWindow;
let backendProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    if (!app.isPackaged) {
        mainWindow.loadURL("http://localhost:3000");
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadURL("http://localhost:3000");
    }
}

app.whenReady().then(() => {
    if (!app.isPackaged) {
        backendProcess = spawn("npm", ["run", "dev"], {
            cwd: path.join(__dirname, "../../backend"),
            shell: true,
            stdio: "inherit"
        });
    }

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (backendProcess) {
        backendProcess.kill();
    }

    if (process.platform !== "darwin") {
        app.quit();
    }
});