"use strict";
exports.__esModule = true;
var cors = require("cors");
var express = require("express");
var http = require("http");
var socket_io_1 = require("socket.io");
var app = express();
app.use(cors());
var server = http.createServer(app);
var io = new socket_io_1.Server(server);
var gameSessions = {};
io.on("connection", function (socket) {
    console.log("a user connected");
    // Send the list of available game sessions to the client
    socket.emit("availableSessions", gameSessions);
    socket.on("createGame", function (playerName) {
        var gameId = generateId();
        gameSessions[gameId] = {
            players: [playerName],
            name: "".concat(playerName, "'s Game"),
            gameId: gameId
        };
        socket.join(gameId);
        io.to(gameId).emit("gameCreated", gameSessions[gameId]);
        io.emit("availableSessions", gameSessions);
    });
    // Handle player joining or creating a new game session
    socket.on("joinGame", function (gameId, playerName) {
        gameSessions[gameId].players.push(playerName);
        socket.join(gameId);
        console.log("".concat(playerName, " has joined ").concat(gameSessions[gameId].name, " with session id:").concat(gameId));
        io.to(gameId).emit("playerJoined", gameSessions[gameId]);
        // Update the list of available game sessions and notify clients
        io.emit("availableSessions", gameSessions);
    });
    // Handle player leaving a game session
    socket.on("leaveGame", function (gameId, playerName) {
        if (gameSessions[gameId]) {
            var playerIndex = gameSessions[gameId].players.indexOf(playerName);
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
    socket.on('ready', function (gameId, playerName) {
        if (gameSessions[gameId]) {
            console.log("[".concat(gameId, "] ").concat(playerName, " ready"));
            io.to(gameId).emit('playerReady', playerName);
        }
    });
    socket.on('shot', function (gameId, playerName, cellX, cellY) {
        if (gameSessions[gameId]) {
            console.log("[".concat(gameId, "] ").concat(playerName, " shot at (").concat(cellX, ",").concat(cellY, ")"));
            io.to(gameId).emit('shot', { playerName: playerName, cellX: cellX, cellY: cellY });
        }
    });
    socket.on('gameOver', function (gameId, playerName) {
        if (gameSessions[gameId]) {
            console.log("[".concat(gameId, "] ").concat(playerName, " Lost"));
            io.to(gameId).emit('gameOver', playerName);
        }
    });
    socket.on('destroyed', function (gameId, playerName, shipType) {
        if (gameSessions[gameId]) {
            console.log("[".concat(gameId, "] ").concat(playerName, "'s ").concat(shipType, " was destroyed"));
            io.to(gameId).emit('destroyed', { playerName: playerName, shipType: shipType });
        }
    });
    socket.on('shotResult', function (gameId, playerName, result, shipType) {
        if (gameSessions[gameId]) {
            console.log("[".concat(gameId, "] ").concat(playerName, "'s ").concat(shipType, " was hit"));
            io.to(gameId).emit('shotResult', { playerName: playerName, result: result, shipType: shipType });
        }
    });
    socket.on("disconnect", function () {
        console.log("user disconnected");
    });
});
var PORT = process.env.PORT || 3000;
server.listen(PORT, function () {
    console.log("Socket server started on http://localhost:".concat(PORT));
});
function generateId() {
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var result = "";
    for (var i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
