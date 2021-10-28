import * as functions from 'firebase-functions'
import * as firebaseAdmin from 'firebase-admin';
import * as cors from 'cors'
import { hex2string, stringToHex,hex2int8,hex2uint16,hex2uint8,paddingLeft } from '../transform/transform'
import { bucket} from '../bucketinformation';
import { APIKey} from '../Key/APIKey';
import { v4 as UUID } from 'uuid';
import axios from 'axios';
import { CompositionSettingsList } from 'twilio/lib/rest/video/v1/compositionSettings';
const moment = require('moment');
const tz = require('moment-timezone');


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
    var status = "" as string
    switch(raw_data){
        case "1":
            status = "有車";
            break;
        case "2":
            status = "無車";
            break;
        case "3":
            status = "未知";
            break;
        case "4":
            status = "強磁";
            break;
        case "5":
            status = "報平安";
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
    var format = cameraData.substr(0, 6)
    if (cameraData.substr(0,2) =='40'){//PKS7501
		format = "@"
	}
    switch(format){
        case "eeeeee":
            console.log("Picture decoding")
            var resolution = cameraData.split('ffc0')[1]
            var mac = cameraData.substr(6, 12) as string         
            var SN = cameraData.substr(18, 4) as string 
            var Resolution = `${hex2uint16(resolution.substr(10, 4))}x${hex2uint16(resolution.substr(6, 4))}` as string
            var imgURL = `https://firebasestorage.googleapis.com/v0/b/utl_image_update/o/${time.nowdate}%2F${mac}%2F${SN}-${time.hour}${time.min}-${Resolution}.jpg?alt=media&token=${uuid}`
            var updatetime =  moment().tz("Asia/Taipei").format("YYYYMMDDTHH:mm:ss.SSSZ")
            var timestamp = moment().valueOf()
            var data = {
                data:cameraData.substr(0) as string, 
                mac:mac, 
                SN:SN,
                Resolution:Resolution,
                imgURL: imgURL as string,              
                timestamp: timestamp as string,
                updatetime: updatetime  as string,
            }
            
            var device_status = await status_analysis(cameraData.substr(50,2))
            var parkinglot = paddingLeft(String(hex2int8(cameraData.substr(26, 4))),4)
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
                id:parkinglot as string,      
                timestamp: timestamp as string,                
                updatetime: updatetime  as string,
            }

           

            await database.collection("parkinglot").doc(parkinglot)
            .get()
            .then((doc) => {
                if (doc.exists) {
                    console.log("已存在車格資訊")
                    let mac1 = doc.data().mac.mac1
                    let mac2 = doc.data().mac.mac2
                    if(mac2 === null && mac1!=mac && mac1!=null){
                        let MAC = {
                            mac1:mac1,
                            mac2:mac
                        }
                        database.collection("parkinglot").doc(parkinglot)
                        .set({"mac":MAC},{merge:true})    
                    }else if(mac2 === null && mac1==null){
                        Parkinglot_parameter["mac"] = {mac1:mac,mac2:null};
                    }else{
                        
                    }
                } else {
                    console.log("建立新車格資訊")
                    Parkinglot_parameter["mac"] = {mac1:mac,mac2:null}
                }
                               
            }).catch(function(error) {
                console.log("Error getting document:", error);
            })
            
            Parkinglot_parameter[`${mac}_status`] = device_status ;   
            Parkinglot_parameter[mac] = imgURL;        
            Parkinglot_parameter[`${mac}_UploadTime`] = timestamp
            
            console.log(Parkinglot_parameter)


            await database.collection("parkinglot").doc(parkinglot)
            .set(Parkinglot_parameter,{merge:true})
            await database.collection("parkinglot").doc(parkinglot).collection(mac)
            .doc("history").collection(time.nowdate).doc(uuid)
            .set(Parkinglot_parameter)
            await database.collection("parkinglot").doc(parkinglot).collection(mac)
            .doc("history").collection(time.nowdate).doc(uuid)
            .set(data,{merge:true})
            
            await database.collection("parkinglot").doc(parkinglot).collection(mac).doc("history")
            .set({merge:true})


            /*垃圾開始 */
            /*跟垃圾一起的*/
            // const picturedata = {
            //     imgURL:data.imgURL,
            //     deviceMAC:data.mac,
            //     Side:"",
            //     licenseplate: "",
            //     devicestatus:"????",
            //     status:"uncheck",
            //     Time:time.nowdate + time.hour + time.min,
            //     Timestamp:time.timestamp

            // }
            // /*垃圾結束 */
            // if(data.mac==="f88a5ef5b8dd" || data.mac==="f88a5ef5baa9" || data.mac==="f88a5ef5b980"){
            //     if(hex2Decimal4(data.SN) % 2 == 0){
            //         data["side"] = "B";
            //         picturedata["Side"] = "B";
            //     }else{
            //         data["side"] = "F";
            //         picturedata["Side"] = "F";
            //     }
               
            //     database.collection("camera").doc(data.mac).collection(time.nowdate).doc(uuid)
            //         .set(data)
                    
            //     await database.collection("image").add(picturedata);
            // }
            // if(data.mac==="f88a5ef5ba90" || data.mac==="f88a5ef5ba9a" || data.mac==="f88a5ef5b9ae"){
            //     if(hex2Decimal4(data.SN) % 2 == 0){
            //         data["side"] = "B";
            //         picturedata["Side"] = "B";
            //     }else{
            //         data["side"] = "F";
            //         picturedata["Side"] = "F";
            //     }

            //     database.collection("camera").doc(data.mac).collection(time.nowdate).doc(uuid)
            //         .set(data)
                    
            //     await database.collection("image").add(picturedata);
            // }
     

            //     //03
            //     "f88a5ef5b8dd"
            //     "f88a5ef5ba90"
                 
            //     //02
            //     "f88a5ef5baa9"
            //     case "f88a5ef5ba9a"
                   
            //     //27
            //     "f88a5ef5b980"
            //     "f88a5ef5b9ae"
            
         
            
            /*垃圾結束 */


            /* 
            如果結束碼 = 順序碼 ，執行composePicture (X)
            改成找data中含有 ffd9 => JPG檔的結尾 直接使用HTTP上傳為FFD9(大寫)
            */
            if (data.data.indexOf("ffd9") != -1) {
                console.log("TCP or UDP server trigger")
                console.log(" find \"ffd9\" ")
                await composePicture(data,time,uuid)
            }
            else if (data.data.indexOf("FFD9") != -1) {
                console.log("HTTP trigger")
                console.log(" find \"FFD9\" ")
                await composePicture(data, time,uuid)
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
            var status = await PKS7501_status(cameraData.substr(48, 1))
            var PKS = {
                PKS7501_UploadTime:moment().valueOf(),
                parkinglot_status:status,
                AMR_sensor:{
                    Node:{
                        Mode:cameraData.substr(2,8),
                        Group:cameraData.substr(10, 2),
                        TIME_MDH:cameraData.substr(12, 6),
                        GEO:cameraData.substr(32, 8),
                        AREA:cameraData.substr(40, 2),
                        parkinglot_code:cameraData.substr(42, 2),
                        parkinglot:cameraData.substr(44, 4),
                        Status:status,
                        AMR:cameraData.substr(54, 16),
                        IR_Voltage:cameraData.substr(70, 2),
                        Solar_Voltage:cameraData.substr(72, 2),
                        Power:cameraData.substr(74, 2),
                        Temperature:cameraData.substr(76, 2),
                        Mac:cameraData.substr(78, 12),
                       
                    },
                    Router:{
                        TIME_MS:cameraData.substr(18, 4),
                        GEO:cameraData.substr(22, 10),
                        Solar_Voltage:cameraData.substr(90, 2),
                        Power:cameraData.substr(92, 2),
                        Temperature:cameraData.substr(94, 2),
                        Mac:cameraData.substr(96, 12),
                        SN:cameraData.substr(126, 4),
                        
                    },
                    NB_IoT:{
                        IMSI:cameraData.substr(108, 16),
                        Signal:cameraData.substr(124, 2),
                    },                    
                    
                }
                               
            }
            await database.collection("lot").doc(PKS.AMR_sensor.Node.parkinglot)
            .get()
            .then((doc) => {
                if (doc.exists===false) {
                    PKS["mac"] ={
                        mac1:null,
                        mac2:null
                    }
                }            
            })

            await database.collection("parkinglot").doc(PKS.AMR_sensor.Node.parkinglot)
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
        const picturedata = {
            imgURL:DATA.imgURL,
            deviceMAC:DATA.mac,
            Side:"side",
            licenseplate: "",
            devicestatus:"????",
            status:"uncheck",
            Time:TIME.nowdate + TIME.hour + TIME.min,
            Timestamp:TIME.timestamp

        }
        await database.collection("image").add(picturedata);
  
    } else {
        console.log("ERROR! : no pictire")
    }

}

export const UploadTime_Check = functions.firestore.document('parkinglot/{parkinglotId}').onUpdate(async (change, context) => {
    
    var newdata = change.after.data()
    var mac1 = newdata.mac.mac1
    var mac2 = newdata.mac.mac2
    var mac1_UploadTime = newdata[`${mac1}_UploadTime`]    
    var mac2_UploadTime = newdata[`${mac2}_UploadTime`]
    var PKS7501_UploadTime = newdata.PKS7501_UploadTime

    var UploadTime_Check = Math.abs(mac1_UploadTime-mac2_UploadTime)
    var parkinglot = context.params.parkinglotId

    console.log(`確認是否建立車格資料，${parkinglot}PKS200E 資料上傳相差時間為${UploadTime_Check}`)
    if(UploadTime_Check <= 60*1000 ){//1000 = 1s
      
        console.log(`${parkinglot}已建立待確認之車輛資料`)
        newdata.notification = "uncheck"
        newdata.licenseplate = ""
        newdata.parkinglot = parkinglot
        
        await database.collection("notification").add(newdata)

       
    }

})




