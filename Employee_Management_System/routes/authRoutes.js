const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin"); // <- this should point to models/Admin.js
const { login } = require("../controllers/authController");

// ✅ TEMP route to create a default admin
router.get("/create-admin", async (req, res) => {
  const email = "admin@example.com";
  const plainPassword = "admin123";

  const existing = await Admin.findOne({ email });
  if (existing) return res.json({ msg: "Admin already exists" });

  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  const newAdmin = new Admin({ email, password: hashedPassword });

  await newAdmin.save(); // MongoDB will now create the 'admins' collection if missing
  res.json({ msg: "✅ Admin created successfully!" });
});

// 🧾 Login route
router.post("/login", login);

module.exports = router;
