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
        required: false,
    },
     isLoggedIn: {
      type: Boolean, // Changed from STRING to BOOLEAN
      defaultValue: false 
    },
    // For payouts
  bankAccount: {
    accountName: String,
    accountNumber: String,
    bankCode: String,       // e.g. "058" for GTBank
    recipientCode: String   // Returned by Paystack when you create a transfer recipient
  },
   approvedByAdmin:{type:Boolean,default:true},

   otpCode: { type: String },
otpExpires: { type: Date },
   
}, { timestamps: true });
const Host = mongoose.model('host', hostSchema)
module.exports = Host