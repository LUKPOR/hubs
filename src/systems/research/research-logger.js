import qsTruthy from "../../utils/qs_truthy";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { detectOS } from 'detect-browser';


AFRAME.registerSystem('research-logger', {
  init: function () {
    //this.enableLogger = qsTruthy('log');
    this.enableLogger = true;
    console.log("RESEARCH LOGGER", this.enableLogger);
    this.tickCount = 0;
    this.lastFPS = 0;
    this.lastFpsUpdate = performance.now();
    this.frameCount = 0;
    this.tickPayloadSize = 4000;
    this.ntpMoment = require('moment');
    this.payload = [];
  },

  tick() {
    if (!this.enableLogger) {
      return;
    }
    const timestamp = this.ntpMoment.utc().valueOf();
    // FPS
    const now = performance.now();
    this.frameCount++;
    if (now >= this.lastFpsUpdate + 1000) {
      this.lastFPS = parseFloat((this.frameCount / ((now - this.lastFpsUpdate) / 1000)).toFixed(2));
      this.lastFpsUpdate = now;
      this.frameCount = 0;
    }
    const userinput = AFRAME.scenes[0].systems.userinput;
    const avatarPOV = document.getElementById('avatar-pov-node');
    const avatarRig = document.getElementById('avatar-rig');
    const { leftHand, rightHand, rightRemote, leftRemote } = AFRAME.scenes[0].systems.interaction.state;

/*
    const leftHand = document.getElementById("player-left-controller");
    const rightHand  = document.getElementById("player-right-controller");
    const rightRemote  = document.getElementById("right-cursor");
    const leftRemote = document.getElementById("left-cursor");
*/
    const rigPosition = avatarRig.object3D.getWorldPosition(new THREE.Vector3());
    const rigQuant = avatarRig.object3D.getWorldQuaternion(new THREE.Quaternion());
    const rigDirection = avatarRig.object3D.getWorldDirection(new THREE.Vector3());
    const povPosition = avatarPOV.object3D.getWorldPosition(new THREE.Vector3());
    const povQuant = avatarPOV.object3D.getWorldQuaternion(new THREE.Quaternion());
    const povDirection = avatarPOV.object3D.getWorldDirection(new THREE.Vector3());
    this.payload.push([
      timestamp, // eventtime
      AFRAME.scenes[0].ownerDocument.location.pathname,
      AFRAME.scenes[0].ownerDocument.location.search,
      leftHand.hovered,
      leftHand.held,
      leftHand.hovered && leftHand.hovered.components && leftHand.hovered.components.tags && leftHand.hovered.components.tags.data.isPen ? leftHand.hovered.components.tags.data.isPen : 0,
      rightHand.hovered,
      rightHand.held,
      rightHand.hovered && rightHand.hovered.components && rightHand.hovered.components.tags && rightHand.hovered.components.tags.data.isPen ? rightHand.hovered.components.tags.data.isPen : 0,  
      leftRemote.hovered,
      leftRemote.held,
      leftRemote.hovered && leftRemote.hovered.components && leftRemote.hovered.components.tags && leftRemote.hovered.components.tags.data.isPen ? leftRemote.hovered.components.tags.data.isPen : 0,
      rightRemote.hovered,
      rightRemote.held,
      rightRemote.hovered && rightRemote.hovered.components && rightRemote.hovered.components.tags && rightRemote.hovered.components.tags.data.isPen ? rightRemote.hovered.components.tags.data.isPen : 0,     
      this.flattenZeros(rigPosition.x),
      this.flattenZeros(rigPosition.y),
      this.flattenZeros(rigPosition.z),
      this.flattenZeros(povPosition.x),
      this.flattenZeros(povPosition.y),
      this.flattenZeros(povPosition.z),
      this.flattenZeros(rigQuant._x),
      this.flattenZeros(rigQuant._y),
      this.flattenZeros(rigQuant._z),
      this.flattenZeros(rigQuant._w),
      this.flattenZeros(povQuant._x),
      this.flattenZeros(povQuant._y),
      this.flattenZeros(povQuant._z),
      this.flattenZeros(povQuant._w),
      this.flattenZeros(rigDirection.x),
      this.flattenZeros(rigDirection.y),
      this.flattenZeros(rigDirection.z),
      this.flattenZeros(povDirection.x),
      this.flattenZeros(povDirection.y),
      this.flattenZeros(povDirection.z),
      AFRAME.scenes[0].systems["hubs-systems"].characterController.fly ? 1 : 0,
      AFRAME.scenes[0].states.includes("spacebubble") ? 1 : 0,
      AFRAME.scenes[0].states.includes("visible") ? 1 : 0,
      AFRAME.scenes[0].states.includes("loaded") ? 1 : 0,
      AFRAME.scenes[0].states.includes("entered") ? 1 : 0,
      AFRAME.scenes[0].states.includes("muted") ? 1 : 0,
      this.lastFPS,
      AFRAME.scenes[0].systems["local-audio-analyser"].volume,
      window.APP.store.state.preferences.audioOutputMode === "audio" ? 1 : 0
    ]);
    if (++this.tickCount > this.tickPayloadSize) {
      let infodata = [
        getUUID(),
        timestamp, // post time
        window.APP.store.credentialsAccountId !== null ? window.APP.store.credentialsAccountId : "",
        window.APP.store.state.profile.avatarId,
        avatarRig.components["player-info"].identityName !== undefined ? avatarRig.components["player-info"].identityName : "",
        avatarRig.components["player-info"].displayName !== null ? avatarRig.components["player-info"].displayName : "",
        avatarRig.components["player-info"].isRecording,
        avatarRig.components["player-info"].isOwner,
      ];
      infodata = infodata.concat(this.getDeviceInfo());
      this.researchCollect({ info: infodata, data: this.payload });
      this.payload = [];
      this.tickCount = 0;
    }
  },

  flattenZeros(n, p = 1000000000) {
    return (Math.round(n * p) / p);
  },

  // This doesn't change a lot, so lets just push it once per POST
  getDeviceInfo() {
    const deviceInfo = [
      detectOS(navigator.userAgent),
      AFRAME.utils.device.isBrowserEnvironment ? 1 : 0,
      AFRAME.utils.device.checkARSupport() ? 1 : 0,
      AFRAME.utils.device.checkHeadsetConnected() ? 1 : 0,
      AFRAME.utils.device.isIOS() ? 1 : 0,
      AFRAME.utils.device.isLandscape() ? 1 : 0,
      AFRAME.utils.device.isMobile() ? 1 : 0,
      AFRAME.utils.device.isMobileVR() ? 1 : 0,
      AFRAME.utils.device.isOculusBrowser() ? 1 : 0,
      AFRAME.utils.device.isR7() ? 1 : 0,
      AFRAME.utils.device.isTablet() ? 1 : 0,
      AFRAME.utils.device.isWebXRAvailable ? 1 : 0
    ];
    return deviceInfo;
  },

  researchCollect(data, url = "http://34.247.48.96:3000/data") {
    if (data === undefined) return;
    axios
      .post(url, data)
      .then(response => {
        console.log(response);
      })
      .catch(error => {
        console.log("Logger Error:", error);
      });
  }
});


// Store this locally in case we need it later. TODO: we could push it
// into the Hub Store but nah.  RFC4122 UUIDs from
// https://github.com/uuidjs/uuid
function getUUID(appkey = "socialvr4chi") {
  let uuid = localStorage.getItem(appkey);
  if (uuid === null) {
    uuid = uuidv4();
    localStorage.setItem(appkey, uuid);
  }
  return uuid;
}

