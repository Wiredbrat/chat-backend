import mongoose from "mongoose";
import ChatRoom from "../model/chatRoomModel.js";
import User from "../model/userModel.js";
import redis from "../server.js";
import {
  isString,
  isStringMulti,
  isValidEmailFormat,
} from "../utils/validator.js";
import Chat from "../model/chatModel.js";

export async function addUser(req, res) {
  try {
    const { username, email, password } = req.body;

    const { valid, invalidItem } = isStringMulti(username, password);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Enter a valid ${invalidItem}.`,
      });
    }

    const validEmail = isValidEmailFormat(email);

    if (!validEmail) {
      return res.status(400).json({
        success: false,
        message: `Enter a valid email.`,
      });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `Username is already taken.`,
      });
    }

    const newUser = await User.create({
      username,
      email,
      password,
    });

    // add email varification service here

    return res.status(201).json({
      success: true,
      message: `User created.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function loginUser(req, res) {
  try {
    const { username, password } = req.body;

    const { valid, invalidItem } = isStringMulti(username, password);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Enter valid ${invalidItem}.`,
      });
    }

    const existingUser = await User.findOne({ username }).select("+password");

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: `User not found.`,
      });
    }

    const isValidPassword = await existingUser.validatePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: `Password didn't match.`,
      });
    }

    const newAccessToken = await existingUser.generateAccessToken();
    const newRefreshToken = await existingUser.generateRefreshToken();

    if (!newAccessToken || !newRefreshToken) {
      return res.status(500).json({
        success: false,
        message: "Error while generating token.",
      });
    }
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: !process.env.DEVELOPEMENT,
      sameSite: "lax",
      // maxAge: 2 * 24 * 60 * 60 * 1000
      maxAge: 15 * 60 * 1000
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: !process.env.DEVELOPEMENT,
      sameSite: "lax",
      maxAge: 15 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      message: `Token generated.`,
      // data: responseData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function logout(req, res) {
  try {
    const { _id } = req.user;
    const { accessToken, refreshToken } = req.cookie;

    // const existingUser = await User.findOne({ _id });

    // if (!existingUser) {
    //   return res.status(404).json({
    //     success: false,
    //     message: `User not found.`,
    //   })
    // }

    const decoded = await User.verifyToken(accessToken);
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const timeLeft = decoded.exp - nowInSeconds;

    if (timeLeft > 0) {
      redis.setEx(`blacklist:${accessToken}`, timeLeft, "revoked");
      redis.setEx(`blacklist:${refreshToken}`, timeLeft, "revoked");
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.status(201).json({
      success: true,
      message: `User logged out`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getUserByUsername(req, res) {
  try {
    const { username } = req.params;

    const string = isString(username);

    if (!string) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid string.",
      });
    }

    const user = await User.find({
      username: { $regex: username, $options: "i" },
    }).select("-chatRooms -email");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: user.length > 0 ? "User found." : "User not found.",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getUser(req, res) {
  try {
    const { _id } = req.user;

    const user = await User.find({ _id }).populate("chatRooms");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User found.",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getChatRooms(req, res) {
  try {
    const { _id } = req.user;

    const pipeline = [
      { $match: { participants: _id } },
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
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                username: 1,
              },
            },
          ],
          as: "createdBy",
        },
      },
      { $unwind: "$createdBy" },
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
          createdBy: 1,
          createdAt: 1,
          updatedAt: 1,
          isGroup: 1,
        },
      },
    ];

    const chatRooms = await ChatRoom.aggregate(pipeline);

    if (!chatRooms) {
      return res.status(404).json({
        success: false,
        message: "Chats not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Chats found.",
      data: chatRooms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getUserChats(req, res) {
  try {
    const { chatRoomId } = req.params;
    const { before } = req.query;
    const { _id } = req.user;
    console.log(chatRoomId);
    if (
      !chatRoomId ||
      chatRoomId === undefined ||
      !mongoose.isValidObjectId(chatRoomId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat room ID.",
      });
    }

    const match = { chatRoomId: new mongoose.Types.ObjectId(chatRoomId) };

    if (before) {
      match.createdAt = {};
      if (isNaN(Date.parse(before))) {
        return res.status(400).json({
          success: false,
          message: "Invalid date.",
        });
      } else {
        match.createdAt = { $lt: new Date(before) };
      }
    }

    const pipeline = [
      { $match: match },
      { $sort: { updatedAt: -1 } },
      { $limit: 1 },
    ];

    let chatInBuffer;

    const chat = await Chat.aggregate(pipeline);

    if (!before) {
      const key = `chat:buffer:${chatRoomId}`;
      chatInBuffer = await redis.lRange(key, 0, -1);
    }

    if (!chat && !chatInBuffer) {
      return res.status(404).json({
        success: false,
        message: "Chats not found.",
      });
    }

    let unsavedMessages = [];
    if (chatInBuffer && chat) {
      unsavedMessages = chatInBuffer.map((chat) => JSON.parse(chat));
      if (chat) {
        chat[0]?.messages.push(...unsavedMessages);
      }
    }

    let moreChatExists = false;
    if (chat?.length >= 1) {
      moreChatExists = await Chat.exists({
        chatRoomId: chat[0]?.chatRoomId,
        createdAt: {
          $lt: chat[0]?.createdAt,
        },
      });
    }
    // console.log("more chat",moreChatExists);

    // console.log("chat in buffer: ",chatInBuffer)
    // console.log(messages)

    return res.status(200).json({
      success: true,
      message: "Chats found.",
      data: {
        chatRoomId: chat[0]?.chatRoomId,
        messages: chat[0]?.messages || unsavedMessages,
        createdAt: chat[0]?.createdAt,
        updatedAt: chat[0]?.updatedAt,
        hasMore: Boolean(moreChatExists),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
