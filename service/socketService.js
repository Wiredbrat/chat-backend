import { WebSocketServer } from 'ws';
import crypto from 'crypto';

const port = process.env.SOCKET_PORT
const ws = new WebSocketServer({port: port || 8001});
const onlineClients = new Map();
export function socketConnection () {  
  let socketId;
  ws.on('connection', (socket) => {
    const clientId = crypto.randomUUID();
    onlineClients.set(clientId, socket);
    
    socket.send(JSON.stringify({ id: clientId }));
    // on message
    socket.on('message', (rawData) => {

    })

    // connection closed
    socket.on('close', () => {
      onlineClients.delete(clientId);
    })
  })

  

  return socketId;
}
