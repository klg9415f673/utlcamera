import * as functions from 'firebase-functions';
import { bucket} from '../bucketinformation';
import vision from '@google-cloud/vision';
const client = new vision.ImageAnnotatorClient();
import { cardata } from '../modeltype';
import * as firebaseAdmin from 'firebase-admin';
import {DATE} from '.././Date';

export const LPdetect = functions.storage.bucket(bucket.update_bucket).object().onFinalize(async (image) => {

  const fileUrl = image.mediaLink; 
  const fileName = image.name as string; 
  const file_updatedtime = image.timeCreated;
  const TODAY = new Date().getTime();
  const [detection] = await client.textDetection(`gs://${bucket.update_bucket}/${DATE(TODAY).nowdate}/${fileName}`);

  console.log("imageobject:",image);
  console.log("detection:",detection);

  if (detection.textAnnotations !== null && detection.textAnnotations !== undefined) {
    const Text = detection.textAnnotations[0];
      console.log('Text:',Text);
      var licenseplate = Text.description as string;
      var items=licenseplate.split("-")
      var licenseplate2 = items.join("")
      var items2=licenseplate2.split(" ")
      var newlicenseplate = items2.join("")
      console.log("licenseplate:",newlicenseplate);

      const cardata: cardata = {
        imageUrl: fileUrl as string,
        update_time:file_updatedtime,
        time: Math.round(new Date(file_updatedtime).getTime()/1000)  //str2timestamp
      } ;

      console.log("carlp:",cardata);
      
      const mac = fileName.substr(0,6);
      const SN = fileName.substr(6,2);
      await firebaseAdmin.firestore().collection("recognized").doc(mac).collection(SN).doc(newlicenseplate).set(cardata);

  }else{ 
    
    
    console.log("detection null/undefined!!!!!!!!") }

});



