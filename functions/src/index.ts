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
export const bucketscheduler = manager.bucketscheduler

import * as userinform from './user/userinform'
//export const informTwilio = userinform.informTwilio  //twilio SMS inform user ， 暫不啟用 
export const informChatBot = userinform.informChatBot
export const informTWSMS = userinform.informTWSMS  
export const ServerErrorinformChatBot = userinform.ServerErrorinformChatBot

import * as linebotwebhook from './user/linebotwebhook'
export const Linewebhook = linebotwebhook.Linewebhook