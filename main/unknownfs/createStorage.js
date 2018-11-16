const fs = require('fs');

function writeNullFile(fd,size){	// GB 단위

	return new Promise(function(resolve, reject){

		var buf = new Buffer(1024*1024*1024)	// 1GB
 
		for(var index = 0; index < size; index++){

			(function(index, count){

				this.setTimeout(function(){

					try {

					  fs.appendFileSync(fd, buf);
					  console.log((index+1) .toFixed(2)+ " GB Created");
					  
					  if(index == size -1){

					  	resolve("Done.");

					  }

					} catch (err) {
					  /* Handle the error */
					  resolve(err);

					}

				}, 5);

			})(index,size);

		}

	});
}

exports.createStorage = async function (size){

	if(size == 0 ||typeof size == 'undefined') {
	
		console.log("Must be greater than zero");
		return ;

	}
	
	try{

		var fd = fs.openSync("unknown.storage", "w+");
		console.log("createStorage..");

	}
	catch(err){

		console.log("createStorage Fail : Open Fail");
	
	}
	
	var result = await writeNullFile(fd ,size);
	await fs.closeSync(fd);
	console.log(result);


}


//createStorage(process.argv[2]);
