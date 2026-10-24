const mongoose = require("mongoose");

const { Schema } = mongoose;

// A claim is someone saying "that found item is mine". The finder decides.
// Phone numbers are exchanged only when status becomes "approved".
const claimSchema = new Schema(
  {
    foundItem: {
      type: Schema.Types.ObjectId,
      ref: "FoundItem",
      required: true,
    },

    lostItem: {
      type: Schema.Types.ObjectId,
      ref: "LostItem",
    },

    claimant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    finder: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // What only the owner would know: marks, contents, a lock-screen photo.
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    decidedAt: Date,
  },
  { timestamps: true },
);

// One claim per person per item. A rejected claim cannot be re-sent.
claimSchema.index({ foundItem: 1, claimant: 1 }, { unique: true });
claimSchema.index({ finder: 1, status: 1 });
claimSchema.index({ claimant: 1 });

module.exports = mongoose.model("Claim", claimSchema);
