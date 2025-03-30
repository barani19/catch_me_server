const mongoose = require('mongoose');
const playerSchema = require('./player_model');

const gameSchema = new mongoose.Schema({
    players: [playerSchema],
    isJoin: {
        type: Boolean,
        default: true
    },
    isOver: {
        type: Boolean,
        default: false,
    },
    startTime: {
        type: Number,
    }

})

const gameModel = mongoose.model('Game', gameSchema);

module.exports = gameModel;