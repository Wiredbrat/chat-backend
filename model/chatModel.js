import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
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
      required: true
    },
    updatedAt: {
      type: Date,
    }
  },
);

const chatSchema = mongoose.Schema({
  chatRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatRoom",
  },
  messages: {
    type: [messageSchema],
    validate: [v => v.length <= 100, "Message bucket is full"],
  },

}, { timestamps: true })

chatSchema.index({ chatRoomId: 1, createdAt: -1 });

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
