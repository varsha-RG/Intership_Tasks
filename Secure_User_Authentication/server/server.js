const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const { protect, adminOnly } = require("./middleware/authMiddleware");

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:5500", // where http-server is serving from
  credentials: true
}));

app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);

app.get("/api/protected", protect, (req, res) => {
  res.json({ message: `Hello ${req.user.role}, this is a protected route.` });
});

app.get("/api/admin", protect, adminOnly, (req, res) => {
  res.json({ message: "Welcome Admin, this is a restricted route." });
});

// Static File Serving (AFTER API routes!)
app.use(express.static(path.join(__dirname, '../client')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// DB & Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT, () =>
      console.log(`🚀 Server running on port ${process.env.PORT}`)
    );
  })
  .catch(err => console.error("DB connection error:", err));
