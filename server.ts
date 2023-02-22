import * as cors from "cors";
import * as express from "express";
import * as http from "http";
import { Server, Socket } from "socket.io";

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server);

const gameSessions = {};

io.on("connection", (socket: Socket) => {
  console.log("a user connected");

  // Send the list of available game sessions to the client
  socket.emit("availableSessions", gameSessions);

  socket.on("createGame", (playerName) => {
    const gameId = generateId();
    gameSessions[gameId] = {
      players: [playerName],
      name: `${playerName}'s Game`,
      gameId
    };
    socket.join(gameId);
    io.to(gameId).emit("gameCreated", gameSessions[gameId]);
    io.emit("availableSessions", gameSessions);
  });

  // Handle player joining or creating a new game session
  socket.on("joinGame", (gameId, playerName) => {
    gameSessions[gameId].players.push(playerName);
    socket.join(gameId);
    console.log(
      `${playerName} has joined ${gameSessions[gameId].name} with session id:${gameId}`
    );
    io.to(gameId).emit("playerJoined", gameSessions[gameId]);
    // Update the list of available game sessions and notify clients
    io.emit("availableSessions", gameSessions);
  });

  // Handle player leaving a game session
  socket.on("leaveGame", (gameId, playerName) => {
    if (gameSessions[gameId]) {
      const playerIndex = gameSessions[gameId].players.indexOf(playerName);
      if (playerIndex !== -1) {
        gameSessions[gameId].players.splice(playerIndex, 1);
        socket.leave(gameId);
        io.to(gameId).emit("playerLeft", playerName);
        if (gameSessions[gameId].players.length === 0) {
          delete gameSessions[gameId];
        }
        io.emit("availableSessions", gameSessions);
      }
    }
  });


  socket.on('ready',(gameId, playerName)=>{
    if (gameSessions[gameId]) {
      console.log(`[${gameId}] ${playerName} ready`)
      io.to(gameId).emit('playerReady',playerName);
    }
  })

  socket.on('shot',(gameId, playerName, cellX, cellY)=>{
    if (gameSessions[gameId]) {
      console.log(`[${gameId}] ${playerName} shot at (${cellX},${cellY})`)
      io.to(gameId).emit('shot',{playerName,cellX,cellY});
    }
  })

  socket.on('gameOver',(gameId, playerName)=>{
    if (gameSessions[gameId]) {
      console.log(`[${gameId}] ${playerName} Lost`)
      io.to(gameId).emit('gameOver',playerName);
    }
  })

  socket.on('destroyed',(gameId, playerName,shipType)=>{
    if (gameSessions[gameId]) {
      console.log(`[${gameId}] ${playerName}'s ${shipType} was destroyed`)
      io.to(gameId).emit('destroyed',{playerName,shipType});
    }
  })

  socket.on('shotResult',(gameId, playerName, result, shipType)=>{
    if (gameSessions[gameId]) {
      console.log(`[${gameId}] ${playerName}'s ${shipType? shipType+' was hit':'ships were missed'}`)
      io.to(gameId).emit('shotResult',{playerName, result, shipType});
    }
  })

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket server started on http://localhost:${PORT}`);
});

function generateId(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
