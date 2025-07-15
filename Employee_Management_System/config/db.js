const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'Emp', // <-- 🔥 Your actual DB name!
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected...");
  } catch (error) {
    console.error("❌ MongoDB Error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
