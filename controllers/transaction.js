const Transaction = require('../models/transaction');
const Tournament = require('../models/tournament');
const Company = require('../models/company'); // each user & platform has one
const axios = require('axios');

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const MOOOVES_WALLET_ID = process.env.MOOOVES_WALLET_ID; // platform’s wallet




// ✅ Get all banks (users + hosts combined)
exports.getAllBanks = async (req, res) => {
  try {
    const usersWithBanks = await User.find(
      { "bankAccount.accountNumber": { $exists: true, $ne: null } },
      { fullName: 1, email: 1, bankAccount: 1 }
    ).lean();

    const hostsWithBanks = await Host.find(
      { "bankAccount.accountNumber": { $exists: true, $ne: null } },
      { fullName: 1, email: 1, bankAccount: 1 }
    ).lean();

    // Add role info for clarity in the combined list
    const formattedUsers = usersWithBanks.map(u => ({
      ...u,
      role: "user",
    }));

    const formattedHosts = hostsWithBanks.map(h => ({
      ...h,
      role: "host",
    }));

    const allBanks = [...formattedUsers, ...formattedHosts];

    res.status(200).json({
      success: true,
      count: allBanks.length,
      data: allBanks,
    });
  } catch (error) {
    console.error("Error fetching banks:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get one bank by userId or hostId
exports.getBankById = async (req, res) => {
  try {
    const { id, role } = req.params;

    if (!id || !role) {
      return res.status(400).json({ message: "Missing id or role" });
    }

    let account;

    if (role === "host") {
      account = await Host.findById(id, { fullName: 1, email: 1, bankAccount: 1 });
    } else if (role === "user") {
      account = await User.findById(id, { fullName: 1, email: 1, bankAccount: 1 });
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error("Error fetching bank:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ------------------ INITIAL PAYMENT ------------------
exports.initialPayment = async (req, res) => {
  try {
    const { email, tournamentId, userId } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    if (tournament.participants.length >= 50) {
      return res.status(400).json({ message: "Tournament is full (max 50 players)" });
    }

    const amount = tournament.entryFee;
    if (!amount || amount < 500) {
      return res.status(400).json({ message: "Invalid entry fee" });
    }

    const existing = await Transaction.findOne({
      user: userId,
      tournament: tournamentId,
      status: "success"
    });

    if (existing) {
      return res.status(400).json({ message: "You already paid for this tournament" });
    }

    const txRef = `tournament_${tournamentId}_${Date.now()}`;

    // 🔥 FLUTTERWAVE INIT (CORRECT PAYLOAD)
    const flwRes = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: txRef,
        amount,
        currency: "NGN",
        payment_options: "card,banktransfer,ussd",
        redirect_url: process.env.FRONTEND_REDIRECT_URL,

        customer: {
          email
        },

        meta: {
          tournamentId,
          userId
        },

        customizations: {
          title: "MOOOVES Tournament",
          description: "Tournament Entry Fee",
          logo: "https://moooves.com/logo.png" // optional
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    // 🔎 DEBUG (VERY IMPORTANT)
    console.log("FLUTTERWAVE RESPONSE:", JSON.stringify(flwRes.data, null, 2));

    const paymentLink = flwRes.data?.data?.link;

    if (!paymentLink) {
      return res.status(500).json({
        message: "Invalid payment response from Flutterwave",
        flutterwave: flwRes.data
      });
    }

    // ✅ SAVE TRANSACTION
    const tx = new Transaction({
      user: userId,
      tournament: tournamentId,
      amount,
      email,
      reference: txRef,
      role: "player",
      status: "pending"
    });

    await tx.save();

    return res.status(201).json({
      message: "Payment initialized",
      payment_link: paymentLink,
      reference: txRef
    });

  } catch (err) {
    console.error("Payment init error:", err.response?.data || err.message);

    return res.status(500).json({
      message: "Error initializing payment",
      error: err.response?.data || err.message
    });
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
    tournament.prizePool = (tournament.prizePool || 0) + data.amount;
    tournament.participants.push(payment.user);
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

const User = require("../models/user");
const Host = require("../models/host");


// ------------------ DISTRIBUTE PAYOUT ------------------
exports.distributePayment = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { winners } = req.body; // { first, second, third }
    const io = req.app.get("io");

    // ✅ Find tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament)
      return res.status(404).json({ success: false, message: "Tournament not found" });

    // ✅ Get all successful transactions (players only)
    const payments = await Transaction.find({
      tournament: tournamentId,
      status: "success",
    });

    if (payments.length === 0)
      return res.status(400).json({ success: false, message: "No successful payments found" });

    const totalPool = payments.reduce((sum, t) => sum + t.amount, 0);

    // ✅ Distribution Logic
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

      if (hostDoc?.bankAccount?.accountNumber && hostDoc?.bankAccount?.bankCode) {
        const { bankCode, accountNumber } = hostDoc.bankAccount;
        await sendPayout(bankCode, accountNumber, payouts.host, "Host tournament payout");

        io.to(tournamentId.toString()).emit("payout", {
          tournamentId,
          userId: tournament.createdBy,
          type: "host",
          amount: payouts.host,
        });
      } else {
        console.warn(`⚠️ Host ${tournament.createdBy} has no bank account info`);
      }
    }

    // ---------------- WINNERS PAYOUT ----------------
    if (winners.first) await payWinner(winners.first, tournamentId, payouts.first, "1st", io);
    if (winners.second) await payWinner(winners.second, tournamentId, payouts.second, "2nd", io);
    if (winners.third) await payWinner(winners.third, tournamentId, payouts.third, "3rd", io);

    // ---------------- PLATFORM SHARE ----------------
    const company = await Company.findOne();
    if (company?.account_number && company?.bank_code) {
      await sendPayout(company.bank_code, company.account_number, payouts.platform, "Platform share");
      console.log(`✅ Platform earned ₦${payouts.platform} sent to company account`);
    } else {
      console.warn("⚠️ Company account not set. Platform payout skipped.");
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

// ------------------ PAY WINNER HELPER ------------------
async function payWinner(userId, tournamentId, amount, position, io) {
  const user = await User.findById(userId);
  if (!user) {
    console.warn(`⚠️ Winner ${userId} not found`);
    return;
  }

  const { bankAccount } = user;
  if (!bankAccount?.accountNumber || !bankAccount?.bankCode) {
    console.warn(`⚠️ Winner ${userId} (${position}) missing bank details`);
    return;
  }

  await sendPayout(bankAccount.bankCode, bankAccount.accountNumber, amount, `${position} place payout`);

  io.to(tournamentId.toString()).emit("payout", {
    tournamentId,
    userId,
    type: "player",
    position,
    amount,
  });
}

// ------------------ SEND PAYOUT HELPER ------------------
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
        reference:` payout-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
 * @desc Manual payout fallback endpoint
 * @route POST /api/v1/payouts/send
 * @access Public (but can be protected later)
 */
exports.sendPayout = async (req, res) => {
  try {
    const { accountBank, accountNumber, amount, narration } = req.body;

    // ✅ Validation
    if (!accountBank || !accountNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: "accountBank, accountNumber, and amount are required",
      });
    }

    // ✅ Prepare transfer payload
    const payload = {
      account_bank: accountBank,
      account_number: accountNumber,
      amount,
      currency: "NGN",
      narration: narration || "Manual tournament payout",
      reference: `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };

    // ✅ Send request to Flutterwave
    const response = await axios.post("https://api.flutterwave.com/v3/transfers", payload, {
      headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
    });

    // ✅ Log success and return
    console.log("✅ Manual transfer initiated:", response.data);

    return res.status(200).json({
      success: true,
      message: "Payout initiated",
      data: response.data,
    });
  } catch (error) {
    console.error("❌ Manual payout error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Payout transfer failed",
      error: error.response?.data || error.message,
    });
  }
};


/**
 * 
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

// const Host = require('../models/host');
// const User = require('../models/user');





// ✅ Fetch list of Nigerian banks
// ✅ Fetch list of Nigerian banks
exports.getBanks = async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.flutterwave.com/v3/banks/NG",
      {
        headers: { Authorization:`Bearer ${process.env.FLW_SECRET_KEY}` }
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

// controllers/bankController.js


exports.findBanks = async (req, res) => {
  try {
    const { name } = req.body; // optional query param e.g. /banks?name=OPay

    // Fetch all banks from Flutterwave
    const response = await axios.get("https://api.flutterwave.com/v3/banks/NG", {
      headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY} `}
    });

    // Map only the relevant data
    let banks = response.data.data.map(b => ({
      name: b.name,
      code: b.code
    }));

    // 🔍 Filter if name query is provided
    if (name && name.trim() !== "") {
      const search = name.toLowerCase().trim();
      banks = banks.filter(b => b.name.toLowerCase().includes(search));

      if (banks.length === 0) {
        return res.status(404).json({
          message: `No bank found matching "${name}"`
        });
      }
    }

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
    const { accountNumber, bankCode, userId, role } = req.body;

    if (!accountNumber || !bankCode  || !userId || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Verify bank account via Flutterwave
    const verifyResponse = await axios.post(
      "https://api.flutterwave.com/v3/accounts/resolve",
      {
        account_number: accountNumber,
        account_bank: bankCode,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    if (!verifyResponse.data || verifyResponse.data.status !== "success") {
      return res.status(400).json({ message: "Invalid account details" });
    }

    const accountName = verifyResponse.data.data.account_name;

    // 🧩 Case 1: Role is Host
    if (role === "host") {
      const host = await Host.findById(userId);
      if (!host) {
        // Host doesn’t exist, check if user is trying to act as host
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "User or Host not found" });
        }

        // ✅ User is acting as host but not a real host → save to User model
        await User.findByIdAndUpdate(userId, {
          bankAccount: { accountName, accountNumber, bankCode },
        });

        return res.status(200).json({
          message: "Bank details saved under user profile (acting as host)",
          accountName,
        });
      }

      // ✅ Host exists → update Host record
      host.bankAccount = { accountName, accountNumber, bankCode };
      await host.save();

      return res.status(200).json({
        message: "Bank details saved successfully (host)",
        accountName,
      });
    }

    // 🧍‍♂️ Case 2: Role is User
    else if (role === "user") {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await User.findByIdAndUpdate(userId, {
        bankAccount: { accountName, accountNumber, bankCode },
      });

      return res.status(200).json({
        message: "Bank details saved successfully (user)",
        accountName,
      });
    }

    // 🚫 Invalid Role
    else {
      return res.status(400).json({ message: "Invalid role" });
    }
  } catch (error) {
    console.error("Bank details error:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error adding bank details",
      error: error.response?.data || error.message,
    });
  }
};

exports.removeBankDetails = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // HOST LOGIC
    if (role === "host") {
      const host = await Host.findById(userId);
      if (host) {
        host.bankAccount = null;
        await host.save();

        return res.status(200).json({
          message: "Bank details removed successfully (host)",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Host/User not found" });
      }

      user.bankAccount = null;
      await user.save();

      return res.status(200).json({
        message: "Bank details removed (user acting as host)",
      });
    }

    // USER LOGIC
    if (role === "user") {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.bankAccount = null;
      await user.save();

      return res.status(200).json({
        message: "Bank details removed successfully (user)",
      });
    }

    return res.status(400).json({ message: "Invalid role" });
  } catch (error) {
    console.error("Remove bank error:", error.message);

    return res.status(500).json({
      message: "Error removing bank details",
      error: error.message,
    });
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