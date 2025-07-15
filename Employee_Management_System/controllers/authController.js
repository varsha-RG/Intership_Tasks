const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🚨 Login attempt:");
    console.log("Email:", email);
    console.log("Password:", password);

    if (!email || !password) {
      return res.status(400).json({ msg: "Missing email or password" });
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
    console.log("Admin found:", admin);

    if (!admin) return res.status(400).json({ msg: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    console.log("✅ Login success!");
    res.json({ token });
  } catch (err) {
    console.error("❌ Server error during login:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
