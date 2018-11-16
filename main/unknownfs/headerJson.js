var fs=require('fs');

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
function parseHeader(fd){				// Get file handle / return headerinfo object

	return new Promise(function(resolve, reject){
		
		var i=0;
		var limit = getFilesizeInBytes("unknown.storage")/1024/1024/1024*204;		// file size 당 header 제한값
		var result = new Array();

		for(; i < limit ;i++){

			(function(i,limit){
				this.setTimeout(function(){

				
				try{

					var buffer = new Buffer(64);
				    fs.readSync(fd, buffer,0, 64, 64*i);

					if(buffer.slice(0,1) != '\0'){

						var HeaderInfo = new Object();
			            HeaderInfo.size =parseInt("0x"+changeEndianness(buffer.slice(8,16).toString('hex')));
			            HeaderInfo.block = parseInt("0x"+changeEndianness(buffer.slice(24,32).toString('hex')));
			            HeaderInfo.hash	= buffer.slice(32,64).toString('hex')
			            result.push(HeaderInfo);
					
					}
					else{

						resolve(result);

					}
					if(i == limit-1) resolve(0);

				}
				catch(err){


				}

				}, 60);

			})(i,limit);
		}
	
	});

}
exports.headerJson = async function (){

	var fd = await fs.openSync('unknown.storage',"r+");
	//var f= await fs.openSync('header.json',"w+");
	var data = JSON.stringify(await parseHeader(fd));
	console.log(data);

	//fs.writeSync(f, data);
	return data;
}

//headerJson();
