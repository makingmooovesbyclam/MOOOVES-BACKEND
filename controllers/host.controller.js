const bcrypt = require('bcrypt');
const Host = require('../models/host');
const jwt = require('jsonwebtoken');
const {sendMail} = require('../helper/brevo');
const userModel = require('../models/user.js');
const signup = require('../helper/signup')
exports.createHost = async (req, res) => {
  try {
    const { fullName, email, password, repeatPassword } = req.body;

    // Validate input
    if (!fullName || !email || !password || !repeatPassword) {
      return res.status(400).json({
        error: "Please provide fullName, email, password, and repeatPassword",
      });
    }

    // Check if passwords match
    if (password !== repeatPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Check for existing email in user or host collections
    const userExists = await userModel.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({
        message:` Email: ${email} already in use as User. Please kindly make a change of Email.`,
      });
    }

    const existing = await Host.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        message: `Email: ${email} is already in use.`,
      });
    }

    const usernameExists = await Host.findOne({
      fullName: fullName.toLowerCase().trim(),
    });
    if (usernameExists) {
      return res.status(400).json({
        message:` Name: ${fullName} already in use.`,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
const otp = Math.round(Math.random() * 1e6).toString().padStart(6, "0")
    // Create new host
    const host = new Host({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      otpCode: otp,
      otpExpires: Date.now() + 1000 * 180
    });

    const response = {
          email: email,
          subject: "Email Verification",
          html: signup(host.otpCode, host.fullName)
        }
        await sendMail(response)
    await host.save();

    // Generate verification token
    const token = jwt.sign({ hostId: host._id }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    // Prepare email
    const firstName = fullName.trim().split(" ")[0];
    const subject = "Welcome to the MOOOVES Platform!";
    const message = signup(firstName);

    // Send email safely (won’t block success if email fails)
    try {
      await sendMail(host.email, subject, message);
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
    }

    // ✅ Success response
    return res.status(201).json({
      message: "Host created successfully.",
      host,
      token,
    });
  } catch (err) {
    console.error("[createHost error]", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
};

exports.getHosts = async (req, res) => {
  try {
    const hosts = await Host.find();
    res.status(200).json({message:'host retrived successfully',hosts});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hosts' });
  }
};

exports.getOneHost = async (req, res) => {
  try {
    const host = await Host.findById(req.params.id);
    if (!host) return res.status(404).json({ error: 'Host not found' });
    res.status(200).json(host);
  } catch (err) {
    res.status(400).json({ error: 'Invalid host ID' });
  }
};

exports.updateHost = async (req, res) => {
  try {
    const hostId = req.params.id;
    const { fullName, email } = req.body;

    if (!fullName && !email) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    // Check if host exists
    const host = await Host.findById(hostId);
    if (!host) {
      return res.status(404).json({ error: 'Host not found' });
    }

    // Perform the update
    const updatedHost = await Host.findByIdAndUpdate(
      hostId,
      {
        ...(fullName && { fullName: fullName.trim() }),
        ...(email && { email: email.toLowerCase().trim() })
      },
      { new: true }
    );

    res.status(200).json({ message: 'Host updated', host: updatedHost });

  } catch (err) {
    console.error('[updateHost error]', err);
    res.status(500).json({ error: 'Something went wrong', details: err.message });
  }
};
exports.deleteHost = async (req, res) => {
  try {
    const host = await Host.findByIdAndDelete(req.params.id);
    if (!host) return res.status(404).json({ error: 'Host not found' });
    res.status(200).json({ message: 'Host deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid host ID' });
  }
};

exports.Hostlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter email and password"
      });
    }

    const host = await Host.findOne({ email: email.toLowerCase() });
    if (!host) {
      return res.status(404).json({
        message: "Host not found"
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, host.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: "Invalid Password"
      });
    }

    // Correct token payload
    const token = jwt.sign(
      { hostId: host._id, isLoggedIn: true },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    host.isLoggedIn = true;
    await host.save();

    const { password: _, ...data } = host._doc;

    res.status(200).json({
      message: "Host login successful",
      data,
      token
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
};



exports.logoutHost = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(401).json({ message: 'Unauthorized. tenant not authenticated' });
        }

        const tenant = await Host.findById(id);

        if (!tenant) {
            return res.status(404).json({ message: 'Host not found' });
        }

        tenant.isLoggedIn = false;

        await tenant.save();

        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Error logging out tenant', error: error.message });
    }
};
