const Transaction = require('../models/transaction');
const Tournament = require('../models/tournament');
const axios = require('axios');
const crypto = require('crypto');
const Company = require('../models/company'); // we create this model

const secret_key = process.env.PAYSTACK_SECRET_KEY;
const formatDate = new Date().toLocaleString();

// ------------------ PAYMENT INITIALIZATION ------------------
exports.initialPayment = async (req, res) => {
  try {
    const { email, role, tournamentId, userId } = req.body;
    // role = 'host' | 'player'

    // Auto-decide amount
    let amount;
    if (role === 'host') amount = 1000;
    else if (role === 'player') amount = 500;
    else return res.status(400).json({ message: "Invalid role. Must be 'host' or 'player'" });

    // Prevent duplicate payments
    const existing = await Transaction.findOne({
      user: userId,
      tournament: tournamentId || null,
      status: 'success',
      role,
      amount
    });

    if (existing) {
      return res.status(400).json({
        message: "You have already completed this payment",
        data: existing
      });
    }

    // Initialize Paystack
    const paymentData = { email, amount: amount * 100 };
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      paymentData,
      { headers: { Authorization: `Bearer ${secret_key}` } }
    );

    const { data } = response;

    // Save to DB
    const payment = new Transaction({
      user: userId,
      tournament: tournamentId || null,
      email,
      role,
      amount,
      reference: data.data.reference,
      paymentDate: formatDate,
      status: 'pending'
    });

    await payment.save();

    res.status(201).json({
      message: "Payment initialized successfully",
      data: {
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
        userId,
        tournamentId,
        amount
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Error initializing payment" });
  }
};

// ------------------ VERIFY PAYMENT ------------------
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.query;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${secret_key}` } }
    );

    const { data } = response;
    let payment;

    if (data.data.status === 'success') {
      payment = await Transaction.findOneAndUpdate(
        { reference },
        { status: 'success' },
        { new: true }
      ).populate('user tournament', 'id email name');

      return res.status(200).json({
        message: 'Payment verified successfully',
        data: payment
      });
    } else {
      payment = await Transaction.findOneAndUpdate(
        { reference },
        { status: 'failed' },
        { new: true }
      );
      return res.status(400).json({
        message: 'Payment failed',
        data: payment
      });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Error verifying payment" });
  }
};

// ------------------ DISTRIBUTE PAYOUTS ------------------
exports.distributePayouts = async (tournamentId, winners, io) => {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    // All successful payments linked to this tournament
    const payments = await Transaction.find({
      tournament: tournamentId,
      status: 'success'
    });

    const totalPool = payments.reduce((sum, t) => sum + t.amount, 0);

    // Percentages
    const payouts = {
      host: totalPool * 0.5,
      first: totalPool * 0.2,
      second: totalPool * 0.12,
      third: totalPool * 0.08,
      platform: totalPool * 0.1
    };

    // ---------------- HOST PAYOUT ----------------
    const hostPayment = payments.find(p => p.role === 'host');
    if (hostPayment) {
      hostPayment.payoutAmount = payouts.host;
      await hostPayment.save();

      if (hostPayment.recipientCode) {
        await sendPayout(hostPayment.recipientCode, payouts.host);
      }

      io.to(tournamentId.toString()).emit("payout", {
        tournamentId,
        userId: hostPayment.user,
        role: 'host',
        amount: payouts.host
      });
    }

    // ---------------- WINNERS PAYOUT ----------------
    if (winners.first) await payWinner(winners.first, tournamentId, payouts.first, '1st', io);
    if (winners.second) await payWinner(winners.second, tournamentId, payouts.second, '2nd', io);
    if (winners.third) await payWinner(winners.third, tournamentId, payouts.third, '3rd', io);

    // ---------------- PLATFORM SHARE ----------------
   const company = await Company.findOne();
  if (company?.recipientCode) {
    await sendPayout(company.recipientCode, payouts.platform);
    console.log(`Platform earned ₦${payouts.platform} → sent to company account`);
  } else {
    console.log("Company recipient code not set. Platform payout skipped.");
  }

  } catch (err) {
    console.error("Payout distribution error:", err.message);
    throw err;
  }
};

// ------------------ PAY WINNER HELPER ------------------
async function payWinner(userId, tournamentId, amount, position, io) {
  const tx = await Transaction.findOne({ tournament: tournamentId, user: userId });
  if (tx) {
    tx.payoutAmount = amount;
    await tx.save();

    if (tx.recipientCode) {
      await sendPayout(tx.recipientCode, amount);
    }

    io.to(tournamentId.toString()).emit("payout", {
      tournamentId,
      userId,
      role: 'player',
      position,
      amount
    });
  }
}

// ------------------ SEND PAYOUT ------------------
async function sendPayout(recipientCode, amount) {
  try {
    const response = await axios.post(
      'https://api.paystack.co/transfer',
      {
        source: 'balance',
        amount: amount * 100, // Paystack expects kobo
        recipient: recipientCode,
        reason: 'Tournament winnings payout'
      },
      { headers: { Authorization: `Bearer ${secret_key}` } }
    );

    console.log("Transfer successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("Transfer error:", error.response?.data || error.message);
    throw error;
  }
}

// ------------------ HANDLE WEBHOOK ------------------
exports.handleWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Verify signature
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const { reference, amount } = event.data;
      await Transaction.findOneAndUpdate(
        { reference },
        { status: 'success', amount: amount / 100 },
        { new: true }
      );
    }

    if (event.event === 'charge.failed') {
      const { reference } = event.data;
      await Transaction.findOneAndUpdate({ reference }, { status: 'failed' });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.sendStatus(500);
  }
};



// controllers/bankController.js

const Host = require('../models/host');
const User = require('../models/user');


// controllers/bankController.js
const axios = require('axios');


// ✅ Fetch list of Nigerian banks
exports.getBanks = async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.paystack.co/bank?currency=NGN",
      { headers: { Authorization:` Bearer ${secret_key}` } }
    );

    const banks = response.data.data.map(b => ({
      name: b.name,
      code: b.code,
      slug: b.slug
    }));

    res.status(200).json({
      message: "Banks fetched successfully",
      banks
    });
  } catch (error) {
    console.error("Get banks error:", error.response?.data || error.message);
    res.status(500).json({ message: "Error fetching bank list" });
  }
};


// Add or update bank details
exports.addBankDetails = async (req, res) => {
  try {
    const { accountNumber, bankCode, role, userId } = req.body;
    // role = "host" | "user"

    // Create transfer recipient on Paystack
    const response = await axios.post(
      'https://api.paystack.co/transferrecipient',
      {
        type: 'nuban',
        name: req.user?.name || 'Tournament User',
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN'
      },
      { headers: { Authorization: `Bearer ${secret_key}` } }
    );

    const { data } = response;

    if (!data.status) {
      return res.status(400).json({ message: "Failed to create transfer recipient", data });
    }

    const recipientCode = data.data.recipient_code;

    // Save to DB
    if (role === 'host') {
      await Host.findByIdAndUpdate(userId, {
        bankAccount: { accountNumber, bankCode, recipientCode }
      });
    } else {
      await User.findByIdAndUpdate(userId, {
        bankAccount: { accountNumber, bankCode, recipientCode }
      });
    }

    res.status(200).json({
      message: "Bank details saved successfully",
      recipientCode
    });
  } catch (error) {
    console.error("Bank details error:", error.response?.data || error.message);
    res.status(500).json({ message: "Error adding bank details" });
  }
};


// controllers/bankController.js

// ✅ Verify account number + bank code
exports.verifyAccount = async (req, res) => {
  try {
    const { account_number, bank_code } = req.body;

    if (!account_number || !bank_code) {
      return res.status(400).json({ message: "Account number and bank code are required" });
    }

    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      { headers: { Authorization: `Bearer ${secret_key}` } }
    );

    const account = response.data.data;

    res.status(200).json({
      message: "Account verified successfully",
      account_name: account.account_name,
      account_number: account.account_number,
      bank_code
    });
  } catch (error) {
    console.error("Account verification error:", error.response?.data || error.message);
    res.status(400).json({
      message: "Invalid account details",
      error: error.response?.data || error.message
    });
  }
};



// controllers/company.controller.js



// Register Company Bank Account
exports.registerCompanyBank = async (req, res) => {
  try {
    const { account_number, bank_code, account_name } = req.body;

    // Step 1: Create transfer recipient on Paystack
    const response = await axios.post(
      'https://api.paystack.co/transferrecipient',
      {
        type: 'nuban',
        name: account_name,
        account_number,
        bank_code,
        currency: 'NGN'
      },
      { headers: { Authorization:` Bearer ${secret_key}` } }
    );

    const { recipient_code } = response.data.data;

    // Step 2: Save to DB
    let company = await Company.findOne();
    if (!company) {
      company = new Company({ account_number, bank_code, account_name, recipientCode: recipient_code });
    } else {
      company.account_number = account_number;
      company.bank_code = bank_code;
      company.account_name = account_name;
      company.recipientCode = recipient_code;
    }
    await company.save();

    res.status(201).json({
      message: "Company bank registered successfully",
      data: company
    });
  } catch (error) {
    console.error("Company bank registration error:", error.response?.data || error.message);
    res.status(500).json({ message: "Error registering company bank" });
  }
};