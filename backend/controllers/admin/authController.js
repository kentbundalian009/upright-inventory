import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { redis } from "../../lib/redis.js";
import { logActivity } from "../../utils/logger.js"; 
import { clearSessionCache } from "../../middleware/authMiddleware.js"; 

export const signupUser = async (req, res) => {
  try {
    const { EmpNo, SystemRole, Username, Fullname, Email, Password } = req.body;
    if (!EmpNo || !Username || !Fullname || !Email || !Password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const userExists = await User.findOne({ $or: [{ EmpNo }, { Username }, { Email }] });
    if (userExists) {
      return res.status(400).json({ message: "Employee Number, Username, or Email already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Password, salt);
    
    const newUser = await User.create({
      EmpNo,
      SystemRole: SystemRole || "Inventory", 
      Username,
      Fullname,
      Email,
      Password: hashedPassword, 
    });

    const logUserPayload = {
      username: newUser.Username,
      role: newUser.SystemRole
    };

    await logActivity(
      logUserPayload, 
      "User Management", 
      "CREATE", 
      `Registered a new account: ${newUser.Username} (${newUser.EmpNo})`
    );

    res.status(201).json({
      message: "User registered successfully!",
      user: { id: newUser._id, EmpNo: newUser.EmpNo, Username: newUser.Username, Fullname: newUser.Fullname, SystemRole: newUser.SystemRole }
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { Username, Password } = req.body;
    if (!Username || !Password) {
      return res.status(400).json({ message: "Please provide both username and password" });
    }

    const lockoutKey = `lockout:${Username}`;
    const attemptsKey = `attempts:${Username}`;

    const isLocked = await redis.get(lockoutKey);
    if (isLocked) {
      const ttl = await redis.ttl(lockoutKey); 
      const minutesLeft = Math.ceil(ttl / 60);
      return res.status(423).json({ 
        message: `Too many failed attempts. Your account is locked. Please try again after ${minutesLeft} minutes.` 
      });
    }

    const user = await User.findOne({ Username });
    if (!user) {
      await handleFailedAttempt(Username, redis);
      return res.status(401).json({ message: "Invalid credentials (Username not found)" });
    }

    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) {
      const currentAttempts = await handleFailedAttempt(Username, redis);
      const remaining = 6 - currentAttempts;

      if (remaining <= 0) {
        return res.status(423).json({ 
          message: "Account locked. Too many failed attempts. Please wait 10 minutes." 
        });
      }

      return res.status(401).json({ 
        message: `Invalid credentials (Wrong password). You have ${remaining} attempts remaining.` 
      });
    }
    
    await redis.del(attemptsKey);
    await redis.del(lockoutKey);

    const token = jwt.sign(
      { id: user._id, SystemRole: user.SystemRole }, 
      process.env.JWT_SECRET || "default_secret_key_123", 
      { expiresIn: "30d" }
    );
    
    const redisKey = `session:${user._id}`;
    await redis.set(redisKey, token, { ex: 2592000 });
    
    console.log(`🔑 Session saved in Upstash Redis for user: ${user.Username}`);

    const logUserPayload = {
      username: user.Username,
      role: user.SystemRole
    };

    await logActivity(
      logUserPayload, 
      "Auth", 
      "LOGIN", 
      `User ${user.Username} successfully logged into the system.`
    );

    res.status(200).json({
      message: "Login successful!", token,
      user: { id: user._id, EmpNo: user.EmpNo, Username: user.Username, Fullname: user.Fullname, Email: user.Email, SystemRole: user.SystemRole, ProfileImage: user.ProfileImage }
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const handleFailedAttempt = async (username, redisInstance) => {
  const attemptsKey = `attempts:${username}`;
  const lockoutKey = `lockout:${username}`;

  const currentAttempts = await redisInstance.incr(attemptsKey);

  if (currentAttempts === 1) {
    await redisInstance.expire(attemptsKey, 900);
  }

  if (currentAttempts >= 6) {
    await redisInstance.set(lockoutKey, "locked", { ex: 600 });
    await redisInstance.del(attemptsKey);
  }

  return currentAttempts;
};

export const logoutUser = async (req, res) => {
  try {
    if (req.user) {
      const userId = req.user._id;
      const redisKey = `session:${userId}`;
      
      const userPayload = {
        username: req.user.Username || req.user.username,
        role: req.user.SystemRole || req.user.role
      };

      await logActivity(
        userPayload, 
        "Auth", 
        "LOGOUT", 
        `User ${userPayload.username} manually logged out and cleared session.`
      );

      await redis.del(redisKey);
      clearSessionCache(userId);
      
      console.log(`🗑️ Session deleted from Upstash Redis for user ID: ${userId}`);
      console.log(`📝 Audit Log Created: [Auth LOGOUT] ni ${userPayload.username}`);
      
      return res.status(200).json({ message: "Logged out successfully. Session cleared." });
    } else {
      return res.status(401).json({ message: "No active session found." });
    }
  } catch (error) {
    console.error("Logout Error sa Controller:", error);
    res.status(500).json({ message: "Logout Error", error: error.message });
  }
};
