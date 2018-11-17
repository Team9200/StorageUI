const { app, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const createufs = require('./main/unknownfs/createStorage')
const receiveufs = require('./main/unknownfs/fileReceive')
const headerufs = require('./main/unknownfs/headerJson')

let win;
let receiveFileWin;
let filelistWin;

let receivedData = new Array();
let resultData;

function createWindow() {
	receiveufs.start();

	win = new BrowserWindow({
		width: 1000,//600,
		height: 600 //300
	});
	
	// win.webContents.openDevTools();
	
	win.webContents.on("did-finish-load", () => {
		win.webContents.send('sendStorage', 10);
		win.webContents.send('sendResponse-rate', 10);
		win.webContents.send('sendBalance', 10);
		createReceiveFileWindow();
	});

	win.loadURL(url.format({
		pathname: path.join(__dirname, '/renderer/index.html'),
		protocol: 'file:',
		slashes: true
	}));

	win.on('closed', () => { win = null });
}

function createReceiveFileWindow() {
	receiveFileWin = new BrowserWindow({
		width: 0,
		height: 0
	});

	// receiveFileWin.webContents.openDevTools()

	receiveFileWin.loadURL(url.format({
		pathname: path.join(__dirname, '/renderer/receiveFile.html'),
		protocol: 'file:',
		slashes: true,
		frame: false
	}));

	receiveFileWin.on('closed', () => { win = null });
}

function createFilelistWindow(filelist) {
	filelistWin = new BrowserWindow({
		width: 500,
		height: 500
	});

	// filelistWin.webContents.openDevTools()

	filelistWin.webContents.on("did-finish-load", () => {
		console.log(filelist);
		filelistWin.webContents.send('filelistData', filelist);
	});

	filelistWin.loadURL(url.format({
		pathname: path.join(__dirname, '/renderer/filelist.html'),
		protocol: 'file:',
		slashes: true
	}));
}

function createSendFileWindow() {
	SendFileWindow = new BrowserWindow({
		width: 500,
		height: 500
	});

	// SendFileWindow.webContents.openDevTools();
	SendFileWindow.loadURL(`file://${__dirname}/main/unknownfs/sendFile.html?senderId=test3&receiverId=test4`);

	SendFileWindow.on('closed', () => {
		SendFileWindow = null
	});
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
})

ipcMain.on('receiveFile', (event, message) => {
	receivedData = receivedData.concat(message.binary.data);

	if(receivedData.length == message.size) {
		console.log("test", receivedData);
		resultData = new Buffer.from(receivedData);
		fs.writeFileSync('./storage/malware.zip', resultData);
		event.sender.send('receivedFile-reply', 'test');
		console.log('test!');	
	}
});

ipcMain.on('createVolume', (event, message) => {
	createufs.createStorage(message);
});

ipcMain.on('filelistWin', (event, message) => {
	var filelist = headerufs.headerJson();
	Promise.resolve(filelist).then(value => {
		console.log(value);
		createFilelistWindow(value);
	});
});

ipcMain.on('sendP2P', function (event, message) {
	createSendFileWindow();
  });
  
  const chunkSize = 16384;
  var sliced_data = '';
  var num = 0;
  ipcMain.on('fileRequest', function(event, msg) {
	  fs.readFile('./Sample.zip', function(err, data) {
		  console.log(Buffer.from(data));
		  var encoded_data = base64Encode(data);
		  for(var i=0, j=0; i<encoded_data.length; i+=chunkSize, j++) {
			  sliced_data = sliceEncodedData(encoded_data, i);
			  event.sender.send('fileRequest-reply', 'advancedEicar', num, Buffer.from(data).length, sliced_data);
			  num = num + 1;
		  }
	  });
  });
  
  function base64Encode(data) {
	  return new Buffer.from(data);
   }; 
  
  function sliceEncodedData(encoded_data, offset) {
	  return encoded_data.slice(offset, offset+chunkSize);
  };