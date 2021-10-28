import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import {twilio,LINE,TWSMS} from './imformrConfig';
const moment = require('moment');
const tz = require('moment-timezone');

export const informTwilio = functions.firestore.document('notification/{notificationId}').onUpdate(async (change, context) => {
    const accountSid = twilio.accountSid
    const authToken = twilio.authToken
    const phone = twilio.phone
    const client = require('twilio')(accountSid, authToken);
    const timestamp = moment().tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss.SSS")
    const person = await admin.firestore().collection("person")
          .where("licenseplate","==",change.after.data().licenseplate)
          .get()
    await person.forEach(async doc =>{              
            console.log(doc.id, '=>' , doc.data()) 
            if(doc.data().phone !== undefined ||doc.data().phone != "" ||doc.data().phone !== null){  
                    switch(change.after.data().status){
                        case "check":
                            const msg = `Dear ${doc.data().name}, your car ${doc.data().licenseplate} had parking bill at ${timestamp}`
                            client.messages
                                .create({body: msg, from: phone, to: doc.data().phone})
                                .then(message => console.log(message.sid));
                            console.log("SMS send")
                            change.after.data().status = "inform"
                            change.after.data().timestamp = timestamp
                            await admin.firestore().collection("person").doc(doc.id).collection("parking bill").add(change.after.data())
                            await admin.firestore().collection("notification").doc(context.params.notificationId).delete();
                            break;
                    }
                  
            }else{
                     console.log(`${doc.id} doesn\'t have phone`)
            }
                
          
      })
  
    
})

export const informTWSMS = functions.firestore.document('notification/{notificationId}').onUpdate(async (change, context) => {
    var previous= change.after.data();
    const person = await admin.firestore().collection("person")
          .where("licenseplate","==",previous.licenseplate)
          .get()
    person.forEach(async doc =>{   
            if(doc.data().phone !== undefined ||doc.data().phone != "" ||doc.data().phone !== null){
                    const mobile = '0'+doc.data().phone.substr(4,9)
                    const msg = `${doc.data().name}先生/小姐，您停於${previous.parkinglot}的車輛${doc.data().licenseplate}，已在${previous.updatetime}開立停車繳費單`
                    var query = `username=${TWSMS.account}&password=${TWSMS.passward}&mobile=${mobile}&message=${msg}`
                    query = encodeURI(query)
                    const url = `http://api.twsms.com/json/sms_send.php?${query}` 
                    console.log(doc.id, '=>' , doc.data())
                    switch(previous.notification){
                        case "check":                        
                            axios.get(url)
                                .then(async res=>{
                                        console.log("TW SMS send")
                                })
                                .catch(err=>{
                                    console.log('axios error:',err)
                                })
                            break;
                        
                        
                        
                    }
            }else{
                console.log(`${doc.id} doesn\'t have phone`)
            }
      })
  
    
})


export const informChatBot = functions.firestore.document('notification/{notificationId}').onUpdate(async (change, context) => { //僅通報不透過webhook
    const linebot = require('linebot');
    const bot = linebot({
      channelId: LINE.channelId,
      channelSecret: LINE.channelSecret,
      channelAccessToken: LINE.channelAccessToken
    });
    var previous= change.after.data();
    var userID =[];
    await admin.firestore().collection("person")
        .where("role","==","admin")
        .get()
        .then( querySnapshot  =>{
            if (querySnapshot.empty) {
                console.log("NO LICENSE PLATE AVAILABLE");
            } else {
                for(var i = 0; i<querySnapshot.docs.length; i++){
                    userID.push(querySnapshot.docs[i].data().lineID);
                }
                console.log(userID);
            }

        });
    await admin.firestore().collection("person")
        .where("licenseplate","==",previous.licenseplate)
        .get()  
        .then( async querySnapshot  =>{
            if (querySnapshot.empty) {
                console.log("NO LICENSE PLATE AVAILABLE");
            } else {
                for(var i = 0; i<querySnapshot.docs.length; i++){
                    userID.push(querySnapshot.docs[i].data().lineID);
                }
                console.log(userID);
                switch(previous.notification){
                    case "check":
                        var msg = `ParkingLot:${previous.parkinglot}\r\nName:${querySnapshot.docs[0].data().name}\r\nCar:${querySnapshot.docs[0].data().licenseplate}\r\nTime:${previous.updatetime}`
                        bot.push(userID, [
                            {
                                type:'text',
                                text:msg
                            },
                            {
                                type:'image',
                                originalContentUrl:previous[previous.mac.mac1],
                                previewImageUrl:previous[previous.mac.mac1]
                            },
                            {
                                type:'image',
                                originalContentUrl:previous[previous.mac.mac2],
                                previewImageUrl:previous[previous.mac.mac2]
                            }
                        
                            ]).catch(err=>console.log("linbot push error:",err));
                        console.log("User & Admin inform")
                        previous.notification = "inform";
                        await admin.firestore().collection("person").doc(querySnapshot.docs[0].id).collection("parking bill").add(previous)
                        await admin.firestore().collection("parkinglot").doc(previous.parkinglot).collection('history').add(previous)
                        await admin.firestore().collection("notification").doc(context.params.notificationId).delete();
                        break;
                    case "none":
                        break;

                
                }
               
            }

        });
      
 })

 export const ServerErrorinformChatBot = functions.https.onRequest(async(req: functions.Request, res: functions.Response) => { 
    const linebot = require('linebot');
    const bot = linebot({
      channelId: LINE.channelId,
      channelSecret: LINE.channelSecret,
      channelAccessToken: LINE.channelAccessToken
  });
  var userID =[];
  const timestamp = moment().tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss.SSS");
    await admin.firestore().collection("person")
        .where("name","==","陳昱三")
        .get()  
        .then( async querySnapshot  =>{
            if (querySnapshot.empty) {
                console.log("NO LICENSE PLATE AVAILABLE");
            } else {
                for(var i = 0; i<querySnapshot.docs.length; i++){
                    userID.push(querySnapshot.docs[i].data().lineID);
                }
                console.log(userID);
                    var msg = `Server disconnect at ${timestamp}.\r\nPlease check Server.`
                    bot.push(userID, [
                        {
                            type:'text',
                            text:msg
                        }
                        ]).catch(err=>console.log("linbot push error:",err));
                    res.status(200).send("Server ERROR inform")
                    console.log("Server ERROR inform")
                
            }

        });
    
      
 })
