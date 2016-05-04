# firebase-s3-image-migration-tool

This tool is usefull in a situation where a number of json entities at a certain Firebase location (e.g. ...fireba.com/entities) contain image (and thumbnail) urls pointing to a non-S3 location. This tool migrates images from given non-S3 location to the specified S3 location and updates the Firebase entity accordingly.

