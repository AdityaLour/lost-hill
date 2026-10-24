const mongoose = require("mongoose");

const { Schema } = mongoose;

// Users sign in with Google only. The phone number is a profile field the user
// types in themselves. It is NOT verified, and it is only ever shown to the
// other party after a claim has been approved.
const userSchema = new Schema(
  {
    googleId: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    avatar: {
      type: String,
    },

    phoneNumber: {
      type: String,
      trim: true,
      match: /^\+?[0-9][0-9 ()-]{6,17}$/,
    },
  },
  {
    timestamps: true,
  },
);

// Partial index: old Firebase-era user documents have no googleId and must not collide.
userSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: "string" } } },
);

module.exports = mongoose.model("User", userSchema);
