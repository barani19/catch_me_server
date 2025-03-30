const express = require('express');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const http = require('http');
const Game = require('./model/game_model');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
  }
})

const DB = 'mongodb+srv://mkbarani1234:Barani123@cluster0.ah0uc.mongodb.net/mydatabase?retryWrites=true&w=majority';



const connectDB = async () => {
  try {
    await mongoose.connect(DB);
    console.log("✅ MongoDB connected...");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);

    // Retry after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

// // Connect to MongoDB
// connectDB();




// const DB = 'mongodb+srv://mkbarani1234:Barani123@cluster0.ah0uc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(DB).then(() => {
  console.log('mongodb connected successfully');
}).catch(() => {
  console.log('mongodb not connected...');
})

io.on('connection', (socket) => {
  console.log(socket.id);

  socket.on('create-game', async ({ NickName }) => {
    try {
      console.log(NickName)
      let game = new Game();
      var player = {
        NickName: NickName,
        socketId: socket.id,
        currRow: 0,
        currCol: 0,
        isPartyLeader: true
      }
      game.players.push(player);
      game = await game.save();

      var gameId = game._id.toString();
      socket.join(gameId);
      io.to(gameId).emit('updateGame', game);
    } catch (e) {
      console.log(e);
    }
  })

  socket.on('join-game', async ({ NickName, gameId }) => {
    try {
      // Validate game ID format
      if (!gameId.match(/^[0-9a-fA-F]{24}$/)) {
        socket.emit('not CorrectGame', "Please enter a valid game ID");
        return;
      }

      // Fetch the existing game from the database
      let game = await Game.findById(gameId);

      // Check if game exists
      if (!game) {
        socket.emit('not CorrectGame', "Game not found.");
        return;
      }

      // Check if joining is allowed
      if (game.isJoin && game.players.length < 2) {
        console.log(NickName);

        var player = {
          NickName: NickName,
          socketId: socket.id,
          currRow: 4,
          currCol: 4,
          isPartyLeader: false
        };

        socket.join(gameId);
        game.players.push(player);


        game = await game.save();

        io.to(gameId).emit('updateGame', game);
      } else {
        socket.emit('room-full', 'Room is full, try again later.');
      }
    } catch (e) {
      console.log(e);
      socket.emit('error', 'An error occurred while joining the game.');
    }
  });


  socket.on('timer', async ({ playerId, gameId }) => {
    let countDown = 5;
    let game = await Game.findById(gameId);
    let player = game.players.id(playerId);
    if (player.isPartyLeader) {
      var time = setInterval(async () => {
        if (countDown >= 0) {
          io.to(gameId).emit('timer', {
            countDown,
            Msg: 'Game starts soon...'
          });
          console.log(countDown);
          countDown--;
        } else {
          game.isJoin = false;
          game = await game.save();
          io.to(gameId).emit('updateGame', game);
          startGame(gameId);
          clearInterval(time);
        }
      }, 1000);
    }
  })

  const activeTimers = new Map(); // Store active timers

  const startGame = async (gameId) => {
    let game = await Game.findById(gameId);
    game.startTime = new Date().getTime();
    game = await game.save();
    var time = 120;

    const timer = setInterval(async () => {
      if (time >= 0) {
        var gameTime = calculateTime(time);
        io.to(gameId).emit('timer', {
          countDown: gameTime,
          Msg: 'Time Remaining',
        });
        console.log(gameTime);
        time--;
      } else {
        clearInterval(timer);
        activeTimers.delete(gameId); // Remove timer when game ends

        game.isOver = true;
        game = await game.save();
        io.to(gameId).emit('updateGame', game);
      }
    }, 1000);

    activeTimers.set(gameId, timer); // Store timer reference
  };

  socket.on('move', async ({ playerId, gameId, row, col }) => {
    try {
      let game = await Game.findById(gameId);
      if (!game) {
        socket.emit('error', 'Game not found.');
        return;
      }

      let player = game.players.id(playerId);
      if (!player) {
        socket.emit('error', 'Player not found in the game.');
        return;
      }

      // Update player position
      player.currRow = row;
      player.currCol = col;
      console.log(row);
      console.log(col);
      game = await game.save();
      io.to(gameId).emit('updateGame', game);
    } catch (e) {
      console.log('Error in move event:', e);
      socket.emit('error', 'An error occurred while moving.');
    }
  });

  // Stop timer when the game ends
  socket.on('game-over', async ({ gameId, winner }) => {
    if (activeTimers.has(gameId)) {
      clearInterval(activeTimers.get(gameId));
      activeTimers.delete(gameId);
    }

    var game = await Game.findById(gameId);
    game.isOver = true;
    game = await game.save();
    socket.emit('done');
    io.to(gameId).emit('updateGame', { game, winner });
  });



  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${socket.id}`);
  });

});


function calculateTime(time) {
  var min = Math.floor(time / 60);
  var sec = time % 60;
  return `${min} : ${sec < 10 ? '0' + sec : sec}`;
}

// CREATE PORT & START SERVER
const port = process.env.X_ZOHO_CATALYST_LISTEN_PORT || 2000;
server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://192.168.102.54:${port}`);
});
