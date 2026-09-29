import ChatRoom from "../model/chatRoomModel.js";
import User from "../model/userModel.js";

export async function createRoom(req, res) {
  try {
    const { receiverId } = req.params;

    console.log()

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "Invalid receiver ID."
      })
    }

    const receiver = await User.findById(receiverId);

    if (!receiverId) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      })
    }

    const senderId = req.user._id;
    const existingRoom = await ChatRoom.findOne({
      isGroup: false,
      participants: { $all: [senderId, receiver._id] }
    });

    if (existingRoom) {
      return res.status(409).json({
        success: false,
        message: "ChatRoom already exists."
      })
    }

    const createChatRoom = await ChatRoom.create({
      participants: [receiver._id, senderId],
      createdBy: senderId,
    });

    const sender = await User.findById(senderId);

    sender?.chatRooms?.push(createChatRoom._id);
    receiver?.chatRooms?.push(createChatRoom._id);

    await sender.save();
    await receiver.save();

    return res.status(201).json({
      success: true,
      message: "New chat room created.",
      data: createChatRoom
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

export async function getChat() {
  const { chatId } = req.params;
  const { _id } = req.user;

  if (!chatId) {
    return res.status(400).json({
      success: false,
      message: "Invalid chat ID."
    })
  }

  const chat = await ChatRoom.findById(chatId).select("-_id");

  if (!chat) {
    return res.status(404).json({
      success: false,
      message: "Chat not found."
    })
  }

  if (!chat?.participants?.includes(_id)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access."
    })
  }

  return res.status(200).json({
    success: true,
    message: "Chat found.",
    data: chat
  })
}

