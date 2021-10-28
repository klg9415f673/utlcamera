import * as functions from 'firebase-functions';
import { bucket} from '../bucketinformation';
import vision from '@google-cloud/vision/build/src';
const client = new vision.ImageAnnotatorClient();
import { cardata } from '../modeltype';
import * as firebaseAdmin from 'firebase-admin';
const moment = require('moment');
const tz = require('moment-timezone');

import * as cors from 'cors'
const corsHandler = cors({ origin: true })

export const LPdetect = functions.storage.bucket(bucket.update_bucket).object().onFinalize(async (image) => {

const fileUrl = image.mediaLink as string; 
const fileName = image.name as string; 
var nowdate = new Date().getTime();
const [detection] = await client.textDetection(`gs://${bucket.update_bucket}/${fileName}`)

console.log("imageobject:",image);
console.log("detection:",detection);

const Text = detection.textAnnotations[0];
var licenseplate = Text[0].description
var items=licenseplate.split("-")
var licenseplate2 = items.join("")
var items2=licenseplate2.split(" ")
var oldlicenseplate = items2.join("")
var newlicenseplate = oldlicenseplate.split('\n')[0]
console.log("licenseplate:",newlicenseplate);
const cardata : cardata= {
  imageUrl: fileUrl ,
  licenseplate:newlicenseplate,  
  status:true,
  recognizetime:moment(nowdate).tz("Asia/Taipei").format("YYYYMMDDTHHMMSS.sssZ")
} 


const mac = fileName.split('/')[1].split('-')[0];
await firebaseAdmin.firestore().collection("recognized").doc(mac).set(cardata)

    
})

export const platedetect = functions.https.onRequest(async(req: functions.Request, res: functions.Response) => {
  
  corsHandler(req, res, async () => {
    switch (req.method) {
      case "POST":
        var fileUrl = req.body.url
        var text = fileUrl.split("https://firebasestorage.googleapis.com/v0/b/utl_image_update/o/")[1]
        const [detection] = await client.textDetection(`gs://${bucket.update_bucket}/${text.split("%2F")[0]}/${text.split("%2F")[1]}/${text.split("%2F")[2].split("?alt=media")[0]}`)
        const Text = detection.textAnnotations; 
        console.log(typeof(Text))
        if(+Text === 0){
          console.log("+TEXT可以用")
        }
        if(JSON.stringify(Text) === '[]'){
          console.log("JSON.stringify(Text) === '[]'可以用")
        }
        console.log("detection:",detection);
        res.status(200).send("OK")
          
        break;

    }

  })

})
