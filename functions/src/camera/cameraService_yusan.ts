import * as functions from 'firebase-functions'
import * as firebaseAdmin from 'firebase-admin';
import * as cors from 'cors'
import { hex2string, stringToHex,hex2int8,hex2uint16,hex2uint8,hex2Decimal4 } from '../transform/transform'
import { bucket} from '../bucketinformation';
import { APIKey} from '../Key/APIKey';
import { v4 as UUID } from 'uuid';
import axios from 'axios';
import { CompositionSettingsList } from 'twilio/lib/rest/video/v1/compositionSettings';
const moment = require('moment');
const tz = require('moment-timezone');

import {twilio,LINE,TWSMS} from '../user/imformrConfig';

import vision from '@google-cloud/vision/build/src';
import Pricing = require('twilio/lib/rest/Pricing');
const client = new vision.ImageAnnotatorClient();

const corsHandler = cors({ origin: true })
const database = firebaseAdmin.firestore()
const storage = firebaseAdmin.storage()

async function status_analysis(raw_data:string){
    let status = "" as string
    switch(raw_data){
        case "00":
            status = "初始化";
            break;
        case "01":
            status = "占用";
            break;
        case "02":
            status = "空位";
            break;  
        case "03":
            status = "未知";
            break;
        case "04":
            status = "磁場溢出";
            break;
        case "05":
            status = "報平安";
            break;

    }

    return status;
}

async function PKS7501_status(raw_data:string){
    let status = "" as string
    switch(raw_data){
        case "00":
            status = "進車";
            break;
        case "01":
            status = "出車";
            break;
    }

    return status;
}

export const cameraService = functions.https.onRequest((req: functions.Request, res: functions.Response) => {
    var nowdate = new Date().getTime();
    var time = {
        nowdate: moment(nowdate).tz("Asia/Taipei").format("YYYYMMDD"),
        hour:moment(nowdate).tz("Asia/Taipei").format("HH"),
        min:moment(nowdate).tz("Asia/Taipei").format("mm"),
        timestamp:moment(nowdate).tz("Asia/Taipei").valueOf()
    }
    console.log("cameraService ", req.method)
    corsHandler(req, res, async () => {
        switch (req.method) {
            case "POST":
                createCamera(req, res, time)
                break
            case "GET":
                break
            case "PUT":
                // creat(req, res)
                break
            case "DELETE":
                // deleteCamera(req, res)
                break
            default:
                break
        }
    })
})

