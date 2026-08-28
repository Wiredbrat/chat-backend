import mongoose from "mongoose";

const chatRoomSchema = mongoose.Schema({
  roomName: { 
    type: String, 
    required: true
  },
  participants: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    validate: [v => v.length > 1],
  },
  isGroup: {
    type: true,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  groupAdmin: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    validate: [v => v.length > 0],
  },
  chats: [{
    
  }]

}, {timestamps: true})

export default ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);