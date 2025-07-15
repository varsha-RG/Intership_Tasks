const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// SIGNUP CONTROLLER
exports.signup = async (req, res) => {
  const { username, email, password } = req.body;

  console.log("📥 Incoming signup request:", { username, email, password });

  try {
    // Check if user exists with the same email
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      console.log("❗ User already exists with email:", email);
      return res.status(400).json({ message: "User with this email already exists" });
    }
    
    // Check if user exists with the same username
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      console.log("❗ User already exists with username:", username);
      return res.status(400).json({ message: "Username is already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    console.log("✅ User created:", user);

    const token = generateToken(user);
    console.log("🔐 Token generated:", token);

    res.status(201).json({ message: "Signup successful", token });
  } catch (err) {
    console.error("🔥 SERVER CRASHED IN SIGNUP:", err);
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
};


// LOGIN CONTROLLER
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    // RETURNING RESPONSE
    return res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    return res.status(500).json({ message: "Login failed", error: err.message });
  }
};
