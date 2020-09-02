import * as functions from 'firebase-functions'
import * as firebaseAdmin from 'firebase-admin';
import * as cors from 'cors'
import { hex2string, stringToHex } from '../transform/transform'
import { bucket} from '../bucketinformation';
import { v4 as UUID } from 'uuid';
const moment = require('moment');
const tz = require('moment-timezone');


const corsHandler = cors({ origin: true })
const database = firebaseAdmin.firestore()
const storage = firebaseAdmin.storage()

export const cameraService = functions.https.onRequest((req: functions.Request, res: functions.Response) => {
    var nowdate = new Date().getTime();
    var time = {
        nowdate: moment(nowdate).tz("Asia/Taipei").format("YYYYMMDD"),
        hour:moment(nowdate).tz("Asia/Taipei").format("HH"),
        min:moment(nowdate).tz("Asia/Taipei").format("mm")
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
    const data = {
        rec: cameraData.substr(0, 6) as string,
        mac: cameraData.substr(6, 4) as string,
        side: hex2string(cameraData.substr(10, 2)) as string,
        Side:cameraData.substr(10, 2) as string,
        SN: cameraData.substr(12, 4) as string,
        Geom:cameraData.substr(20,4) as string,
        RSSI:cameraData.substr(24,2) as string,
        status:cameraData.substr(26,4) as string,
        data: cameraData.substr(0) as string
    }
    database.collection("camera").doc("picture").set({merge:true})
    database.collection("camera").doc("picture").collection(data.mac).doc(data.SN).set({merge:true})
    await database.collection("camera").doc("picture").collection(data.mac).doc(data.SN).collection(time.nowdate).add(data)

    /* 
    如果結束碼 = 順序碼 ，執行composePicture (X)
    改成找data中含有 ffd9 => JPG檔的結尾 直接使用HTTP上傳為FFD9(大寫)
    */
    if (data.data.indexOf("ffd9") != -1) {
        console.log("TCP or UDP server trigger")
        console.log(" find \"ffd9\" ")
        await composePicture(data,time)
    }
    else if (data.data.indexOf("FFD9") != -1) {
        console.log("HTTP trigger")
        console.log(" find \"FFD9\" ")
        await composePicture(data, time)
    }

    res.status(200).send("OK")
}


// const updateCamera = async (req: functions.Request, res: functions.Response) => {
//     res.status(200).send("OK")
// }

// const deleteCamera = async (req: functions.Request, res: functions.Response) => {
//     res.status(200).send("OK")
// }

async function composePicture(DATA:any, TIME:any) {

    console.log("start compose picture")
    
    var path = `${TIME.nowdate}/${DATA.mac}-${DATA.side}-${DATA.SN}-${TIME.hour}${TIME.min}.jpg`
    var alldata = ""
    var final = ""
    await database.collection("camera").doc("picture").collection(DATA.mac).doc(DATA.SN).collection(TIME.nowdate).orderBy("data").get().then((snapshot) => {
        snapshot.forEach((doc) => {
            var data = doc.data().data.split( DATA.rec + DATA.mac + DATA.Side + DATA.SN);
            data.forEach((temp:string) => {
                            if (temp != "") {
                                alldata = alldata + temp.substr(4); // 8是順序碼的長度
                            }
                        })
            var Data = alldata.split(DATA.Geom + DATA.RSSI + DATA.status );
            final = Data.join('')
            console.log("final:" + final)
            console.log(doc.id,"=>",doc.data);
        });
    }).catch((err) => {
        console.log("ERROR! : ", err);
    })
    var data_buffer = Buffer.from(stringToHex(final));

    if (data_buffer.length != 0) {
        let uuid = UUID();
        const file = storage.bucket(bucket.update_bucket).file(path)
        file.save(
            data_buffer,
            {
                resumable: false,
                metadata: {
                    contentType: "image/jpg",
                    metadata: {
                        firebaseStorageDownloadTokens: uuid
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




