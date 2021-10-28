import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import {twilio,LINE,TWSMS} from './imformrConfig';
const moment = require('moment');
const tz = require('moment-timezone');

export const BillinformTWSMS = functions.firestore.document('person/{personId}/bill/{billId}').onCreate(async (snap, context) => {
    var data= snap.data();
    await admin.firestore().collection("person").doc(context.params.personId)
          .get()
          .then((doc) => {
            if(doc.data().phone !== undefined ||doc.data().phone != "" ||doc.data().phone !== null){
                const mobile = '0'+doc.data().phone.substr(4,9)
                const msg = `${doc.data().name}先生/小姐，您停於${data.parkinglot}的車輛${doc.data().licenseplate}，已在${moment(data.leavetime).tz("Asia/Taipei").format("YYYY/MM/DD HH:mm:ss")}離開`
                var query = `username=${TWSMS.account}&password=${TWSMS.passward}&mobile=${mobile}&message=${msg}`
                query = encodeURI(query)
                const url = `http://api.twsms.com/json/sms_send.php?${query}` 
                console.log(doc.id, '=>' , doc.data())
                axios.get(url)
                    .then(async res=>{console.log("TW SMS send")})
                    
            }else{
                console.log(`${doc.id} doesn\'t have phone`)
            }
        })
})

export const BillinformChatBot = functions.firestore.document('person/{personId}/bill/{billId}').onCreate(async (snap, context) => { //僅通報不透過webhook
    const linebot = require('linebot');
    const bot = linebot({
        channelId: LINE.channelId,
        channelSecret: LINE.channelSecret,
        channelAccessToken: LINE.channelAccessToken
    });
    var data= snap.data();
   
    await admin.firestore().collection("person").doc(context.params.personId)
        .get()  
        .then((doc)  =>{
            var day =  Math.floor(Number(data.totaltime)/1000 / 60 / 60 / 24)
            var hr  = Math.floor(Number(data.totaltime)/1000 / 60 / 60 -day*24)
            var min = Math.floor(Number(data.totaltime)/1000 / 60) -(hr+day*24)*60
            var sec = Math.floor(Number(data.totaltime)/1000)-(min+(hr+day*24)*60)*60
            var msg = `ParkingLot:${data.parkinglot}\r\nName:${doc.data().name}\r\nCar:${doc.data().licenseplate}\r\nLeaveTime:${moment(data.leavetime).tz("Asia/Taipei").format("YYYY/MM/DD HH:mm:ss")}\r\nParkingTime:${day}天${hr}時${min}分${sec}秒`
            console.log(msg)
            bot.push(doc.data().lineID, [
                {
                    type:'text',
                    text:msg
                },
                {
                    type:'image',
                    originalContentUrl:data.image1,
                    previewImageUrl:data.image1
                },
                {
                    type:'image',
                    originalContentUrl:data.image2,
                    previewImageUrl:data.image2
                }
            
                ]).catch(err=>console.log("linbot push error:",err));
            console.log("User Bill inform")

        });
      
 })

export const ParkinglotErrorChatBot = functions.firestore.document('notify/{notifyId}').onUpdate(async (change, context) => { //僅通報不透過webhook
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
   
        var msg = `ParkingLot:${context.params.notifyId} abnmormal.\r\nTime:${previous.updatetime}`
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
        console.log("Admin inform")
       
        await admin.firestore().collection("notify").doc(context.params.notifyId).delete();
          
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

 export const ImageErrorinformChatBot = functions.firestore.document('notify/{lotId}').onUpdate(async (change, context) => { //僅通報不透過webhook
    const linebot = require('linebot');
    const bot = linebot({
      channelId: LINE.channelId,
      channelSecret: LINE.channelSecret,
      channelAccessToken: LINE.channelAccessToken
  });
    var previous= change.after.data();
    var userID =[];
    const timestamp = moment().tz("Asia/Taipei").format("YYYY/MM/DD HH:mm:ss");
    await admin.firestore().collection("person")
        .where("role","==","admin")
        .get()
        .then( async(querySnapshot)  =>{
           
            for(var i = 0; i<querySnapshot.docs.length; i++){
                userID.push(querySnapshot.docs[i].data().lineID);
            }
            console.log(userID);
            
            var msg = `車格${context.params.lotId}於${timestamp}有異常狀況無法辨識車牌，請管理人員確認`
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
            console.log("Admin inform")

            await admin.firestore().collection("notify").doc(context.params.lotId).collection("history").add(previous);
                      
        });
      
 })