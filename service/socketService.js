import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { parseCookie } from 'cookie';
import redis from '../server.js';
import { bufferMessage } from './chatService.js';
import { getChatRooms } from '../controller/userController.js';
import ChatRoom from '../model/chatRoomModel.js';
import mongoose from 'mongoose';

const MESSAGE_TYPES = {
  sendMessage: 'send_message',
  receiveMessage: 'receive_message',
  presence: 'presence',
}

const port = process.env.SOCKET_PORT
const ws = new WebSocketServer({ port: port || 8001 });
const onlineClients = new Map();
const socketKey = "user:socket:";

const heartbeatInterval = setInterval(async() => {
  const clients = ws.clients;
  for (const socket of clients) {
    if (socket.isAlive === false) {
      console.log("Terminating dead WebSocket");
      return socket.terminate();
    } else if (socket.isAlive === true) {
      console.log("WebSocket is alive: ", socket?.userId);
      await sendPresence(socket.userId, "online");
    }

    socket.isAlive = false;
    socket.ping();
  };
}, 30000);


export function socketConnection() {
  ws.on('connection', async (socket, req) => {
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });

    const cookies = parseCookie(req?.headers?.cookie || "") || {};
    const token = cookies?.accessToken;

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


    socket.send(JSON.stringify({ id: clientId }));
    const existingSockets = await redis.lLen(`${socketKey}${decoded._id}`);
    await redis.rPush(`${socketKey}${decoded._id}`, clientId);

    if(existingSockets === 0) {
      await sendPresence(socket.userId, "online");
    }

    // on message
    socket.on('message', (rawData) => {
      const message = JSON.parse(rawData);
      switch (message.type) {
        case MESSAGE_TYPES.sendMessage: sendMessage(message.data, socket.userId);
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
      const socketCount = await redis.lLen(`${socketKey}${decoded._id}`);

      if (socketCount === 0) {
        await sendPresence(decoded._id, "offline", new Date().toISOString());
      }
    })
  })

}

async function sendMessage(payload, senderId) {
  const receiverId = payload.receiverId;

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

  await getClientsSocketAndSendMessage(receiverId, outgoingMessage);
  bufferMessage(payload.roomId, messageToSave);
}


async function getClientsSocketAndSendMessage(receiverId, message) {
  const receiverSocket = await redis.lRange(`${socketKey}${receiverId}`, 0, -1);
  if (receiverSocket.length < 1) {
    console.log("RECEIVER SOCKET NOT FOUND: ", receiverId);
    
    return;
  }

  console.log("receiverSocket:", receiverSocket);

  for(const socketId of receiverSocket) {
    const clientSocket = onlineClients.get(socketId);

    // console.log("clientSocket:", clientSocket?.userId);

    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
      // console.log(clientSocket);
      clientSocket.send(JSON.stringify(message));
      // console.log("MESSAGE SENT >>>", message)
    } else {
      console.log("Socket unavailable:", socketId, clientSocket?.readyState);
      onlineClients.delete(socketId);
      await redis.lRem(`${socketKey}${receiverId}`, 0, socketId);
    }
  };
}

async function sendPresence(userId, status, lastSeen = null) {
  const presenceMessage = {
    type: MESSAGE_TYPES.presence,
    data: {
      _id: crypto.randomUUID(),
      userId,
      status,
      timestamp: new Date().toISOString(),
    }
  }

  // Get users who should receive this event
    try {
      const _id = userId;

      const pipeline = [
        { $match: { participants: new mongoose.Types.ObjectId(_id) } },
        {
          $lookup: {
            from: "users",
            localField: "participants",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  username: 1,
                },
              },
            ],
            as: "participants",
          },
        },
        {
          $project: {
            participants: {
              $filter: {
                input: "$participants",
                as: "user",
                cond: {
                  $ne: ["$$user._id", new mongoose.Types.ObjectId(_id)],
                },
              },
            },
            createdAt: 1,
            updatedAt: 1,
            isGroup: 1,
          },
        },
      ];

      const chatRooms = await ChatRoom.aggregate(pipeline);
      // console.log("ChatRooms>>>>>>>>>>>>>>>>>>>");
      // console.log(chatRooms);

      // Then send to their sockets
      chatRooms.forEach((room) => {
        room.participants.forEach(async (participant) => {
          // console.log("participant", participant);
          await getClientsSocketAndSendMessage(participant?._id, presenceMessage);
        });
      });
    } catch (error) {
      throw new Error(error.message);
    }
}
