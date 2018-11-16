const fs = require('fs');
const sha256File = require('sha256-file');
const Uint64LE = require("int64-buffer").Uint64LE;
const hound = require('hound');
const fileExtract = require('./fileExtract')
//var zip = require('file-zip');




function getFilesizeInBytes(filename) {			// get File Name / return File Size

    const stats = fs.statSync(filename);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;

}


function changeEndianness(str){				// change endian

        const result = [];
        if(str.length % 2 == 1) str = "0"+str;
        let len = str.length - 2;
        while (len >= 0) {
          result.push(str.substr(len, 2));
          len -= 2;
        }
        return result.join('');

}

function string2Byte(str) {				// get ByteString / return Byte 	ex) 1122 >> [buf 11,22]

    var result = [];
    if(str.length % 2 != 0) str = "0"+str;
    while (str.length >= 2) { 
        result.push(parseInt(str.substring(0, 2), 16));
        str = str.substring(2, str.length);
    }
    const buf = Buffer.from(result);
    return buf;
}


function toAscii(str) {				// get string / return ascii
	var hex = '';
	for(var i=0;i<str.length;i++) {
		hex += ''+parseInt(str.charCodeAt(i)).toString(16);
	}
	return hex;
}

function zipCompress(path){


	zip.zipFile([path],'out.zip',function(err){

	    if(err){
	        console.log('zip error',err)
	    }else{
	        console.log('zip success');
	    }
	})

}

