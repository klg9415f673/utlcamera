import * as functions from 'firebase-functions'
import * as firebaseAdmin from 'firebase-admin';
import * as cors from 'cors'
import { hex2string, stringToHex,hex2int8,hex2uint16,hex2uint8 } from '../transform/transform'
import { bucket} from '../bucketinformation';
import { APIKey} from '../Key/APIKey';
import { v4 as UUID } from 'uuid';
import axios from 'axios';
const moment = require('moment');
const tz = require('moment-timezone');


const corsHandler = cors({ origin: true })
const database = firebaseAdmin.firestore()
const storage = firebaseAdmin.storage()

function status_analysis(raw_data){
    this.raw_data = raw_data
    switch(raw_data){
        case "0100":
            this.status = "初始化";
            break;
        case "0200":
            this.status = "占用";
            break;
        case "0300":
            this.status = "空位";
            break;
        case "0400":
            this.status = "磁場溢出";
            break;
        case "0500":
            this.status = "報平安";
            break;

    }

    return this.status;
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
    const cameraData = req.body.cameraData.cameraData
    var format = cameraData.substr(0, 6)
    switch(format){
        case "eeeeee":
        
            var uuid = UUID();
            var resolution = cameraData.split('ffc0')[1]
            var mac = cameraData.substr(6, 12) as string
            var side = hex2string(cameraData.substr(18, 2)) as string               
            var SN = cameraData.substr(20, 4) as string 
            var Resolution = `${hex2uint16(resolution.substr(10, 4))}x${hex2uint16(resolution.substr(6, 4))}` as string
            
            var data = {
                data:cameraData.substr(0) as string,  
                Resolution:Resolution,
                mac: mac,
                side: side,                
                SN: SN,   
                AMR:hex2uint16(cameraData.substr(28,4)) as string,
                AMR_F:hex2uint16(cameraData.substr(32,4)) as string,
                AMR_B:hex2uint16(cameraData.substr(36,4)) as string,
                RSSI_F:hex2int8(cameraData.substr(40,2)) as string,
                RSSI_B:hex2int8(cameraData.substr(42,2)) as string,
                SolarVoltage:cameraData.substr(44,2)/10 as Number,
                Temperature:cameraData.substr(46,2) as string,                
                status:cameraData.substr(48,4) as string, 
                imgURL:`https://firebasestorage.googleapis.com/v0/b/utl_image_update/o/${time.nowdate}%2F${mac}%2F${side}%2F${SN}-${time.hour}${time.min}-${Resolution}.jpg?alt=media&token=${uuid}` as string,              
                timestamp: moment().tz("Asia/Taipei").valueOf() as string,
                updatetime: moment().tz("Asia/Taipei").format("YYYYMMDDTHH:mm:ss.SSSZ")  as string,
                
                
            }

            var device = {
                mac:{mac: cameraData.substr(6, 12) as string},
                AMR:{
                    AMR:hex2uint16(cameraData.substr(28,4)) as string,
                    AMR_F:hex2uint16(cameraData.substr(32,4)) as string,
                    AMR_B:hex2uint16(cameraData.substr(36,4)) as string},
                RSSI:{
                    RSSI_F:hex2int8(cameraData.substr(40,2)) as string,
                    RSSI_B:hex2int8(cameraData.substr(42,2)) as string},
                Device:{
                    SolarVoltage:cameraData.substr(44,2)/10 as Number,
                    Temperature:cameraData.substr(46,2) as string},                
                status:status_analysis(cameraData.substr(48,4)) as string,               
                timestamp: moment().valueOf() as string,
                updatetime: moment().tz("Asia/Taipei").format("YYYYMMDDTHH:mm:ss.SSSZ")  as string
            }


            database.collection("camera").doc(data.mac)
            .set(device,{merge:true})
            database.collection("camera").doc(data.mac).collection(time.nowdate).doc(uuid)
            .set(data)
        
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
                timestamp: moment().valueOf() as string,
                updatetime: moment().tz("Asia/Taipei").format("YYYY/MM/DDTHH:mm:ss.SSSZ")  as string
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
    
    var path = `${TIME.nowdate}/${DATA.mac}/${DATA.side}/${DATA.SN}-${TIME.hour}${TIME.min}-${DATA.Resolution}.jpg`
    var alldata = ""
    var data = DATA.data.split( DATA.data.substr(0,24));
    data.forEach((temp:string) => {
                    if (temp != "") {
                        alldata = alldata + temp.substr(28); // 4是順序碼的長度
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
            Side:DATA.side,
            licenseplate: "",
            devicestatus:DATA.status,
            status:"uncheck",
            Time:TIME.nowdate + TIME.hour + TIME.min,
            Timestamp:TIME.timestamp

        }
        await database.collection("image").add(picturedata);
    } else {
        console.log("ERROR! : no pictire")
    }

}




