var PropertiesReader = require('properties-reader');
var properties = PropertiesReader('properties');

function getS3() {
	var AWS = require('aws-sdk');
	AWS.config.update({accessKeyId: properties.get('s3UserAccessKey'), secretAccessKey: properties.get('s3secretAccessKey')});
	return new AWS.S3({params: {Bucket: properties.get('bucketName')}});
}

function migrateImageToS3(s3, imageUrl, imageKey, success, error) {
	var http = require("http");
	http.get(imageUrl, function(http_IncomingMessage) {
		var bufs = [];
		//console.log(http_IncomingMessage.statusCode + " " + http_IncomingMessage.statusMessage);
		//console.log(http_IncomingMessage.rawHeaders);
		http_IncomingMessage.on('data', (chunk) => {
		  bufs.push(chunk);
		});
		http_IncomingMessage.on('end', () => {
		  var buf = Buffer.concat(bufs);
		  var params = {
			Body: buf, 
			Key: imageKey,
			ContentType: "image/jpeg"
		  };
		  s3.upload(params, function(err, data) {
	    	if (err) { 
	    		console.log("Error:", err); 
	    		error();
	    	} else {
	    		//console.log("S3 sucess.");
	    		//console.log(data);
	    		success(data.Location);
	    	};
	    });
		});
		
	}).on("error", function(error) {
		console.log("Got error " + error);
		error();
	});
};

// function downloadFile() {
// 	var http = require("http");
// 	var fs = require('fs');

// 	var file = fs.createWriteStream("image.jpg");
// 	var request = http.get(parseUrl, function(response) {
//   		response.pipe(file);
// 	});
// }

function migrateFirebaseImagesToS3() {
	var firebaseUrl = properties.get("firebaseDataUrl");
	var Firebase = require("firebase");
	var firebasePatchesRef = new Firebase(firebaseUrl);
	var uuid = require('node-uuid');
	var imageUrlKey = "imageUrl";
	var thumbnailUrlKey = "thumbnailUrl";
	var firebasePatches;
	var firebasePatchKeys = [];

	var currentMigrateIdx = 0;
	var patchCount;

    function currentKey() {
    	return firebasePatchKeys[currentMigrateIdx];
    }

    function continueMigrating() {
		currentMigrateIdx++;
		if (currentMigrateIdx > firebasePatchKeys.length -1) {
			console.log("Migration is complete");
			return;
		}
		migratePatch(currentKey(), firebasePatches[currentKey()]);
    }

    function migratePatch(key, patch) {
    	console.log("\nMigrating patch " + (currentMigrateIdx+1) + " of " +patchCount + " with id " +key);
    	var migrateImage = true;
    	var migrateThumb = true;
    	if (patch.imageUrl == undefined || patch.imageUrl.indexOf("s3.amazonaws.com") > -1) {
    		console.log("Skipping image. Either undefined or already migrated to S3");
    		migrateImage = false;
    	}
    	if (patch.thumbnailUrl == undefined || patch.thumbnailUrl.indexOf("s3.amazonaws.com") > -1) {
    		console.log("Skipping thumbnail. Either undefined or already migrated to S3");
    		migrateThumb = false;
    	}

    	if (migrateImage) {
	    	migratePatchImage(key, patch, ()=>{
	    		if (migrateThumb) {
					migratePatchThumb(key, patch, ()=>{continueMigrating();});
				} else {
					continueMigrating();
				}
	    	});
		} else if (migrateThumb) {
			migratePatchThumb(key, patch, ()=>{continueMigrating();});
		} else {
			continueMigrating();
		}
    }

	function migratePatchImage(key, patch, cb) {
		console.log("Migrating image " + patch[imageUrlKey]);
		var patchRef = firebasePatchesRef.child(key);
		migrateImageToS3(getS3(), patch[imageUrlKey], "images/"+uuid.v4(), function(newImageUrl) {
			console.log("New location " + newImageUrl);
			var obj = {};
			obj[imageUrlKey] = newImageUrl;
			patchRef.update(obj);
			cb();
		}, function() {
			cb();
		});
	}

	function migratePatchThumb(key, patch, cb) {
		console.log("Migrating thumbnail image " + patch[thumbnailUrlKey]);
		var patchRef = firebasePatchesRef.child(key);
		migrateImageToS3(getS3(), patch[thumbnailUrlKey], "thumbs/"+uuid.v4(), function(newImageUrl) {
			console.log("New location " + newImageUrl);
			var obj = {};
			obj[thumbnailUrlKey] = newImageUrl;
			patchRef.update(obj);
			cb();
		}, function() {
			cb();
		});
	}

	console.log("Will acquire Firebase snapshot");
	firebasePatchesRef.once("value", function(snapshot) {
	  	firebasePatches = snapshot.val();
	  	for (var key in firebasePatches) {
	  		// Make sure no prototype keys are used.
			if (firebasePatches.hasOwnProperty(key)) {
		    	firebasePatchKeys.push(key);
			}
			patchCount = Object.keys(firebasePatches).length;
		}
		console.log("Snapshot acquired from Firebase - patchCount: " + patchCount);
		migratePatch(currentKey(), firebasePatches[currentKey()]);
	}, function (errorObject) {
	  console.log("The read failed: " + errorObject.code);
	});

}

migrateFirebaseImagesToS3();
