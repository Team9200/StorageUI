const fs = require('fs');
const sha256File = require('sha256-file');
const Uint64LE = require("int64-buffer").Uint64LE;
const hound = require('hound');


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

function getRandomIntInclusive(min, max) {

  return new Promise(function(resolve, reject){
	
	resolve(Math.floor(Math.random() * (max - min + 1)) + min);

  }); 
 }

function lastIndex(fd){				// Get file handle / return headerinfo object

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

						var buf = new Buffer(1);
						fs.readSync(fd, buf,0, 1, 64*(i-1));

						if(buf[0] != 0){

							resolve(i);

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
////////////////////////////////////////////////////////////////////////////////////////////////////////////


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


function searchHeader(fd, number){		// Get Storage File handle, hash / return Headerinfo Object 	*

	return new Promise(function(resolve, reject){
		
		var i=0;
		var limit = getFilesizeInBytes("unknown.storage")/1024/1024/1024*204;
		var HeaderInfo = new Object();

		for(; i < limit ;i++){

			(function(i,limit){
				this.setTimeout(function(){
				try{

					var buf = new Buffer(64);
				    fs.readSync(fd, buf,0, 64, 64*i);
					if(i == number){

						console.log("Find ..");
			           	HeaderInfo.index = i;
			            HeaderInfo.size = buf.slice(8,16);
			            HeaderInfo.start = buf.slice(16,24);
			            HeaderInfo.block = buf.slice(24,32);
			            HeaderInfo.name	= buf.slice(32,64);
						resolve(HeaderInfo);
					
					}
					if(i == limit - 1) resolve(0);


				}
				catch(err){

					//console.log("searchHeader : ",err);

				}

				}, 60);
			})(i,limit);
		}
	
	});

}
                   
function extractFile(resultFile ,fd, offset, size){			// resultFileName handle, Storage handle, Start offset, file size / return 0



	return new Promise(function(resolve, reject){

		var block = Math.ceil(size / 1024 / 1024);
		var last = size - (1024*1024*(block-1));
		var i = 0;
		if(block == 0){
			resolve("done");
		}

		for(; i < block;i++){

			(function(i,block){
				this.setTimeout(function(){
				try{

					if(i == block-1){

						var buff = new Buffer(last);
						fs.readSync(fd, buff,0, buff.length, offset+(1024*1024*(i)));
						writeFile(resultFile, 0, buff, i);
				    	resolve("done");

					}
					else{
						var buf = new Buffer(1024*1024);
					    fs.readSync(fd, buf,0, buf.length, offset+(1024*1024*i));
					    writeFile(resultFile, 0, buf, i);
					}

				}
				catch(err){

					//console.log(err);

				}

				}, 60);
			})(i,block);
			
		}
	});


}
//////////////////////////////////////////////////////////////////////////////////////////

async function fileExtract(){		//	파일을 해쉬값을 통해 추출 / Get hash , return Null

	var storageFile = fs.openSync("unknown.storage", "r+");
	var index = await lastIndex(storageFile);
	index = await getRandomIntInclusive(0,index-1);
	var search = await searchHeader(storageFile,index);

	if(search != 0){

		var start = parseInt("0x"+changeEndianness(search.start.toString('hex')));
		var size = parseInt("0x"+changeEndianness(search.size.toString('hex')));
		//var name = changeEndianness(search.name.toString('hex'));
		//var resultFile = await fs.openSync(string2Byte(name.replace(/00/gi,"")).toString(), "w+");
		//console.log("Extracting "+string2Byte(name.replace(/00/gi,"")).toString());

		var resultFile = await fs.openSync("unknown.zip", "w+");
		var result=await extractFile(resultFile,storageFile, start,size);
		
	}
	else{

		console.log("Not Found!");

	}
	fs.closeSync(storageFile);

	console.log(result);

}

////////////////////////////////////////////////////////////////////////////////////////////////

exports.Extract = function(){

	fileExtract();

}
