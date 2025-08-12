//IMPORT MONGOOSE
const mongoose = require('mongoose');

const userSchema =  new mongoose.Schema({
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
   


}, {timestamps: true});

const userModel = mongoose.model('User', userSchema)

module.exports = userModel;