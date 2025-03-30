const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
     NickName : {
        type : String
     },
     socketId :{
        type : String
     },
     currRow : {
        type : Number,
     },
     currCol : {
        type : Number,
     },
     isPartyLeader : {
        type : Boolean,
        default : false
     }
});

module.exports = playerSchema;

