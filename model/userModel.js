import mongoose from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    minLength: [3, "Username must be atleast 3 characters long."],
    index: true
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
    select: false 
  },
  chatRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom'
  }]
})


userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(this.password, salt);

    this.password = hash;
  } catch (error) {
    console.log(error) 
    throw error;
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

const User = mongoose.model('User', userSchema);
export default User;