import * as firebaseAdmin from 'firebase-admin';
firebaseAdmin.initializeApp();


/***************** 

camera

*****************/

import * as camera from './camera/cameraService'
export const cameraService = camera.cameraService


import * as detect from './detect/LPdetect'
// export const LPdetect = detect.LPdetect  //車牌辨識，暫不啟用
export const platedetect = detect.platedetect  //Vision HTTP API

import * as manager from './bucketmanager/bucketmanager'
export const bucketscheduler = manager.bucketscheduler

import * as userinform from './user/userinform'
//export const informTwilio = userinform.informTwilio  //twilio SMS inform user ， 暫不啟用 
export const informChatBot = userinform.informChatBot
export const informTWSMS = userinform.informTWSMS  
export const ServerErrorinformChatBot = userinform.ServerErrorinformChatBot

import * as linebotwebhook from './user/linebotwebhook'
export const Linewebhook = linebotwebhook.Linewebhook



//------------test-----------------
import * as camera_test from './camera/cameraService_copy'
export const cameraService_test = camera_test.cameraService
export const UploadTime_Check = camera_test.UploadTime_Check

import * as user_test from './user/userinform_copy'
export const informChatBot_test = user_test.informChatBot
export const informTWSMS_test = user_test.informTWSMS  

//------------yusan-----------------
import * as camera_yusan from './camera/cameraService_yusan'
export const cameraService_yusan = camera_yusan.cameraService
export const UploadTime_Check_yusan = camera_yusan.UploadTime_Check

import * as user_yusan from './user/userinform_yusan'
export const BillinformTWSMS_yusan = user_yusan.BillinformTWSMS 
export const BillinformChatBot_yusan = user_yusan.BillinformChatBot
export const ImageErrorinformChatBot = user_yusan.ImageErrorinformChatBot