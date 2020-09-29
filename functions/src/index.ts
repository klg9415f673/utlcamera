import * as firebaseAdmin from 'firebase-admin';
firebaseAdmin.initializeApp();


/***************** 

camera

*****************/

import * as camera from './camera/cameraService'
export const cameraService = camera.cameraService

// import * as detect from './detect/LPdetect'
// export const LPdetect = detect.LPdetect  //車牌辨識，暫不啟用

import * as manager from './bucketmanager/bucketmanager'
export const bucketmanager = manager.bucketscheduler

import * as userinform from './user/userinform'
//export const informSMS = userinform.informSMS  //twilio SMS inform user ， 暫不啟用 
export const informChatBot = userinform.informChatBot
