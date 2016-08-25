// Check the configuration file for more details
var config = require('./config');

var express = require('express');
var app = express();
// Express.js stuff
var server = require('http').Server(app);
// var mongoose = require('mongoose');
// mongoose.connect(config.db, { db: { nativeParser: true } });

// Websockets with socket.io
var io = require('socket.io')(server);
var jwt = require('jsonwebtoken');
// var Chat = require('./models/Chat');

console.log("Trying to start server with config:", config.serverip + ":" + config.serverport);

// Both port and ip are needed for the OpenShift, otherwise it tries 
// to bind server on IP 0.0.0.0 (or something) and fails
server.listen(config.serverport, config.serverip, function() {
  console.log("Server running @ http://" + config.serverip + ":" + config.serverport);
});

io.on('connection', function(socket) {
  socket.on('chat mounted', function(user) {
    socket.emit('receive socket', socket.id)
  });
  socket.on('leave channel', function(channel) {
    socket.leave(channel);
  });
  socket.on('join channel', function(channel) {
    socket.join(channel);
  });
  socket.on('new message', function(data) {
    var message = data.message;
    var chatId = data.chatId;
    var userToken = data.token;

    jwt.verify(userToken, config.sharedSecret, function(err, decoded) {
      if (err) {
        console.error('Token validation failed: ' + err);
      } else {
        var userId = decoded.sub;
        //Chat.createMessage(chatId, userId, message).then(function() {
          socket.broadcast.to(msg.channelID).emit('new bc message', msg);
        // }).catch(function (e) { console.error('Error while saving message: ' + e); });
      }
    });
  });
  socket.on('new channel', function(channel) {
    socket.broadcast.emit('new channel', channel);
  });
  socket.on('typing', function (data) {
    socket.broadcast.to(data.channel).emit('typing bc', data.user);
  });
  socket.on('stop typing', function (data) {
    socket.broadcast.to(data.channel).emit('stop typing bc', data.user);
  });
  socket.on('new private channel', function(socketID, channel) {
    socket.broadcast.to(socketID).emit('receive private channel', channel);
  });
});
