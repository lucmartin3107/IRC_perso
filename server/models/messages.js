const mongoose = require("mongoose");
const msgSchema = new mongoose.Schema({
  msg: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  room: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: new Date(),
    required: true,
  },
});

const Msg = mongoose.model("msg", msgSchema);
module.exports = Msg;