function nameBuffer(name){
 
 	name = name.slice(8,28)
	var buf1=new Buffer(4);
	var buf2=new Buffer(4);
	var buf3=new Buffer(4);
	var buf4=new Buffer(4);
	var buf5=new Buffer(4);
	var buf6= new Buffer(12);
	buf1.writeUInt32LE(parseInt("0x"+toAscii(name.slice(0,4)),16));
	buf2.writeUInt32LE(parseInt("0x"+toAscii(name.slice(4,8)),16));
	buf3.writeUInt32LE(parseInt("0x"+toAscii(name.slice(8,12)),16));
	buf4.writeUInt32LE(parseInt("0x"+toAscii(name.slice(12,16)),16));
	buf5.writeUInt32LE(parseInt("0x"+toAscii(name.slice(16,20)),16));

	var result = Buffer.concat([buf6,buf5,buf4,buf3,buf2,buf1],32);
	return result;

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////

function sizeofStorage(fd){				// Get file handle / return headerinfo object

	return new Promise(function(resolve, reject){
		
		var i=0;
		var limit = getFilesizeInBytes("unknown.storage")/1024/1024/1024*204;		// file size 당 header 제한값
		var size=0;

		for(; i < limit ;i++){

			(function(i,limit){
				this.setTimeout(function(){

				
				try{

					var buffer = new Buffer(8);
				    fs.readSync(fd, buffer,0, 8, (64*i)+8);
				    size+=buffer.readUInt32LE();
					if(limit-1 == i) resolve(getFilesizeInBytes("unknown.storage")-size);


				}
				catch(err){

					//console.log("parseHeader: ", err);

				}

				}, 60);

			})(i,limit);
		}
	
	});

}



////////////////////////////////////////////////////////////////////////////////////////////////////////////


function parseHeader(fd){				// Get file handle / return headerinfo object

	return new Promise(function(resolve, reject){
		
		var i=0;
		var limit = getFilesizeInBytes("unknown.storage")/1024/1024/1024*204;		// file size 당 header 제한값

		for(; i < limit ;i++){

			(function(i,limit){
				this.setTimeout(function(){

				
				try{

					var buffer = new Buffer(1);
				    fs.readSync(fd, buffer,0, 1, 64*i);

					if(buffer == '\0' && i != 0){

						var buf = new Buffer(64);
						fs.readSync(fd, buf,0, 64, 64*(i-1));

						if(buf[0] != 0){

							var HeaderInfo = new Object();
				            HeaderInfo.index = i;
				            HeaderInfo.size = buf.slice(8,16);
				            HeaderInfo.start = buf.slice(16,24);
				            HeaderInfo.block = buf.slice(24,32);
				            HeaderInfo.name	= buf.slice(32,64);
				    
							resolve(HeaderInfo);

						}
					
					}
					if(i == limit-1) resolve(0);

				}
				catch(err){

					//console.log("parseHeader: ", err);

				}

				}, 60);

			})(i,limit);
		}
	
	});

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

function createHeaderBuffer(analCheck, fileName, startOffset){			// Get 분석여부, File Name, Start offset / return header buffer

	return new Promise(function(resolve, reject){

		var size = getFilesizeInBytes(fileName);	
		var block = Math.ceil(size/1024/1024);

		var anal = new Uint64LE(parseInt("0x"+toAscii(analCheck),16)).toBuffer();				// 8 Byte							
		var fileSize = new Uint64LE(size).toBuffer();						// 8 Byte
		var offset = new Uint64LE(startOffset).toBuffer();						// 8 Byte
		var usedBlock = new Uint64LE(block).toBuffer();						// 8 Byte	
		var name = string2Byte(changeEndianness(sha256File(fileName)));     // 32 Byte sha256

		var buffer = Buffer.concat([anal,fileSize,offset,usedBlock, name],64);	// buffer concat
		resolve(buffer);	

	});

}

var writeHeader = function(fd, index, buffer) {			// Get file handle, header index, header buffer

	return new Promise(function(resolve, reject){

		fs.writeSync(fd, buffer, 0, buffer.langth, 64*index);
	 	resolve();

	});

}

////////////////////////////////////////////////////////////////////////////////////////////////

function updateStorage(targetFile, storageFile ,targetName, offset){		// Get target File handle , Storage File handle, target Name, Start offset / return 0 

	return new Promise(function(resolve, reject){
	
		var srcFileSize= getFilesizeInBytes(targetName);
		var count = Math.ceil(srcFileSize/1024/1024);

		if(count == 0) resolve("done");

		for(var index = 0; index < count ;index++){

			(function(index, count){

				this.setTimeout(function(){

					try{

						var buf = new Buffer(1024*1024);
					    fs.readSync(targetFile, buf,0, buf.length, buf.length*index);
					    writeFile(storageFile ,offset ,buf, index)
						if(index == count-1) resolve("done");

					}
					catch(err){

						console.log("updateStorage function error : ",index,err);
					}

				}, 60);

			})(index,count);

		}
	});

}

function writeFile(fd, offset,buffer, index){		// Get Storage File handle, Start offset, Header buffer, block index / return Null

	return new Promise(function(resolve, reject){

		try{

			fs.writeSync(fd, buffer, 0, buffer.length, offset+(1024*1024*index));  
			resolve();

		}
		catch(err){

			console.log("writeFile Function Error: ",err);
		}


	});
}

//////////////////////////////////////////////////////////////////////////////////////////


 async function ParseData(){	// return write file header

 	try{
		var fd = await fs.openSync("unknown.storage", "r+");
	}
	catch(err){

		console.log("ParseData function fs.openSync Error");
	}

	var parse= await parseHeader(fd);					// header를 읽으면서 어느곳이 빈곳인지 확인하고 다음에 어디에 들어가야할지 찾는다.
	var header = new Object();

	if(parse == 0){

		header.index = 0;
		header.offset = getFilesizeInBytes("unknown.storage")/1024/1024/1024*204*64;

	}
	else{

		header.index = parse.index;
		var block = parseInt("0x"+changeEndianness(parse.block.toString('hex')));
		var start = parseInt("0x"+changeEndianness(parse.start.toString('hex')));
		start += (block * 1024*1024);
		header.offset = start;
		
	}
	await fs.closeSync(fd);

	return header;

}

async function fileRecive(srcFileName, result){		// 파일을 받아와 저장 / Get Source File Name , 분석여부 / return null 

	var header = await ParseData();
	console.log("Header : ",header);

	try{
		var storageFile = fs.openSync("unknown.storage", "r+");
		var sourceFile = fs.openSync(srcFileName, "r+");
		console.log("oepn Success");
	}
	catch(err){
		console.log(err);
	}
	console.log(await sizeofStorage(storageFile));
	console.log("creating Header Buffers..")
	var buffer= await createHeaderBuffer(result, srcFileName, header.offset);			// write Header
	console.log("writing Header..");
	await writeHeader(storageFile, header.index, buffer);
	console.log("writing File..");
	var result=await updateStorage(sourceFile,storageFile,srcFileName,header.offset);		//	쓸 파일, 쓰여질 곳, 쓸 파일의 이름, 쓸곳에 시작 주소.
	console.log(result);

	await fs.unlinkSync(srcFileName);

	await fs.closeSync(sourceFile);
	await fs.closeSync(storageFile);


}

////////////////////////////////////////////////////////////////////////////////////////////////

function fileMonitor(){		// storage 라는 폴더를 감시하다가 파일이 생성되면 파일을 storage에 저장.

	watcher = hound.watch('storage');
	watcher.on('create', function(file, stats) {
		
		console.log(file + ' was created');
		watcher.unwatch('storage');

		if(file.slice(8,12) == "give"){

			fileExtract.Extract();
			fs.unlinkSync(file);
		}
		else{
		
			setTimeout(function(){fileRecive(file,"F");}, 3000);
		
		}

		fileMonitor();

	});

}
////////////////////////////////////////////////////////////////////////////////////////////////


exports.start = function(){

	console.log("Waiting..");
	fileMonitor();		// 파일 생성 감시
}
