const mongoose = require("mongoose");
const { Schema } = mongoose;

const foundItemSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },

      coordinates: {
        type: [Number],
        required: true,
      },

      address: {
        type: String,
        required: true,
      },

      source: {
        type: String,
        required: true,
      },
    },

    description: {
      category: {
        type: String,
        required: true,
      },

      details: {
        type: String,
        required: true,
      },

      lostDate: {
        type: Date,
        required: true,
      },
    },

    // Vectors used to rank matches. Not sent to clients (select: false).
    embedding: {
      type: {
        model: String,
        text: [Number],
        image: [Number],
      },
      select: false,
    },

    status: {
      type: String,
      enum: ["open", "claimed"],
      default: "open",
    },

    images: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true },
);

foundItemSchema.index({
  location: "2dsphere",
});

module.exports = mongoose.model("FoundItem", foundItemSchema);
