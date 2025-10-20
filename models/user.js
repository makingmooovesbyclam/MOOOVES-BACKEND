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
     isLoggedIn: {
      type: Boolean, // Changed from STRING to BOOLEAN
      defaultValue: false 
    },
    password:{
        type: String,
        required: false,
    },
    otpCode: { type: String },
otpExpires: { type: Date },
    // For payouts
  bankAccount: {
    accountName: String,
    accountNumber: String,
    bankCode: String,       // e.g. "058" for GTBank
    recipientCode: String   // Returned by Paystack when you create a transfer recipient
  },
   tournamentsJoinedCount: {type:Number,default:0},

canHostTournament: {type:Boolean,default:false}

}, {timestamps: true});

const userModel = mongoose.model('User', userSchema)

module.exports = userModel;