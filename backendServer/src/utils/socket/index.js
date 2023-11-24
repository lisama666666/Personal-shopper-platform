const Server = require("socket.io");
const io = new Server();
const generalService = require("../../services/generalOperation");

let Sockets = {};
let SocketArray = {};
var Socket = {
  emitToAdmin: function (event, data) {
    let socketId = Sockets["admin"];
    console.log("==== Admin socket found =====", socketId, event);
    if (socketId) {
      if (io.sockets && io.sockets.connected[socketId]) {
        io.sockets.connected[socketId].emit(event, data);
      }
    } else {
      console.log("======= Admin not login ======");
    }
  },
  emitToCreator: function (event, creatorId, data) {
    let socketId = Sockets[creatorId];
    console.log("==== Admin socket found =====", socketId, event);
    if (socketId) {
      if (io.sockets && io.sockets.connected[socketId]) {
        io.sockets.connected[socketId].emit(event, data);
      }
    } else {
      console.log("======= Admin not login ======");
    }
  },
  emitToCustomer: function (event, customerId, data) {
    let socketId = Sockets[customerId];
    console.log("==== Admin socket found =====", socketId, event);
    if (socketId) {
      if (io.sockets && io.sockets.connected[socketId]) {
        io.sockets.connected[socketId].emit(event, data);
      }
    } else {
      console.log("======= Admin not login ======");
    }
  },
};

io.on("connection", function (socket) {
  console.log("========Hand Shake successfully", socket.handshake.query.name);

  Sockets[socket.handshake.query.name] = socket.id;
  SocketArray[socket.handshake.query.name] = socket;

  socket.on("disconnect", function (data) {
    // your action on user disconnect
    console.log("======= Socket disconnected =======", data, socket.handshake.query.clientId);
  });
});

exports.Socket = Socket;
exports.io = io;
