const { app, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

let win;
let receivedData = new Array();
let resultData;

function createWindow() {
	win = new BrowserWindow({
		width: 800,
		height: 600
	});
	
	win.webContents.openDevTools()

	win.loadURL(url.format({
		pathname: path.join(__dirname, '/views/index.html'),
		protocol: 'file:',
		slashes: true
	}));

	win.on('closed', () => { win = null });
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
})

ipcMain.on('receiveFile', (event, message) => {
	//console.log(message);
	receivedData = receivedData.concat(message.binary.data);
	console.log(message.binary.data.length);
	//console.log(receivedData);

	if(message.binary.data.length < 16384) {
		console.log("test", receivedData);
		resultData = new Buffer.from(receivedData);
		fs.writeFile('./malware.zip', resultData, (err) => { console.log(err) });
	}
});



