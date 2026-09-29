import mongoose from "mongoose";

const chatRoomSchema = mongoose.Schema({
  isGroup: {
    type: Boolean,
    default: false
  },
  roomName: {
    type: String,
    trim: true,
    isRequired: function () {
      return this.isGroup;  
    }
  },
  participants: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    validate: [v => v.length > 1],
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
    validate: {
      validator: function (v) {
        // Only require groupAdmin for groups
        if (this.isGroup) {
          return Array.isArray(v) && v.length > 0;
        }

        return true;
      },
      message: "A group must have at least one group admin."
    }
  }

}, { timestamps: true })

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
export default ChatRoom;