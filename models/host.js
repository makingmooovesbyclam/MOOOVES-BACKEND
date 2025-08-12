const mongoose = require('mongoose');

const hostSchema = new mongoose.Schema({
    fullName:{
        type: String,
        required: true
    },
    email:{
        type: String,
        lowercase: true,
        required:true
    },
    password:{
        type: String,
        required: true,
    },
   
   
}, { timestamps: true });

module.exports = mongoose.model('host', hostSchema);