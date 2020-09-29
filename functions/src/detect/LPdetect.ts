import * as functions from 'firebase-functions';
import { bucket} from '../bucketinformation';
import vision from '@google-cloud/vision/build/src';
const client = new vision.ImageAnnotatorClient();
import { cardata } from '../modeltype';
import * as firebaseAdmin from 'firebase-admin';
const moment = require('moment');
const tz = require('moment-timezone');


export const LPdetect = functions.storage.bucket(bucket.update_bucket).object().onFinalize(async (image) => {

const fileUrl = image.mediaLink as string; 
const fileName = image.name as string; 
var nowdate = new Date().getTime();
const [detection] = await client.textDetection(`gs://${bucket.update_bucket}/${fileName}`)

console.log("imageobject:",image);
console.log("detection:",detection);

const Text = detection.textAnnotations[0];
var licenseplate = Text.description as string;
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



