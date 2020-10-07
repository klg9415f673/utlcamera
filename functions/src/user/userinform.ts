import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import {twilio,LINE,TWSMS} from './imformrConfig';
const moment = require('moment');
const tz = require('moment-timezone');


export const informTwilio = functions.firestore.document('image/{ImgId}').onUpdate(async (change, context) => {
    const accountSid = twilio.accountSid
    const authToken = twilio.authToken
    const phone = twilio.phone
    const client = require('twilio')(accountSid, authToken);
      const timestamp = moment().tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss.SSS")
      const person = await admin.firestore().collection("person")
          .where("licenseplate","==",change.after.data().licenseplate)
          .get()
      person.forEach(async doc =>{    
          console.log(doc.id, '=>' , doc.data())
          if(change.after.data().status == "check"){
              const msg = `Dear ${doc.data().name}, your car ${doc.data().licenseplate} had parking bill at ${timestamp}`
              client.messages
                  .create({body: msg, from: phone, to: doc.data().phone})
                  .then(message => console.log(message.sid));
              console.log("SMS send")
              change.after.data().status = "inform"
              change.after.data().timestamp = timestamp
              await admin.firestore().collection("person").doc(doc.id).collection("parking bill").add(change.after.data())
              await admin.firestore().collection("image").doc(context.params.ImgId).delete();
          }
      })
  
    
})

export const informTWSMS = functions.firestore.document('image/{ImgId}').onUpdate(async (change, context) => {
    
      const timestamp = moment().tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss")
      const person = await admin.firestore().collection("person")
          .where("licenseplate","==",change.after.data().licenseplate)
          .get()
      person.forEach(async doc =>{   
          const mobile = '0'+doc.data().phone.substr(4,9)
          const msg = `${doc.data().name}先生/小姐,您的車輛${doc.data().licenseplate}已在${timestamp}開立停車繳費單`
          var query = `username=${TWSMS.account}&password=${TWSMS.passward}&mobile=${mobile}&message=${msg}`
          query = encodeURI(query)
          const url = `http://api.twsms.com/json/sms_send.php?${query}` 
          console.log(url)
          console.log(doc.id, '=>' , doc.data())
          if(change.after.data().status == "check"){
            
              axios.get(url)
                .then(async res=>{
                    if(res.data.status == 200){
                        console.log("TW SMS send")
                        change.after.data().status = "inform"
                        change.after.data().timestamp = timestamp
                        await admin.firestore().collection("person").doc(doc.id).collection("parking bill").add(change.after.data())
                        await admin.firestore().collection("image").doc(context.params.ImgId).delete();
                    }
                })
                .catch(err=>{
                    console.log('axios error:',err)
                })
             
             
          }
      })
  
    
})

export const informChatBot = functions.firestore.document('image/{ImgId}').onUpdate(async (change, context) => { //僅通報不須webhook
  const linebot = require('linebot');
  const bot = linebot({
    channelId: LINE.channelId,
    channelSecret: LINE.channelSecret,
    channelAccessToken: LINE.channelAccessToken
});
  var previous= change.after.data();
  const userId = LINE.userId 
  const timestamp = moment().tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss.SSS")
  const person = await admin.firestore().collection("person")
      .where("licenseplate","==",previous.licenseplate)
      .get()
  person.forEach(async doc =>{    
         console.log(doc.id, '=>' , doc.data())
         if(previous.status == "check"){
            const msg = `DeviceMAC:${previous.deviceMAC}\r\nName:${doc.data().name}\r\nCar:${doc.data().licenseplate}\r\nTime:${timestamp}`
            bot.push(userId, [
                                {
                                    type:'text',
                                    text:msg
                                },
                                {
                                    type:'image',
                                    originalContentUrl:previous.imgURL,
                                    previewImageUrl:previous.imgURL
                                }
                               
                            ]
                    ).catch(err=>console.log(err));
          
          
            console.log("ChatBot send")
            previous.status = "inform"
            previous.timestamp = timestamp
            await admin.firestore().collection("person").doc(doc.id).collection("parking bill").add(previous)
            await admin.firestore().collection("image").doc(context.params.ImgId).delete();
          }
  })
  
    
})
