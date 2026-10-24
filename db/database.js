const mongoose = require("mongoose");

// Unique indexes from the Firebase-era User model. They would reject new Google users.
const LEGACY_USER_INDEXES = ["username_1", "phoneNumber_1"];

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    for (const name of LEGACY_USER_INDEXES) {
      try {
        await mongoose.connection.collection("users").dropIndex(name);
        console.log(`Dropped legacy index users.${name}`);
      } catch {
        // Already gone, or the collection does not exist yet.
      }
    }
  } catch (error) {
    console.error("Database connection failed", error.message);
    process.exit(1);
  }
};

module.exports = connectDb;
