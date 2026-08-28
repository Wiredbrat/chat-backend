import mongoose from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    minLength: [3, "Username must be atleast 3 characters long."],
    index: true
  },
  password: {
    type: String,
    required: true
  },
  chatRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom'
  }]
})


userSchema.pre('save', async (next) => {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
})

userSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { _id: this._id,
      username: this.username
     }, 
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};


userSchema.statics.verifyAuthToken = function (token) {
  return jwt.verify(
    token,
    process.env.JWT_SECRET,
  );
};
export default User = mongoose.model('User', chatSchema);