import * as firebaseAdmin from 'firebase-admin';
firebaseAdmin.initializeApp();


/***************** 

camera

*****************/

import * as camera from './camera/cameraService'
export const cameraService = camera.cameraService

import * as detect from './detect/LPdetect'
export const LPdetect = detect.LPdetect

import * as manager from './bucketmanager/bucketmanager'
export const bucketmanager = manager.bucketscheduler
