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
    type: Boolean,
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
  }

}, {timestamps: true})

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
export default ChatRoom;