const createCamera = async (req: functions.Request, res: functions.Response, time: any) => {
    console.log("req body : ", req.body)
    const cameraData = req.body.cameraData.cameraData; 
    const uuid = req.body.UUID;
    var format = cameraData.substr(0, 6);
    if (cameraData.substr(0,2) =='40'){//PKS7501
		format = "@";
	}
    switch(format){
        case "eeeeee":
            console.log("Picture decoding")            
            var plate = req.body.plate.split('^')[1];
            if(plate==="none"){plate=null};
            var AI_status = req.body.plate.split('^')[0];//還沒想到用處
            var resolution = cameraData.split('ffc0')[1];
            var mac = cameraData.substr(6, 12) as string;    
            var SN = cameraData.substr(18, 4) as string;
            var Resolution = `${hex2uint16(resolution.substr(10, 4))}x${hex2uint16(resolution.substr(6, 4))}` as string;
            var imgURL = `https://firebasestorage.googleapis.com/v0/b/utl_image_update/o/${time.nowdate}%2F${mac}%2F${SN}-${time.hour}${time.min}-${Resolution}.jpg?alt=media&token=${uuid}`;
            var updatetime =  moment().tz("Asia/Taipei").format("YYYYMMDDTHH:mm:ss.SSSZ");
            var timestamp = moment().valueOf();
            var data = {
                data:cameraData.substr(0) as string, 
                mac:mac, 
                SN:SN,
                Resolution:Resolution,
                imgURL: imgURL as string,              
                timestamp: timestamp as string,
                updatetime: updatetime  as string,
            }
            
            var parkinglot = cameraData.substr(26, 4)
            var Parkinglot_parameter = {
                Device_paramater:{
                    Front:{
                        AMR_F:hex2uint16(cameraData.substr(30,4)) as string,
                        RSSI_F:hex2int8(cameraData.substr(38,2)) as string,
                        SolarVoltage_F:cameraData.substr(42,2)/10 as Number,
                        Temperature_F:cameraData.substr(46,2) as Number,
                    },
                    Back:{
                        AMR_B:hex2uint16(cameraData.substr(34,4)) as string,
                        RSSI_B:hex2int8(cameraData.substr(40,2)) as string,
                        SolarVoltage_B:cameraData.substr(44,2)/10 as Number,
                        Temperature_B:cameraData.substr(48,2) as Number,
                    },
           
                },                            
                timestamp: timestamp as string,                
                updatetime: updatetime  as string,                
            }

           

            await database.collection("lot").doc(parkinglot)
            .get()
            .then((doc) => {
                if (doc.exists) {
                    console.log("已存在車格資訊");
                    let mac1 = doc.data().mac.mac1;
                    let mac2 = doc.data().mac.mac2;
                    if(mac1 != null){
                        if(mac2 === null && mac1!=mac){
                            let MAC = {
                                mac1:mac1,
                                mac2:mac
                            }
                            database.collection("lot").doc(parkinglot)
                            .set({"mac":MAC},{merge:true});
                        };
                    }else{
                        Parkinglot_parameter["mac"] = {mac1:mac,mac2:null};
                    }
                } else {
                    console.log("建立新車格資訊");
                    Parkinglot_parameter["mac"] = {mac1:mac,mac2:null};
                }
                               
            }).catch(function(error) {
                console.log("Error getting document:", error);
            })
            
            Parkinglot_parameter[`${mac}_status`] = await status_analysis(cameraData.substr(50,2)) ;   
            Parkinglot_parameter[mac] = imgURL;        
            Parkinglot_parameter[`${mac}_UploadTime`] = timestamp;
            Parkinglot_parameter[`${mac}_plate`] = plate;
            
            console.log(Parkinglot_parameter);


            await database.collection("lot").doc(parkinglot)
            .set(Parkinglot_parameter,{merge:true});
            await database.collection("lot").doc(parkinglot).collection(mac)
            .doc("history").collection(time.nowdate).doc(uuid)
            .set(Parkinglot_parameter);
            await database.collection("lot").doc(parkinglot).collection(mac)
            .doc("history").collection(time.nowdate).doc(uuid)
            .set(data,{merge:true})
            await database.collection("lot").doc(parkinglot).collection(mac).doc("history")
            .set({merge:true});


            /* 
            如果結束碼 = 順序碼 ，執行composePicture (X)
            改成找data中含有 ffd9 => JPG檔的結尾 直接使用HTTP上傳為FFD9(大寫)
            */
            if (data.data.indexOf("ffd9") != -1) {
                console.log("TCP or UDP server trigger");
                console.log(" find \"ffd9\" ");
                await composePicture(data,time,uuid);
            }
            else if (data.data.indexOf("FFD9") != -1) {
                console.log("HTTP trigger");
                console.log(" find \"FFD9\" ");
                await composePicture(data, time,uuid);
            }
            break;
        case "ffffff":
            console.log("Device decoding")
            var Device = {
                mac:{
                    mac: cameraData.substr(6, 12) as string,
                    mac_F: cameraData.substr(18, 12) as string,
                    mac_B: cameraData.substr(30, 12) as string}, 
                Device:{
                    Longitude:cameraData.substr(42,10) as string,
                    Latitude:cameraData.substr(52,8) as string,
                    Height:hex2int8(cameraData.substr(60,2)) as string,
                    Power:(2+(hex2uint8(cameraData.substr(62,2))/100)).toFixed(2) as string,
                    IMEI:cameraData.substr(64,16) as string,
                    IMSI:cameraData.substr(80,16) as string,                
                    CSQ:cameraData.substr(96,2) as string},   
                Version:{
                    DeviceType:hex2string(cameraData.substr(98,16)) as string,   
                    HardwareVersion:hex2string(cameraData.substr(114,6)) as string,   
                    BLEVersion:hex2string(cameraData.substr(120,6)) as string,    
                    Firmware:hex2string(cameraData.substr(126,8)) as string},       
                notification: null ,         
                timestamp: moment().valueOf() as string,
                updatetime: moment().tz("Asia/Taipei").format("YYYY/MM/DDTHH:mm:ss.SSSZ")  as string,
                
            }
            var OldData = await database.collection("camera").doc(Device.mac.mac).get()
            try{
                if(OldData.exists === false || OldData.data().Device ===undefined || OldData.data().Device.Latitude!==Device.Device.Latitude || OldData.data().Device.Longitude!==Device.Device.Longitude){
                    var Lat = `${Device.Device.Latitude.substr(0,2)}.${Device.Device.Latitude.substr(2,6)}`;
                    var Lng = `${Device.Device.Longitude.substr(0,4)}.${Device.Device.Longitude.substr(4,6)}`;
                    
                    await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${Lat},${Lng}&key=${APIKey.GeocodingAPI}`)
                        .then(async res=>{
        
                            const Site ={ 
                                Site : {
                                    District:res.data.results[0].address_components[1].long_name,
                                    City:res.data.results[0].address_components[2].long_name,
                                    Country:res.data.results[0].address_components[3].long_name
                                }
                            }
                            await database.collection("camera").doc(Device.mac.mac)
                            .set(Site,{merge:true})
                                            
                        })
                }
            }catch(error){
                console.log(error)
            }
            

            await database.collection("camera").doc(Device.mac.mac)
            .set(Device,{merge:true})

            break;
        case "@":
            console.log("PKS7501 decoding")
            var PKS = {               
                PKS7501_UploadTime:moment().valueOf(),
                //簡易資料模擬解析 40 00 0001(@ 進車 車格0001)
                PKS7501_status:await PKS7501_status(cameraData.substr(2,2)), 
                parkinglot:cameraData.substr(4,4)
            }
            await database.collection("lot").doc(PKS.parkinglot)
            .get()
            .then((doc) => {
                if (doc.exists===false) {
                    PKS["mac"] ={
                        mac1:null,
                        mac2:null
                    }
                }            
            })
           
            // var PKS = {               
              
                //待完整資料上傳在解掉//
                // AMR_sensor:{
                //     Node:{
                //         Mode:cameraData.substr(2,8),
                //         Group:cameraData.substr(10, 2),
                //         TIME_MDH:cameraData.substr(12, 6),
                //         GEO:cameraData.substr(32, 8),
                //         AREA:cameraData.substr(40, 2),
                //         parkinglot_code:cameraData.substr(42, 2),
                //         parkinglot:cameraData.substr(44, 4),
                //         Status:cameraData.substr(48, 6),
                //         AMR:cameraData.substr(54, 16),
                //         IR_Voltage:cameraData.substr(70, 2),
                //         Solar_Voltage:cameraData.substr(72, 2),
                //         Power:cameraData.substr(74, 2),
                //         Temperature:cameraData.substr(76, 2),
                //         Mac:cameraData.substr(78, 12),
                       
                //     },
                //     Router:{
                //         TIME_MS:cameraData.substr(18, 4),
                //         GEO:cameraData.substr(22, 10),
                //         Solar_Voltage:cameraData.substr(90, 2),
                //         Power:cameraData.substr(92, 2),
                //         Temperature:cameraData.substr(94, 2),
                //         Mac:cameraData.substr(96, 12),
                //         SN:cameraData.substr(126, 4),
                        
                //     },
                //     NB_IoT:{
                //         IMSI:cameraData.substr(108, 16),
                //         Signal:cameraData.substr(124, 2),
                //     },                    
                    
                // }
                               
            // }
            // await database.collection("parkinglot").doc(PKS.AMR_sensor.Node.parkinglot)
            // .set(PKS,{merge:true})
            await database.collection("lot").doc(PKS.parkinglot)
            .set(PKS,{merge:true})

            break;
    }
    
    res.status(200).send("OK")
}


// const updateCamera = async (req: functions.Request, res: functions.Response) => {
//     res.status(200).send("OK")
// }

// const deleteCamera = async (req: functions.Request, res: functions.Response) => {
//     res.status(200).send("OK")
// }

async function composePicture(DATA:any, TIME:any,UUID:any) {

    console.log("start compose picture")
    
    var path = `${TIME.nowdate}/${DATA.mac}/${DATA.SN}-${TIME.hour}${TIME.min}-${DATA.Resolution}.jpg`
    var alldata = ""
    var data = DATA.data.split( DATA.data.substr(0,22));
    data.forEach((temp:string) => {
                    if (temp != "") {
                        alldata = alldata + temp.substr(30); 
                    }
                })
    var data_buffer = Buffer.from(stringToHex(alldata));

    if (data_buffer.length != 0) {
        const file = storage.bucket(bucket.update_bucket).file(path)
        file.save(
            data_buffer,
            {
                resumable: false,
                metadata: {
                    contentType: "image/jpg",
                    metadata: {
                        firebaseStorageDownloadTokens: UUID
                      }
                }
            }, err => {
                if (err) {
                    console.log("ERROR! :", err)
                } else {
                    
                    file.makePublic()
                    console.log("success");
                }
            }
        )
  
    } else {
        console.log("ERROR! : no pictire")
    }

}

export const UploadTime_Check = functions.firestore.document('lot/{lotId}').onUpdate(async (change, context) => {
    
    var newdata = change.after.data()
    console.log(newdata)
    var mac1 = newdata.mac.mac1
    var mac2 = newdata.mac.mac2
    var mac1_UploadTime = newdata[`${mac1}_UploadTime`]    
    var mac2_UploadTime = newdata[`${mac2}_UploadTime`]
    var mac1_plate = newdata[`${mac1}_plate`].split("-").join("")    
    var mac2_plate = newdata[`${mac2}_plate`].split("-").join("")
    var PKS7501_UploadTime = newdata.PKS7501_UploadTime

    var UploadTime_Check = Math.abs(mac1_UploadTime-mac2_UploadTime)
    var PKS7501_Check = Math.abs(PKS7501_UploadTime-mac2_UploadTime)
    var lotID = context.params.lotId

    console.log(`確認是否建立車格資料，${lotID}`)
    if(mac1_UploadTime!= null && mac2_UploadTime !=null && PKS7501_UploadTime != null){
        if(UploadTime_Check <= 2*60*1000 && PKS7501_Check <= 2*60*1000){//1000 = 1s
            switch (newdata.PKS7501_status){
                case "進車":
                    var parkinglot = {
                        parkinglot_status : "占用",
                        begintime:moment().valueOf(),
                        plate:""
                    }
                    parkinglot[`${mac1}_UploadTime`] = null
                    parkinglot[`${mac2}_UploadTime`] = null
                    parkinglot["PKS7501_UploadTime"] = null
    
                    if(mac1_plate == mac2_plate){
                        parkinglot["plate"]=mac1_plate;
                    }

                    //下面是夢想中的第三方確認，調用google vision api
                    //else{
                    //     var url1 = newdata[mac1]
                    //     var text1 = url1.split("https://firebasestorage.googleapis.com/v0/b/utl_image_update/o/")[1]
                    //     const [detection1] = await client.textDetection(`gs://${bucket.update_bucket}/${text1.split("%2F")[0]}/${text1.split("%2F")[1]}/${text1.split("%2F")[2].split("?alt=media")[0]}`)
                    //     const Text1 = detection1.textAnnotations[0];
                    //     var url2 = newdata[mac2]
                    //     var text2 = url2.split("https://firebasestorage.googleapis.com/v0/b/utl_image_update/o/")[1]
                    //     const [detection2] = await client.textDetection(`gs://${bucket.update_bucket}/${text2.split("%2F")[0]}/${text2.split("%2F")[1]}/${text2.split("%2F")[2].split("?alt=media")[0]}`)
                    //     const Text2 = detection2.textAnnotations[0];
                        
                    //     if(+Text1 === 0 && +Text2 != 0){
    
                    //         if(Text2[0].description.split("-").join("").split(" ").join("").split('\n')[0]==mac1_plate){
                    //             parkinglot["plate"] = mac1_plate
                    //         }else if(Text2[0].description.split("-").join("").split(" ").join("").split('\n')[0]==mac2_plate){
                    //             parkinglot["plate"] = mac2_plate
                    //         }
    
                    //     }else if(+Text1 != 0 && +Text2 === 0){
    
                    //         if(Text1[0].description.split("-").join("").split(" ").join("").split('\n')[0]==mac1_plate){
                    //             parkinglot["plate"] = mac1_plate
                    //         }else if(Text1[0].description.split("-").join("").split(" ").join("").split('\n')[0]==mac2_plate){
                    //             parkinglot["plate"] = mac2_plate
                    //         }
    
                    //     }else if(+Text1 != 0 && +Text2 != 0){
    
                    //         if(Text2[0].description.split("-").join("").split(" ").join("").split('\n')[0]==mac1_plate){
                    //             parkinglot["plate"] = mac1_plate
                    //         }else if(Text2[0].description.split("-").join("").split(" ").join("").split('\n')[0]==mac2_plate){
                    //             parkinglot["plate"] = mac2_plate
                    //         }
    
                    //         if(Text1[0].description.split("-").join("").split(" ").join("").split('\n')[0]==mac1_plate){
                    //             parkinglot["plate"] = mac1_plate
                    //         }else if(Text1[0].description.split("-").join("").split(" ").join("").split('\n')[0]==mac2_plate){
                    //             parkinglot["plate"] = mac2_plate
                    //         }
    
                    //     }
                          
                    // }

                    console.log(parkinglot)
                    if(parkinglot["plate"]==""){
                        await database.collection("notify").doc(lotID).set(newdata,{merge:true})
                        await database.collection("lot").doc(lotID).set(parkinglot,{merge:true})
                    }else{
                        const person = await database.collection("person")
                        .where("licenseplate","==",parkinglot["plate"])
                        .get()
                        person.forEach(async doc =>{   
                            //TWSMS推播--------------------------------->>>>>>
                            if(doc.data().phone !== undefined ||doc.data().phone !== "" ||doc.data().phone !== null){
                                const mobile = '0'+doc.data().phone.substr(4,9)
                                const msg = `${doc.data().name}先生/小姐，您的車輛${doc.data().licenseplate}於${moment(parkinglot.begintime).tz("Asia/Taipei").format("YYYY/MM/DD HH:mm:ss")}停入${context.params.lotId}車格中`
                                var query = `username=${TWSMS.account}&password=${TWSMS.passward}&mobile=${mobile}&message=${msg}`
                                query = encodeURI(query)
                                const url = `http://api.twsms.com/json/sms_send.php?${query}` 
                                console.log(doc.id, '=>' , doc.data())
                                                      
                                axios.get(url)
                                    .then(async res=>{
                                        console.log("TW SMS send")
                                    })
                                    .catch(err=>{
                                        console.log('axios error:',err)
                                    })
                                       
                            }else{
                                console.log(`${doc.id} doesn\'t have phone`)
                            }
                            //TWSMS推播<<<<<<<<<--------------------------------


                            //CHATBOT推播------------------------------->>>>>>>>
                            const linebot = require('linebot'); 
                            const bot = linebot({
                              channelId: LINE.channelId,
                              channelSecret: LINE.channelSecret,
                              channelAccessToken: LINE.channelAccessToken
                            });
                            
                            var msg = `ParkingLot:${context.params.lotId}\r\nName:${doc.data().name}\r\nCar:${doc.data().licenseplate}\r\nTime:${moment(parkinglot.begintime).tz("Asia/Taipei").format("YYYY/MM/DD HH:mm:ss")}`
                            bot.push(doc.data().lineID, [
                                {
                                    type:'text',
                                    text:msg
                                },
                                {
                                    type:'image',
                                    originalContentUrl:newdata[mac1],
                                    previewImageUrl:newdata[mac1]
                                },
                                {
                                    type:'image',
                                    originalContentUrl:newdata[mac2],
                                    previewImageUrl:newdata[mac2]
                                }
                            
                                ]).catch(err=>console.log("linbot push error:",err));
                            console.log("User Bill inform")

                            //CHATBOT推播<<<<<<<<<----------------------------


                           


                        await database.collection("lot").doc(lotID).set(parkinglot,{merge:true})
                        })
                   
                    }
                    break;
    
                case "出車":
                    parkinglot = {
                        parkinglot_status : "空位",
                        begintime:null,
                        plate:""
                    };     

                    parkinglot[`${mac1}_UploadTime`] = null
                    parkinglot[`${mac2}_UploadTime`] = null
                    parkinglot["PKS7501_UploadTime"] = null

                    
    
                    await database.collection("person")
                        .where("licenseplate","==",newdata.plate)
                        .get()  
                        .then( async querySnapshot  =>{
                            var endtime = moment().valueOf()
                            var bill = {
                                parkinglot:lotID,
                                begintime :newdata.begintime,
                                leavetime : endtime,
                                totaltime : endtime - newdata.begintime ,
                                image1:newdata[mac1],
                                image2:newdata[mac2]      
            
                            }
                            console.log(parkinglot)
                            await database.collection("person").doc(querySnapshot.docs[0].id).collection("bill").add(bill)
                            await database.collection("lot").doc(lotID).set(parkinglot,{merge:true})
                        });
                  
                    break;
                
                default:
                    console.log("PKS7501尚無上傳狀態")
                    break;
            }
    

        };
       
    };

})




