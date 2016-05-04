# firebase-s3-image-migration-tool

This (Node.js) tool is usefull in a situation where a number of json entities at a certain Firebase location (e.g. ...fireba.com/entities) contain image (and thumbnail) urls pointing to a non-S3 location. This tool migrates images from given non-S3 location to the specified S3 location and updates the Firebase entity accordingly.

I used this to migrate images to S3 away from Parse, after migrating all other data to Firebase from Parse.

Assume we have a Firebase db (e.g. at https://myfirebase.firebaseio.com/entities) with following contents

```
{
  "entity1id":  {
      "imageUrl:"http://files.parse.com/baf8a6e7.....",
      "thumbnailUrl":"http://files.parse.com/5a406fc75...."
      ...other entity properties...
  },
  "entity2id":  {
     "imageUrl:"http://files.parse.com/83d1a473.....",
      "thumbnailUrl":"http://files.parse.com/2aa653149...."
      ...other entity properties...
  }
}
```

If we instead want our images to be e.g. "http://coolbucket.s3.amazonaws.com/5heuih4.....", then this script might be usefull to you.

## Usage

Run "npm install" to install dependencies.

To run migration, prepare a properties file (named: properties) of this kind:
```
s3UserAccessKey = <your_access_key>
s3secretAccessKey = <your_secret>
bucketName = <your_bucket_name_on_s3>
firebaseDataUrl = <firebase_entities_url>
```


