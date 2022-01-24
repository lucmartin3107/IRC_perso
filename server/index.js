const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');

const mongoose = require('mongoose');
const mongoDB = 'mongodb+srv://luc:KbROBXsrZ9umwrwh@cluster0.bts0l.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';
const Msg = require('./models/messages')
mongoose.connect(mongoDB).then(() => {
  console.log('connecte to mongo db')
}).catch(err => console.log(err));

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');

const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on('connect', (socket) => {
  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if(error) return callback(error);

    socket.join(user.room);

    socket.emit('message', { user: 'admin', text: `${user.name}, welcome to room ${user.room}.`});
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!` });

    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);
    const msg = new Msg({msg:message, author:user.id, room: user.room});
    msg.save().then(()=>{
      io.to(user.room).emit('message', { user: user.name, text: message });
    })
    

    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if(user) {
      io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left.` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    }
  })
});

server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));