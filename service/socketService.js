import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { parseCookie } from 'cookie';
import redis from '../server.js';

const MESSAGE_TYPES = {
  sendMessage: 'send_message',
  receiveMessage: 'receive_message',
  heartbeat: 'heartbeat',
}

const port = process.env.SOCKET_PORT
const ws = new WebSocketServer({ port: port || 8001 });
const onlineClients = new Map();

export function socketConnection() {
  let socketId;
  ws.on('connection', async (socket, req) => {

    const cookies = parseCookie(req?.headers?.cookie) || {};

    const token = cookies.authToken;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(decoded);
    socket.userId = decoded._id;

    const clientId = crypto.randomUUID();
    onlineClients.set(clientId, socket);

    await redis.rPush(decoded._id, clientId);

    socket.send(JSON.stringify({ id: clientId }));
    // on message
    socket.on('message', (rawData) => {
      const message = JSON.parse(rawData);
      switch (message.type) {
        case MESSAGE_TYPES.sendMessage: sendMessage(message.data, onlineClients);
        case MESSAGE_TYPES.receiveMessage: receiveMessage();
        case MESSAGE_TYPES.heartbeat: heartbeat();
      }
    })

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
    // console.log(onlineClients)
    // connection closed
    socket.on('close', (code, reason) => {
      console.log("WEBSOCKET CLOSED: ", code, reason.buffer);
      onlineClients.delete(clientId);
    })
  })

}


async function sendMessage(payload, clientList) {
  const receiverId = payload.receiverId;
  const receiverSocket = await redis.lRange(receiverId, 0, -1);
  console.log("Message payload:", payload);
  if (receiverSocket.length < 1) {
    console.log("RECEIVER SOCKET NOT FOUND: ", receiverId);
    return;
  }

  console.log(receiverSocket)

  receiverSocket.forEach((socketId) => {
    const clientSocket = clientList.get(socketId);

    if (clientSocket && clientSocket.readyState === ws.OPEN) {
      clientSocket.send(JSON.stringify({
        type: 'receive_message',
        data: {
          senderId: clientSocket?.userId,
          message: payload?.message,
          timestamp: new Date(),
        }
      }))
    }
  });
}


async function receiveMessage() {
  console.log("Receive message hit")
}

async function heartbeat() {
  console.log("heartbeat hit")
}