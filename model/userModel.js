import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    minLength: [3, "Username must be atleast 3 characters long."],
    index: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  chatRooms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
    },
  ],
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  try {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(this.password, salt);

    this.password = hash;
  } catch (error) {
    console.log(error);
    throw error;
  }
});

userSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, username: this.username },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "2d" },
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "15d" },
  );
};

userSchema.statics.verifyAccessToken = function (token) {
  // console.log("token in verifyAccessToken: ", token);
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

userSchema.statics.verifyRefreshToken = function (token) {
  // console.log("token in verifyRefreshToken: ", token);
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};


const User = mongoose.model("User", userSchema);
export default User;
