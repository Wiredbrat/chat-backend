import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { parseCookie } from 'cookie';
import redis from '../server.js';
import { bufferMessage, claimChatBatch } from './chatService.js';

const MESSAGE_TYPES = {
  sendMessage: 'send_message',
  receiveMessage: 'receive_message',
  heartbeat: 'heartbeat',
}

const port = process.env.SOCKET_PORT
const ws = new WebSocketServer({ port: port || 8001 });
const onlineClients = new Map();
const socketKey = "user:socket:";

export function socketConnection() {
  ws.on('connection', async (socket, req) => {

    const cookies = parseCookie(req?.headers?.cookie) || {};

    const token = cookies.accessToken;

    if (!token) {
      console.log("No access token in WebSocket connection");
      socket.close(1008, "Authentication required");
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    // console.log(decoded);
    socket.userId = decoded._id;

    const clientId = crypto.randomUUID();
    onlineClients.set(clientId, socket);

    await redis.rPush(`${socketKey}${decoded._id}`, clientId);

    socket.send(JSON.stringify({ id: clientId }));
    // on message
    socket.on('message', (rawData) => {
      const message = JSON.parse(rawData);
      switch (message.type) {
        case MESSAGE_TYPES.sendMessage: sendMessage(message.data, onlineClients, socket.userId);
        // case MESSAGE_TYPES.receiveMessage: receiveMessage();
        // case MESSAGE_TYPES.heartbeat: heartbeat();
      }
    })

    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
    // console.log(onlineClients)
    // connection closed
    socket.on('close', async (code, reason) => {
      console.log("WEBSOCKET CLOSED: ", code, reason.buffer);
      onlineClients.delete(clientId);
      await redis.lRem(`${socketKey}${decoded._id}`, 0, clientId);
    })
  })

}

async function sendMessage(payload, clientList, senderId) {
  const receiverId = payload.receiverId;
  const receiverSocket = await redis.lRange(`${socketKey}${receiverId}`, 0, -1);
  // console.log("Message payload:", payload);
  if (receiverSocket.length < 1) {
    console.log("RECEIVER SOCKET NOT FOUND: ", receiverId);
    return;
  }

  const outgoingMessage = {
    type: MESSAGE_TYPES.receiveMessage,
    data: {
      _id: crypto.randomUUID(),
      roomId: payload.roomId,
      senderId,
      message: payload?.message,
      timestamp: new Date().toISOString(),
      type: "Incoming"
    }
  }

  const messageToSave = {
    _id: crypto.randomUUID(),
    receiver: payload.receiverId,
    sender: senderId,
    message: payload?.message,
    createdAt: new Date().toISOString(),
  }

  bufferMessage(payload.roomId, messageToSave);

  receiverSocket.forEach((socketId) => {
    const clientSocket = clientList.get(socketId);
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
      // console.log(clientSocket);
      clientSocket.send(JSON.stringify(outgoingMessage));
      // console.log("MESSAGE SENT >>>", outgoingMessage)
    } else {
      // console.log("Socket unavailable:", socketId, clientSocket?.readyState);
      clientList.delete(socketId);
    }
  });
}


async function receiveMessage() {
  console.log("Receive message hit")
}


// function heartbeat(socket) {
//   socket.send(
//     JSON.stringify({
//       type: MESSAGE_TYPES.heartbeat,
//     })
//   );
// }
