import User from "../model/userModel.js";
import redis from "../server.js";
import { isString, isStringMulti, isValidEmailFormat } from "../utils/validator.js";


export async function addUser(req, res) {
  try {
    const { username, email, password } = req.body;

    const { valid, invalidItem } = isStringMulti(username, password);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: `Enter a valid ${invalidItem}.`,
      })
    }

    const validEmail = isValidEmailFormat(email);

    if (!validEmail) {
      return res.status(400).json({
        success: false,
        message: `Enter a valid email.`,
      })
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `Username is already taken.`,
      })
    }

    const newUser = await User.create({
      username,
      email,
      password
    })

    // add email varification service here

    return res.status(201).json({
      success: true,
      message: `User created.`,
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
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
      })
    }
  
    const existingUser = await User.findOne({ username }).select("+password");
  
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: `User not found.`,
      })
    }
  
    const isValidPassword = await existingUser.validatePassword(password);
  
    if(!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: `Password didn't match.`,
      })
    }
  
    const newToken = await existingUser.generateAuthToken();
    
    if(!newToken) {
      return res.status(500).json({
        success: false,
        message: 'Error while generating token.',
      })
    }
    res.cookie('authToken', newToken, {
      httpOnly: true,
      // secure: true, 
      sameSite: 'lax',
      // maxAge: 360000
    });

    return res.status(201).json({
      success: true,
      message: `Token generated.`,
      // data: responseData
    }) 
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export async function logout(req, res) {
  try {
    const { _id } = req.user;
    const { authToken } = req.cookie;
  
    // const existingUser = await User.findOne({ _id });
  
    // if (!existingUser) {
    //   return res.status(404).json({
    //     success: false,
    //     message: `User not found.`,
    //   })
    // }

    const decoded = await User.verifyAuthToken;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const timeLeft = decoded.exp - nowInSeconds;

    if(timeLeft > 0) {
      redis.setEx(`blacklist:${token}`, timeLeft, 'revoked');
    }
    res.clearCookie('authToken');

    return res.status(201).json({
      success: true,
      message: `User logged out`,
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}


export async function getUserByUsername(req, res) {
  try {
    const { username } = req.params;

    const string = isString(username);

    if (!string) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid string."
      })
    }

    const user = await User.find({ username: { $regex: username, $options: "i" } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      })
    }

    return res.status(200).json({
      success: true,
      message: user.length > 0 ? "User found.": "User not found.",
      data: user
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }

}

export async function getUser(req, res) {
  try {
    const { _id } = req.user;

    const user = await User.find({_id});

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      })
    }

    return res.status(200).json({
      success: true,
      message: "User found.",
      data: user
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }

}
