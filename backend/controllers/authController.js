import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";
import { logActivity } from "../utils/logger.js"; 

// ==========================================
// 1. SIGNUP USER
// ==========================================
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

    // Maliit na titik para tanggapin ng ActivityLog schema validation
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

// ==========================================
// 2. LOGIN USER (WITH SECURE BACKEND-LEVEL LOCKOUT)
// ==========================================
export const loginUser = async (req, res) => {
  try {
    const { Username, Password } = req.body;
    if (!Username || !Password) {
      return res.status(400).json({ message: "Please provide both username and password" });
    }

    // 🌟 1. REDIS SECURITY CHECK: I-check muna kung naka-lockout ang username na ito
    const lockoutKey = `lockout:${Username}`;
    const attemptsKey = `attempts:${Username}`;

    const isLocked = await redis.get(lockoutKey);
    if (isLocked) {
      // Kukunin natin kung ilang segundo na lang ang natitira sa lock
      const ttl = await redis.ttl(lockoutKey); 
      const minutesLeft = Math.ceil(ttl / 60);
      return res.status(423).json({ 
        message: `Too many failed attempts. Your account is locked. Please try again after ${minutesLeft} minutes.` 
      });
    }

    // 2. I-check kung umiiral ang user
    const user = await User.findOne({ Username });
    if (!user) {
      // Safe generic message para sa enumeration attacks, pero pinatitira pa rin ang counter
      await handleFailedAttempt(Username, redis);
      return res.status(401).json({ message: "Invalid credentials (Username not found)" });
    }

    // 3. I-verify ang Password gamit ang bcrypt
    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) {
      // 🌟 2. WRONG PASSWORD: Mag-plu-plus 1 sa failed attempts sa Redis
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
    
    // 🌟 4. SUCCESSFUL LOGIN: I-clear ang attempts record sa Redis dahil tama na ang login
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

// 🌟 HELPER FUNCTION: Tagabilang ng attempts at tagalock sa Redis
const handleFailedAttempt = async (username, redisInstance) => {
  const attemptsKey = `attempts:${username}`;
  const lockoutKey = `lockout:${username}`;

  // Magdagdag ng +1 sa attempt count ng user. Kung wala pa, magsisimula ito sa 1.
  const currentAttempts = await redisInstance.incr(attemptsKey);

  // Kung unang beses pa lang magkamali, bigyan ng 15 minutes window para mag-expire ang counter
  if (currentAttempts === 1) {
    await redisInstance.expire(attemptsKey, 900); // 15 minutes para marefresh ang limits kung di natuloy ang 6 mistakes
  }

  // Kapag umabot o lumampas sa 6 na mali, i-activate ang Lockout Key ng 10 minuto (600 segundo)
  if (currentAttempts >= 6) {
    await redisInstance.set(lockoutKey, "locked", { ex: 600 });
    await redisInstance.del(attemptsKey); // I-reset ang attempt counter pagka-lock
  }

  return currentAttempts;
};

// ==========================================
// 3. LOGOUT USER (ITO ANG PINAKAMAHALAGANG FIX ✨)
// ==========================================
export const logoutUser = async (req, res) => {
  try {
    if (req.user) {
      const userId = req.user._id;
      const redisKey = `session:${userId}`;
      
      // 🚨 FIX: Ginawang MALIIT ang simula ng keys ('username' at 'role')
      // para pumasa sa require validation ng database schema mo!
      const userPayload = {
        username: req.user.Username || req.user.username,
        role: req.user.SystemRole || req.user.role
      };

      // I-save ang LOGOUT state bago burahin ang redis key
      await logActivity(
        userPayload, 
        "Auth", 
        "LOGOUT", 
        `User ${userPayload.username} manually logged out and cleared session.`
      );

      // Burahin ang session sa Upstash Redis sa cloud
      await redis.del(redisKey);
      
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