import { io } from "socket.io-client";
import { API_URL } from "./config.js";

let socket;
export function getSocket() {
  if (!socket) {
    socket = io(API_URL, { transports: ["websocket"], reconnection: true });
  }
  return socket;
}

export function onPositionUpdate(cb) {
  const s = getSocket();
  s.on("position:update", cb);
  return () => s.off("position:update", cb);
}

export function subscribeVehicle(id) {
  getSocket().emit("subscribe", { vehicleId: id });
}
export function unsubscribeVehicle(id) {
  getSocket().emit("unsubscribe", { vehicleId: id });
}
