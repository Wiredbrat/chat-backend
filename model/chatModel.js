import mongoose from "mongoose";

const chatSchema = mongoose.Schema({
  chatRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatRoom",
  },
  messages: {
    type: [{
      message: {
        type: String,
        required: true,
        trim: true
      },
      isUpdated: {
        type: Boolean,
        default: false,
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      createdAt: { 
        type: Date,
        default: Date.now 
      },
      updatedAt: { 
        type: Date,
        default: Date.now 
      }
    }],
    validate: [v => v.length <= 100, "Message bucket is full"]
  },
  
}, {timestamps: true})

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;