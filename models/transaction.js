const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    tournament: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: false
    },
    email: {
        type: String,
        required: true
    },
    role:{
        type:String,
        enum:['host','player'],
        required:true
    },
    amount: {
        type: Number, // store in kobo (from Paystack) or naira (decide one system-wide)
        required: true
    },
    reference: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    payoutAmount:{
        type:Number,default:0
    },//how much this user finally earns
    channel: String,
    fees: Number
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;