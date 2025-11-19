const userModel = require('../models/user.js');
const Host = require('../models/host.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {sendMail} = require('../helper/brevo');
const signup = require('../helper/signup')

exports.registeruser = async (req, res) => {
  try {
    const { fullName, email, password, repeatPassword } = req.body;

    // Validate input
    if (!fullName  ||!email  ||!password || !repeatPassword) {
      return res.status(400).json({
        message: "Please provide fullName, email, password, and repeatPassword",
      });
    }

    // Password match check
    if (password !== repeatPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    // Check if email already exists in Host collection
    const userExistsInHost = await Host.findOne({
      email: email.toLowerCase().trim(),
    });
    if (userExistsInHost) {
      return res.status(400).json({
        message: `Email: ${email} already in use as Host. Please use a different email.`,
      });
    }

    // Check if email already exists in User collection
    const userExists = await userModel.findOne({
      email: email.toLowerCase().trim(),
    });
    if (userExists) {
      return res.status(400).json({
        message: `Email: ${email} already in use.`,
      });
    }

    // Check if name already exists
    const nameExists = await userModel.findOne({
      fullName: fullName.toLowerCase().trim(),
    });
    if (nameExists) {
      return res.status(400).json({
        message: `Name: ${fullName} already in use.`,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.round(Math.random() * 1e6).toString().padStart(6, "0")
    // Create user
    const user = new userModel({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      otpCode: otp,
      otpExpires: Date.now() + 1000 * 180
    });

    const response = {
      email: email,
      subject: "Email Verification",
      html: signup(user.otpCode, user.fullName)
    }
    await sendMail(response)
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    // Prepare email
    const firstName = fullName.trim().split(" ")[0];
    const subject = "Welcome to the MOOOVES Platform!";
    const message = signup(firstName);

    // Send email safely
    try {
      await sendMail(user.email, subject, message);
    } catch (emailError) {
      console.error("❌ Email send error:", emailError.message);
    }

    // Success response
    return res.status(201).json({
      message: "User registered successfully.",
      data: user,
      token,
    });
  } catch (error) {
    console.error("❌ Register error:", error.message);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
// exports.verifyUser = async (req,res)=>{
//     try {
//         //Get the token from the params
//         const {token} = req.params;
//         //verify the token
//         await jwt.verify(token, process.env.SECRET, async (error,payload)=>{
//         if(error){
//             //Check if error is jwt expires error
//             if(error instanceof jwt.TokenExpiredError){
//                 const decodedToken = await jwt.decode(token);
//                 //Check for user
//                 const user = await userModel.findById(decodedToken.userId);
//                 if(user == null){
//                     return res.status(404).json({
//                          message: "User not found"
//                     })
//                 }
//                 //check if the user has already been verified
//                 if (user.isVerified === true){
//                     return res.status(400).json({
//                         message:'User has already been verified, pleaase prpceed to login'
//                     })
//                 }
//                 //Generate a new token
//                 const newToken = await jwt.sign({userId: user.id}, process.env.SECRET, {expiresIn: '3mins'})
//                 //Dynamically create the link
//                 const link = `${req.protocol}://${req.get('host')}/verify-user/${newToken}`
//                 //Get the user's first name
//                 const firstName = user.fullName.split(' ')[0];
//                 //Create the email details
//                 const mailDetails = {
//                     email: user.email,
//                     subject: 'Email verification',
//                     html: signup(link, firstName)
//                 }
//                 //Await nodemailer to send the email
//                 await sendEmail(mailDetails);
//                 //send a success response
//                 res.status(200).json({
//                     message:'Link expired: A new verification link was sent, please check your email'
//                 })

//             }
//         }else{
//             console.log(payload)
//             //Find the user in database
//             const user = await userModel.findById(payload.userId);
//             //Check if user still exists
//             if(user === null){
//                 return res.status(404).json({
//                     message:"user not found"
//                 })
//             };
//             //check if the user has already been verified
//             if(user.isVerified === true){
//                 return res.status(400).json({
//                     message:"User has already been verified, please proceed to login"
//                 })
//             }
//             //verify thr user account
//             user.isVerified = true;
//             //save the changes to the database
//             await user.save();
//             //send a success response
//             res.status(200).json({
//                 message: "Account verified succeffully"
//             })

//         }
//         })
//     } catch (error) {
//         console.log(error.message)
//         res.status(500).json({
//             message: 'Internal Server Error'
//         })
        
//     }
// }


exports.login = async(req, res)=>{
    try {
        //Extract the User's password from the request body
        const {email, password} =req.body
        if(email == undefined || password == undefined){
            return res.status(400).json({
                message: "please enter email and password"
            });
        };
        // check for the user and throw errorr if not found
        const user = await userModel.findOne({email: email.toLowerCase()})
        if(user == null){
            return res.status(404).json({
                message: "User not found"
            });
        }
        // check the password if it is correct
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if(isPasswordCorrect === false){
            return res.status(400).json({
                message: "Invalid Password"
            });
        }
        // Generate a token for the user
        const token = await jwt.sign({userId: user._id, isLoggedIn : true}, 
            process.env.SECRET, {expiresIn: '1d'});

            user.isLoggedIn = true;
        await user.save();
        //password destructuring
        const {password: hashedPassword, ...data} = user._doc
        // send a success response
        res.status(200).json({
            message: "Login successful",
            data,
            token
        })
    } catch (error) {
        console.log(error.message)
        res.status(500).json({
            message: 'Internal Server Error'
        })
    }
};


exports.logoutUser = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(401).json({ message: 'Unauthorized. tenant not authenticated' });
        }

        const tenant = await userModel.findById(id);

        if (!tenant) {
            return res.status(404).json({ message: 'User not found' });
        }

        tenant.isLoggedIn = false;

        await tenant.save();

        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Error logging out tenant', error: error.message });
    }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await userModel.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.getoneUser = async (req, res) => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    res.status(400).json({ error: 'Invalid user ID' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { fullName, email } = req.body;
    if (!fullName && !email) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const user = await userModel.findByIdAndUpdate(
      req.params.id,
      { fullName, email },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'User updated', user });
  } catch (err) {
    res.status(400).json({ error: 'Invalid user ID' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await userModel.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid user ID' });
  }
};



exports.requestHostAccess = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await userModel.findById(userId);

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.tournamentsJoinedCount < 2) {
      return res.status(400).json({ 
        error: 'You must play in at least 2 tournaments before requesting host access' 
      });
    }

    // flag request (admin will approve manually)
    res.json({ message: 'Request submitted, awaiting admin approval' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request host access', details: err.message });
  }
};


//admin
exports.grantHostAccess = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await userModel.findByIdAndUpdate(userId, { canHostTournament: true }, { new: true });
    
    res.json({ message: 'Host access granted', user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to grant host access', details: err.message });
  }
};





// const User = require('../models/user');/

// 🔹 POST /api/v1/auth/forgot

const { generateOtp } = require("../utils/generateOtp"); // small util


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ found: false, message: "Email is required" });

    let account = await Host.findOne({ email });
    let accountType = "host";

    if (!account) {
      account = await userModel.findOne({ email });
      accountType = "user";
    }

    if (!account) return res.status(404).json({ found: false });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB
    account.otpCode = otp;
    account.otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins expiry
    await account.save();

    // Construct HTML email (styled like your screenshot)
    const html = `
      <div style="background:#000;padding:30px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
        <div style="background:#32cd32;border-radius:8px;padding:40px 20px;">
          <h1 style="color:#000;font-size:28px;margin-bottom:10px;">Welcome to MOOOVES!</h1>
          <p style="color:#111;font-size:16px;">Hello ${account.fullName.split(" ")[0]},</p>
          <p style="color:#111;font-size:16px;margin-top:10px;">Here’s your OTP code to reset your password:</p>
          <h2 style="font-size:40px;letter-spacing:5px;color:#000;margin:20px 0;">${otp}</h2>
          <p style="color:#111;">This code will expire in <b>10 minutes</b>.</p>
        </div>
        <div style="margin-top:40px;">
          <p style="color:#999;">© 2025 MOOOVES Platform. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send the email
    await sendEmail({
      email: account.email,
      subject: "Your MOOOVES OTP Code",
      html,
    });

    return res.status(200).json({
      found: true,
      message: "OTP sent successfully",
      id: account._id,
      accountType,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ found: false, message: "Server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    let account = await Host.findOne({ email });
    if (!account) account = await userModel.findOne({ email });
    if (!account) return res.status(404).json({ success: false, message: "Account not found" });

    if (account.otpCode !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (Date.now() > account.otpExpires) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    account.otpCode = null;
    account.otpExpires = null;
    await account.save();

    res.status(200).json({ success: true, message: "OTP verified" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// 🔹 POST /api/v1/auth/forgot/reset
exports.resetPassword = async (req, res) => {
  try {
    const { id, newPassword } = req.body;
    if (!id || !newPassword) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    // Try finding in Host collection first
    let updatedAccount = await Host.findByIdAndUpdate(id, { password: hashed }, { new: true });

    // If not found, try User collection
    if (!updatedAccount) {
      updatedAccount = await userModel.findByIdAndUpdate(id, { password: hashed }, { new: true });
    }

    if (!updatedAccount) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




