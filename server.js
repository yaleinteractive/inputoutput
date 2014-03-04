var http = require('http');
var path = require('path');

var socketio = require('socket.io');
var express = require('express');

var MongoClient = require('mongodb').MongoClient;

// Configure the Express web server
var router = express();
var server = http.createServer(router);

// Tell Express to serve static assets
router.use(express.static(path.resolve(__dirname, 'client')));

// Tell Socket.IO to listen for websockets
var io = socketio.listen(server);

// Global variables
var sockets = [];

MongoClient.connect('mongodb://networks:yalent@ds033069.mongolab.com:33069/networks', function(err, db) {
    if (err) throw err;
    
    // Get a reference to the messages collection in the database
    var messages = db.collection('messages');
    
    // Whenever a new client connects
    io.on('connection', function(socket) {
    
      // Add this client to our list of clients
      sockets.push(socket);

      // Listen for when this client disconnects
      socket.on('disconnect', function() {
        // Remove this client from our list of clients
        sockets.splice(sockets.indexOf(socket), 1);
      });
      
      // Send this client a list of all messages so far, by querying the database
      // and going through each result.
      messages.find().sort({time: 1}).each(function(err, message) {
         if (err) throw err;
         
         socket.emit('message', message);
         
      });
    
      // Listen for when this client sends a message
      socket.on('message', function(message) {
        
        // Build a message from the input (in case we want to transform it)
        var newMessage = {
          name: message.name,
          text: message.text,
          color: message.color,
          time: new Date(),
        };
    
        // Broadcast this message to all clients
        sockets.forEach(function(socket) {
          socket.emit('message', newMessage);
        });
        
        // Store this message in the database (in the messages collection)
        messages.insert(newMessage, function(err, inserted) {
          if (err) throw err; 
        });
    
      });
    
    });
    
    // Start our web server
    server.listen(process.env.PORT);

});
