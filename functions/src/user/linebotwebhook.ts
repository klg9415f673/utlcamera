import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {LINE} from './imformrConfig';
import { runInNewContext } from 'vm';
const linebot = require('linebot');
const bot = linebot({
    channelId: LINE.channelId,
    channelSecret: LINE.channelSecret,
    channelAccessToken: LINE.channelAccessToken
});

export const Linewebhook  = functions.https.onRequest((req: functions.Request, res: functions.Response) => {
    
    var event = req.body.events[0]   
    var EVENT = {
        userId : event.source.userId,
        timestamp : event.timestamp,
        text:event.message.text
    }
   
    switch (event.type){
        case "message":
        const message = event.message;
        switch (message.type) {
            case 'text':
                textprocess(req, res, EVENT);
                break;
              
            case 'image':
                ERROR(req,res,EVENT,message.type);
                break;
              
            case 'video':
                ERROR(req,res,EVENT,message.type);
                break;
              
            case 'audio':
                ERROR(req,res,EVENT,message.type);
                break;
            
            case 'location':
                ERROR(req,res,EVENT,message.type);
                break;
              
            case 'sticker':
                ERROR(req,res,EVENT,message.type);
                break;
             
            default:
                console.log("message type is undefined");
                res.status(200).send("message type is undefined");
                break;
            }
            break;
            
        default:
            console.log("EVENT type is undefined");
            res.status(200).send("EVENT type is undefined");
            break;
    }
 
   
})

const textprocess = async (req: functions.Request, res: functions.Response,event:any)=>{
    var data = await recContext(event.text);
    console.log(data)
    bindmember(req,res,event,data);

}

function recContext(text:string){
    var option = "";
    var name = "";
    var phone = "";
    var licenseplate = "";
    if(text.indexOf("姓名") !=-1 || text.indexOf("name")!=-1){
        name = text.split("姓名").join("");
        name = name.split("name").join("");
        name = name.split(":").join("");
        phone = phone.split("：").join("");
        name = name.split(" ").join("");
      
        option = "name";

    }else if(text.indexOf("車牌") !=-1 || text.indexOf("licenseplate")!=-1){
        licenseplate = text.split("車牌").join("");
        licenseplate = licenseplate.split("licenseplate").join("");
        licenseplate = licenseplate.split(":").join("");
        licenseplate = licenseplate.split("：").join("");
        licenseplate = licenseplate.split(" ").join("");
        option = "licenseplate";

    }else if(text.indexOf("電話") !=-1 || text.indexOf("phone")!=-1 || text.indexOf("手機")!=-1){
        phone = text.split("電話").join("");
        phone = phone.split("phone").join("");
        phone = phone.split("手機").join("");
        phone = phone.split(":").join("");
        phone = phone.split("：").join("");
        phone = phone.split(" ").join("");
        option = "phone";

    }else{
        option = "creation"
    }

    return {option,name,licenseplate,phone}

}

const bindmember = async (req: functions.Request, res: functions.Response,event:any,data:any)=>{
    var DATA = {
        lineID:event.userId,
        role:'user',
        name:data.name,
        licenseplate:data.licenseplate,
        phone:data.phone?`+886${data.phone.substr(1,9)}`:null,
        timestamp: event.timestamp

    }
    await admin.firestore().collection("person")
        .where("lineID","==",event.userId)
        .get()
        .then( async querySnapshot  =>{
            if (querySnapshot.empty) {
                console.log("Create User");
                admin.firestore().collection("person").add(DATA);
                bot.push(DATA.lineID,"帳號已建立，感謝您的註冊，謝謝");
            }else{
                switch(data.option){
                    case "name":
                        admin.firestore().collection("person").doc(querySnapshot.docs[0].id).update({name:DATA.name});
                        console.log(`${querySnapshot.docs[0].id} update name`);
                        res.status(200).send("name update");
                        bot.push(DATA.lineID,"姓名已更新");
                        break;
                    case "licenseplate":
                        admin.firestore().collection("person").doc(querySnapshot.docs[0].id).update({licenseplate:DATA.licenseplate});
                        console.log(`${querySnapshot.docs[0].id} update licenseplate`);
                        res.status(200).send("licenseplate update");
                        bot.push(DATA.lineID,"車牌已更新");
                        break;
                    case "phone":
                        admin.firestore().collection("person").doc(querySnapshot.docs[0].id).update({phone:DATA.phone});
                        console.log(`${querySnapshot.docs[0].id} update phone`);
                        res.status(200).send("phone update");
                        bot.push(DATA.lineID,"手機已更新");
                        break;
                    case "undefined":
                        var msg= `抱歉，我聽不懂你說的話\r\n如有問題請聯絡客服人員，感謝您的配合，謝謝。`
                        bot.push(DATA.lineID,msg)
                        res.status(200).send("context error");
                        break;

                }
                
            }
        })

}

const ERROR = (req: functions.Request, res: functions.Response,event:any, type: string)=>{
    console.log(`The message type${type} is not ready`)
    var msg= `抱歉，我聽不懂你說的話\r\n如有問題請聯絡客服人員，感謝您的配合，謝謝。`
    bot.push(event.userId,msg)
    res.status(200).send("The message type is not ready");

}