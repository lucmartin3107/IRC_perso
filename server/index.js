const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const Date = mongoose.Date;
const mongoDB =
  "mongodb+srv://luc:KbROBXsrZ9umwrwh@cluster0.bts0l.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

const Msg = require("./models/messages");
const Room = require("./models/rooms");

mongoose
  .connect(mongoDB)
  .then(() => {
    console.log("connecte to mongo db");
  })
  .catch((err) => console.log(err));

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

const router = require("./router");
const { findOne } = require("./models/messages");
const { now } = require("underscore");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on("connect", (socket) => {
  // Msg.find().then((result) => {
  //   socket.emit('output-message', result)
  // })
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    Room.countDocuments({ name: room }, function (err, count) {
      if (count > 0) {
        Room.findOneAndUpdate(
          { name: room },
          { $push: { users: user.name } },
          () => {}
        );
      } else {
        const roomy = new Room({ name: room });
        roomy.users.push(user.name);
        roomy.save().then(() => {});
      }
    });

    socket.join(user.room);
    socket.emit("message", {
      user: "Le modérateur",
      text: `${user.name}, welcome to room ${user.room}.`,
    });
    socket.broadcast.to(user.room).emit("message", {
      user: "le modérateur",
      text: `${user.name} has joined!`,
    });
    Msg.find({ room: user.room }, (err, doc) => {
      for (let i = 0; i < doc.length; i++) {
        socket.emit("message", { user: `${user.name}`, text: `${doc[i].msg}` });
        console.log(doc[i].msg);
      }
      if (err) console.log(err);
    });
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    const msg = new Msg({
      msg: message,
      author: user.name,
      room: user.room,
    });
    switch (message) {
      case "/users":
        Room.findOne({ name: user.room }, (err, doc) => {
          for (let i = 0; i < doc.users.length; i++) {
            console.log(doc.users[i]);
            socket.emit("message", { user: "", text: `${doc.users[i]} jjj` });
          }

          if (err) console.log(err);
        });
        break;

      default:
        msg.save().then(() => {
          io.to(user.room).emit("message", { user: user.name, text: message });
        });
        break;
    }

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: "Le modérateur",
        text: `${user.name} has left.`,
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(process.env.PORT || 5000, () =>
  console.log(`Server has started.`)
);
