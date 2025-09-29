const Transaction = require('../models/transaction');
const Tournament = require('../models/tournament');
const Company = require('../models/company'); // each user & platform has one
const axios = require('axios');

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const MOOOVES_WALLET_ID = process.env.MOOOVES_WALLET_ID; // platform’s wallet

// ------------------ INITIAL PAYMENT ------------------
exports.initialPayment = async (req, res) => {
  try {
    const { email, tournamentId, userId } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });

    // Prevent max players > 50
    if (tournament.participants.length >= 50) {
      return res.status(400).json({ message: "Tournament is full (max 50 players)" });
    }

    const amount = tournament.entryFee;
    if (!amount || amount < 500) {
      return res.status(400).json({ message: "Invalid entry fee" });
    }

    // Prevent duplicate payment
    const existing = await Transaction.findOne({ user: userId, tournament: tournamentId, status: 'success' });
    if (existing) {
      return res.status(400).json({ message: "You already paid for this tournament" });
    }

    // Init Flutterwave payment
    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: `tournament_${tournamentId}_${Date.now()}`,
        amount,
        currency: "NGN",
        redirect_url: process.env.FRONTEND_REDIRECT_URL,
        customer: { email },
        meta: { tournamentId, userId }
      },
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
    );

    // Save transaction
    const tx = new Transaction({
      user: userId,
      tournament: tournamentId,
      amount,
      email,
      reference: response.data.data.tx_ref,
      status: 'pending'
    });
    await tx.save();

    res.status(201).json({
      message: "Payment initialized",
      payment_link: response.data.data.link
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error initializing payment" });
  }
};

// ------------------ VERIFY PAYMENT ------------------
exports.verifyPayment = async (req, res) => {
  try {
    const { transaction_id } = req.query;

    const response = await axios.get(
     ` https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
    );

    const data = response.data.data;
    if (data.status !== 'successful') {
      return res.status(400).json({ message: "Payment not successful", data });
    }

    // Update transaction
    const payment = await Transaction.findOneAndUpdate(
      { reference: data.tx_ref },
      { status: 'success' },
      { new: true }
    );

    // Add to tournament pool
    const tournament = await Tournament.findById(payment.tournament);
    tournament.cashPool = (tournament.cashPool || 0) + data.amount;
    tournament.players.push(payment.user);
    await tournament.save();

    res.status(200).json({
      message: "Payment verified & added to pool",
      data: { payment, cashPool: tournament.cashPool }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error verifying payment" });
  }
};
// ------------------ DISTRIBUTE PAYOUTS ------------------
// ------------------ DISTRIBUTE PAYOUTS ------------------
// ------------------ DISTRIBUTE PAYMENTS ------------------
exports.distributePayment = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { winners } = req.body; // { first, second, third }
    const io = req.app.get("io");

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: "Tournament not found" });
    }

    // All successful payments (players only)
    const payments = await Transaction.find({ tournament: tournamentId, status: "success" });
    const totalPool = payments.reduce((sum, t) => sum + t.amount, 0);

    const payouts = {
      host: totalPool * 0.5,
      first: totalPool * 0.2,
      second: totalPool * 0.12,
      third: totalPool * 0.08,
      platform: totalPool * 0.1,
    };

    // ---------------- HOST PAYOUT ----------------
    if (tournament.createdBy) {
      let hostDoc = null;
      if (tournament.createdByModel === "User") {
        hostDoc = await User.findById(tournament.createdBy);
      } else if (tournament.createdByModel === "Host") {
        hostDoc = await Host.findById(tournament.createdBy);
      }

      if (hostDoc?.recipientCode) {
        await sendPayout(hostDoc.recipientCode, payouts.host);
        io.to(tournamentId.toString()).emit("payout", {
          tournamentId,
          userId: tournament.createdBy,
          type: "host",
          amount: payouts.host,
        });
      } else {
        console.warn(`⚠️ Host ${tournament.createdBy} has no recipientCode, payout not sent`);
      }
    }

    // ---------------- WINNERS PAYOUT ----------------
    if (winners.first) await payWinner(winners.first, tournamentId, payouts.first, "1st", io);
    if (winners.second) await payWinner(winners.second, tournamentId, payouts.second, "2nd", io);
    if (winners.third) await payWinner(winners.third, tournamentId, payouts.third, "3rd", io);

    // ---------------- PLATFORM SHARE ----------------
    const company = await Company.findOne();
    if (company?.recipientCode) {
      await sendPayout(company.recipientCode, payouts.platform);
      console.log(`✅ Platform earned ₦${payouts.platform} → sent to company account`);
    } else {
      console.log("⚠️ Company recipient code not set. Platform payout skipped.");
    }

    return res.status(200).json({
      success: true,
      message: "Payout distribution completed",
      payouts,
    });
  } catch (err) {
    console.error("❌ distributePayment error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};
const Transaction = require("../models/transaction");


// ------------------ MANUAL PAYOUT ------------------
exports.sendPayout = async (req, res) => {
  try {
    const { accountBank, accountNumber, amount, narration } = req.body;
    const result = await sendPayout(accountBank, accountNumber, amount, narration);

    return res.status(200).json({
      success: true,
      message: "Payout initiated",
      data: result,
    });
  } catch (err) {
    console.error("❌ sendPayout error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------ INTERNAL HELPERS ------------------
async function payWinner(userId, tournamentId, amount, position, io) {
  const tx = await Transaction.findOne({ tournament: tournamentId, user: userId });
  if (!tx) {
    console.warn(`⚠️ No transaction found for ${position} place user ${userId}`);
    return;
  }

  tx.payoutAmount = amount;

  if (tx.recipientCode) {
    await sendPayout(tx.recipientCode, amount);
    tx.paidAt = new Date();
  } else {
    console.warn(`⚠️ Winner ${userId} (${position}) has no recipientCode, payout not sent`);
  }

  await tx.save();

  io.to(tournamentId.toString()).emit("payout", {
    tournamentId,
    userId,
    type: "player",
    position,
    amount,
  });
}

async function sendPayout(accountBank, accountNumber, amount, narration = "Tournament payout") {
  try {
    const response = await axios.post(
      "https://api.flutterwave.com/v3/transfers",
      {
        account_bank: accountBank,
        account_number: accountNumber,
        amount,
        currency: "NGN",
        narration,
        reference: `payout-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      },
      {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
      }
    );

    console.log("✅ Transfer initiated:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Transfer error:", error.response?.data || error.message);
    throw error;
  }
}
/**
 * Get all transactions for a tournament
 */
