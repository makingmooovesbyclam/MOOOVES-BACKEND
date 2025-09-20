// models/company.js
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  account_number: { type: String, required: true },
  bank_code: { type: String, required: true },
  account_name: { type: String, required: true },
  recipientCode: { type: String, required: true }, // Paystack recipient_code
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);