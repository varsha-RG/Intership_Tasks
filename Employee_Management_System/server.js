const express = require("express");
const path = require("path");
const app = express();
const connectDB = require("./config/db");
const cors = require("cors");

require("dotenv").config();
connectDB();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// API routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/employees", require("./routes/employeeRoutes"));

// HTML Pages (corrected folder: views/pages)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "dashboard.html"));
});

app.get("/add", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "add.html"));
});

app.get("/update", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "pages", "update.html"));
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send("404 - Page Not Found");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
