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

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on("connect", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    Room.countDocuments({ name: room }, function (err, count) {
      if (count > 0) {

          Room.findOneAndUpdate(
            { name: room },
            { $addToSet: { users: user.name } },
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
        
        socket.emit("message", { user: `${doc[i].author}`, text: `${doc[i].msg}` });
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

    if (message.includes('/nick')) {
      let str = message.substr(6);
      if (str !== "") {
        Room.findOneAndUpdate(
          { name: user.room },
          { $pull: { users: user.name }},
          () => {}
        );
        Room.findOneAndUpdate(
          { name: user.room },
          { $push: { users: str }},
          () => {}
        );
        Msg.find({ room: user.room, author: user.name }, (err, doc) => {
          for (let i = 0; i < doc.length; i++) {
            
            doc[i].update({}, {$set: {author:str}})
            console.log(doc[i])
          }
          if (err) console.log(err);
        });
        

        user.name = str;
      }
      else {
        socket.emit("message", {
          user: "Le modérateur",
          text: `Veuillez choisir un nom "/nick nom".`,
        });
      }
    }
    else if (message.substr(0, 5) === '/list')
    {
      let str = message.substr(6);
      if (str !== ''){
      
        Room.find({ name: {$regex: new RegExp(str)}},(err, doc) => {
          for (let i = 0; i < doc.length; i++) {
            socket.emit("message", { user: "", text: `${doc[i].name}` });
          }
          if (err) console.log(err);
        });
      } else {
        Room.find({},(err, doc) => {
        for (let i = 0; i < doc.length; i++) {
          socket.emit("message", { user: "", text: `${doc[i].name}` });
        }
        if (err) console.log(err);
      });
      }
    }

    else if (message.substr(0, 4) === '/msg')
    {
      socket.emit("private message", {
        //           content,
        //           to: str,
                });
    //   let str = message.substr(5);
    //   const arr = str.split(' ');
    //   let recep = arr[0];
    //   let content = '';

    //   arr.forEach(element => {
    //     if (element === arr[0]){}
    //     else if (element != arr[arr.length -1]) {
    //       content += element + ' ';
    //     } else {
    //       content += element;
    //     }
    //   });
    //   if (str !== ''){
    //     Room.findOne({ name: user.room }, (err, doc) => {
    //       if (doc.users.includes(str) ===true) {
    //         socket.emit("private message", {
    //           content,
    //           to: str,
    //         });
    //       }
    //       if (err) console.log(err);
    //     });
    //   }
    }

    else if (message.substr(0, 7) === '/create') {
      let str = message.substr(8);
      if (str !== '') {
        if (user) { 
          Room.countDocuments({ name: str }, function (err, count) {
            if (count > 0) {
                
                Room.findOneAndUpdate(
                  { name: str },
                  { $addToSet: { users: user.name } },
                  () => {}
                  );

              } else {
              const roomy = new Room({ name: str });
              roomy.users.push(user.name);
              roomy.save().then(() => {});
            }
          });
        }
      }            
    }
    else if (message.substr(0, 7) === '/delete') {
      let str = message.substr(8);
      if (str !== '') {
        Room.countDocuments({ name: str }, function (err, count) {
          if (count === 1) {
            Room.findOneAndDelete({ name: str },
              function (err, docs) {
                if (err){
                    console.log(err)
                }
                else{
                  if (user.room === str) {
                    var destination = '/';
                    socket.emit('redirect', destination);
                  }
                }
              }
            );
          }
        });
      } 
    }
    else if (message.substr(0, 5) === '/join') {
      let str = message.substr(6);
      if (str !== '') {
        user.room = str;
        console.log(user.room)
        Room.countDocuments(  { name: str }, function (err, count) {
          if (count > 0) {
            Room.findOneAndUpdate(
              { name: str },
              { $addToSet: { users: user.name } },
              () => {}
            );
          } else {
            const roomy = new Room({ name: str });
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
            socket.emit("message", { user: `${doc[i].author}`, text: `${doc[i].msg}` });
          }
          if (err) console.log(err);
        });
        io.to(user.room).emit("roomData", {
          room: user.room,
          users: getUsersInRoom(user.room),
        });
        callback();
      }
      var destination = `/chat?name=${user.name}&room=${user.room}`;
        socket.emit('redirect', destination);
    }
    
    else if (message === "/quit") {
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
        var destination = '/';
        socket.emit('redirect', destination);
      }
    }
    else if (message === "/users") {
      Room.findOne({ name: user.room }, (err, doc) => {
        for (let i = 0; i < doc.users.length; i++) {
          socket.emit("message", { user: "", text: `${doc.users[i]}` });
        }
        if (err) console.log(err);
      });
    }

    else {
      msg.save().then(() => {
        io.to(user.room).emit("message", { user: user.name, text: message });
      });
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