exports.getTournamentTransactions = async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const transactions = await Transaction.find({ tournament: tournamentId })
      .populate("user", "fullName email") // optional: include user info
      .sort({ createdAt: -1 });

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ message: "No transactions found for this tournament" });
    }

    res.status(200).json({
      message: "Transactions fetched successfully",
      count: transactions.length,
      transactions
    });
  } catch (err) {
    console.error("Get transactions error:", err.message);
    res.status(500).json({ message: "Error fetching transactions" });
  }
};
// ------------------ HANDLE WEBHOOK (FLUTTERWAVE) ------------------
exports.handleWebhook = async (req, res) => {
  try {
    const hash = req.headers["verif-hash"];
    if (!hash || hash !== process.env.FLW_SECRET_HASH) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = req.body;
    console.log("⚡ Webhook event received:", event.event);

    if (event.event === "charge.completed") {
      const { tx_ref, amount, status } = event.data;

      if (status === "successful") {
        await Transaction.findOneAndUpdate(
          { reference: tx_ref },
          { status: "success", amount },
          { new: true }
        );
        console.log(`✅ Payment verified for ${tx_ref}`);
      } else {
        await Transaction.findOneAndUpdate(
          { reference: tx_ref },
          { status: "failed" }
        );
        console.log(`❌ Payment failed for ${tx_ref}`);
      }
    }

    if (event.event === "transfer.completed") {
      const { reference, status } = event.data;

      await Transaction.findOneAndUpdate(
        { reference },
        { transferStatus: status },
        { new: true }
      );
      console.log(`💸 Transfer ${status} for ${reference}`);
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
// ✅ Fetch list of Nigerian banks
exports.getBanks = async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.flutterwave.com/v3/banks/NG",
      {
        headers: { Authorization:` Bearer ${process.env.FLW_SECRET_KEY}` }
      }
    );

    const banks = response.data.data.map(b => ({
      name: b.name,
      code: b.code
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
// ✅ Add or update bank details
exports.addBankDetails = async (req, res) => {
  try {
    const { accountNumber, bankCode, role, userId } = req.body;

    // 🔍 Verify account number with Flutterwave
    const verifyResponse = await axios.post(
      "https://api.flutterwave.com/v3/accounts/resolve",
      {
        account_number: accountNumber,
        account_bank: bankCode
      },
      {
        headers: { Authorization:` Bearer ${process.env.FLW_SECRET_KEY}` }
      }
    );

    if (!verifyResponse.data.status || verifyResponse.data.status !== "success") {
      return res.status(400).json({ message: "Invalid account details" });
    }

    const accountName = verifyResponse.data.data.account_name;

    // Save to DB → depending on role
    if (role === "host") {
      await Host.findByIdAndUpdate(userId, {
        bankAccount: { accountNumber, bankCode, accountName }
      });
    } else {
      await User.findByIdAndUpdate(userId, {
        bankAccount: { accountNumber, bankCode, accountName }
      });
    }

    res.status(200).json({
      message: "Bank details saved successfully",
      accountName
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

    const response = await axios.post(
      "https://api.flutterwave.com/v3/accounts/resolve",
      {
        account_number,
        account_bank: bank_code
      },
      {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
      }
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



exports.registerCompanyBank = async (req, res) => {
  try {
    const { account_number, bank_code, account_name } = req.body;

    // Step 1: Create transfer beneficiary on Flutterwave
    const response = await axios.post(
      "https://api.flutterwave.com/v3/beneficiaries",
      {
        account_number,
        account_bank: bank_code,
        fullname: account_name
      },
      {
        headers: { Authorization:` Bearer ${process.env.FLW_SECRET_KEY}` }
      }
    );

    if (!response.data.status || response.data.status !== "success") {
      return res.status(400).json({ message: "Failed to create beneficiary", data: response.data });
    }

    const recipientCode = response.data.data.id; // 👈 Flutterwave uses id for beneficiary reference

    // Step 2: Save to DB
    let company = await Company.findOne();
    if (!company) {
      company = new Company({
        account_number,
        bank_code,
        account_name,
        recipientCode
      });
    } else {
      company.account_number = account_number;
      company.bank_code = bank_code;
      company.account_name = account_name;
      company.recipientCode = recipientCode;
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