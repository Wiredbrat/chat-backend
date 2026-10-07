import jwt from "jsonwebtoken";
import User from "../model/userModel.js";
import redis from "../server.js";

const authMiddleware = async (req, res, next) => {
  const accessToken = req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    let decoded;
    let shouldRefresh = false;

    // Try access token first
    if (accessToken) {
      try {
        const isBlacklisted = await redis.get(`blacklist:${accessToken}`);

        if (isBlacklisted) {
          return res.status(401).json({
            success: false,
            message: "Token is no longer valid.",
          });
        }

        decoded = await User.verifyAccessToken(accessToken);
      } catch (error) {
        if (error.name !== "TokenExpiredError") {
          return res.status(401).json({
            success: false,
            message: "Invalid access token.",
          });
        }

        shouldRefresh = true;
      }
    } else {
      shouldRefresh = true;
    }

    // Access token expired/missing → use refresh token
    if (shouldRefresh) {
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again.",
        });
      }

      const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);

      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          message: "Refresh token is no longer valid.",
        });
      }

      try {
        decoded = await User.verifyRefreshToken(refreshToken);
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again.",
        });
      }
    }

    // Find user
    const user = await User.findById(decoded._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Generate new access token
    if (shouldRefresh) {
      const newAccessToken = await user.generateAccessToken();

      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: !process.env.DEVELOPEMENT,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

export default authMiddleware;
