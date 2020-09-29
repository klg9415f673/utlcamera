import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
const moment = require('moment');
const tz = require('moment-timezone');


export const informSMS = functions.firestore.document('image/{ImgId}').onUpdate(async (change, context) => {
    const accountSid = 'AC000b39ee881b6a20874d61b54dcaf218'; //accountSid
    const authToken = 'f9b2e4eeab7eb2d8ed581369e1c19e11'; //authToken
    const phone = '+15635945444'; //twilio phone
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

export const informChatBot = functions.firestore.document('image/{ImgId}').onUpdate(async (change, context) => { //僅通報不須webhook
  const linebot = require('linebot');
  const bot = linebot({
    channelId: '1654966990',
    channelSecret: 'b445949fea50c8740978b93a1b977f0b',
    channelAccessToken: 'sf9ZpnPeQ9TsA3wO8tcBasuAo//8v1PYeaplln3D9zyy7Lsmutx/4jIhBJqYucx3UtcscAwba9mZGptIRr1q3IzBRNrRhWA8doxF1cihuuQKhdwZnm7Yoy/Oltap96eFiZwXZR3UfFEZw9yXFzVDYgdB04t89/1O/w1cDnyilFU=    '//CHANNEL_ACCESS_TOKEN
  });
  const userId = "U8be845f6f29386dc00d0961d733637e6" //LINE上的Your user ID 
  const timestamp = moment().tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss.SSS")
  const person = await admin.firestore().collection("person")
      .where("licenseplate","==",change.after.data().licenseplate)
      .get()
  person.forEach(async doc =>{    
         console.log(doc.id, '=>' , doc.data())
         if(change.after.data().status == "check"){
            const msg = `Dear ${doc.data().name}, your car ${doc.data().licenseplate} had parking bill at ${timestamp}`
            bot.push(userId, [msg]);
            console.log("ChatBot send")
            change.after.data().status = "inform"
            change.after.data().timestamp = timestamp
            await admin.firestore().collection("person").doc(doc.id).collection("parking bill").add(change.after.data())
            await admin.firestore().collection("image").doc(context.params.ImgId).delete();
          }
  })
  
    
})
