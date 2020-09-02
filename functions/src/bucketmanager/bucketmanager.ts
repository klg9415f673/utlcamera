import * as functions from 'firebase-functions'
import * as firebaseAdmin from 'firebase-admin';
import * as cors from 'cors'
import { bucket } from '../bucketinformation';
const moment = require('moment');
const tz = require('moment-timezone');
const corsHandler = cors({ origin: true })
const storage = firebaseAdmin.storage()       


export const bucketscheduler = functions.runWith({ memory: '2GB' }).https.onRequest((req: functions.Request, res: functions.Response) => {
    console.log("cameraService ", req.method)
    corsHandler(req, res, async () => {
        switch (req.method) {
            case "POST":
                break
            case "GET":
                break
            case "PUT":
                break
            case "DELETE":
                weeklydelete(req, res)
                break
            default:
                break
        }
    })
})

const weeklydelete = async (req: functions.Request, res: functions.Response) => {
    for (var i=22 ; i<29 ; i++){//清除四周前的資料"夾"
        const changeDate = new Date().getTime() + ( 1000 * 3600 * 24 * -1 * i );
        console.log("Start weekly bucket delete!!!")
        console.log(`bucket ${moment(changeDate).tz("Asia/Taipei").format("YYYYMMDD")} delete`)
        const Bucket = storage.bucket(bucket.update_bucket)
        Bucket.deleteFiles({
            prefix: moment(changeDate).tz("Asia/Taipei").format("YYYYMMDD")
        });
    }

    res.status(200).send("OK")
}


