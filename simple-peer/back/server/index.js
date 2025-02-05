const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("signal", (data) => {
    io.to(data.userToSignal).emit("signal", {
      signal: data.signal,
      callerId: socket.id,
    });
  });

  socket.on("return-signal", (data) => {
    io.to(data.callerId).emit("return-signal", {
      signal: data.signal,
      id: socket.id,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Usuário desconectado: ${socket.id}`);
  });
});

server.listen(5000, () => console.log("Servidor rodando na porta 5000"));
