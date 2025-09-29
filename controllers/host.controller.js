const bcrypt = require('bcrypt');
const Host = require('../models/host');
const jwt = require('jsonwebtoken');
const sendEmail = require('../helper/nodemailer');
const signup = require('../helper/signup')
exports.createHost = async (req, res) => {
  try {
    const { fullName, email, password,repeatPassword } = req.body;

    // Validate input
    if (!fullName || !email || !password || !repeatPassword) {
      return res.status(400).json({ error: 'Please provide fullName, email, password, and repeatPassword' });
    }

    // Check if passwords match
            if (password !== repeatPassword) {
                return res.status(400).json({
                    message: "Passwords do not match"
                });
            }
    

    // Check if host with email already exists
    const existing = await Host.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        message: `Email: ${email} is already in use`
      });
    }
    const usernameExists = await Host.findOne({fullName : fullName.toLowerCase().trim() });
            if (usernameExists) {
                return res.status(400).json({
                    message:` Name: ${fullName} already in use`
                });
            }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new host
    const host = new Host({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    // Save host to DB
    await host.save();

    // // Generate verification token
    // const token = jwt.sign({ hostId: host._id }, process.env.SECRET, { expiresIn: '10m' });

    // // Construct verification link
    // const link = `${req.protocol}://${req.get('host')}/verify-user/${token}`;
     const firstName = fullName.trim().split(' ')[0];

    //  Setup email details
    const mailDetails = {
      email: host.email,
      subject: 'Welcome to the MOOOVES Platform!',
      html: signup( firstName)
    };

    // Send email
    await sendEmail(mailDetails);
  
    // Send success response
    res.status(201).json({
      message: 'Host created successfully.',
      host
    });

  } catch (err) {
    console.error('[createHost error]', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
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

exports.Hostlogin = async(req, res)=>{
    try {
        //Extract the User's password from the request body
        const {email, password} =req.body
        if(email == undefined || password == undefined){
            return res.status(400).json({
                message: "please enter email and password"
            });
        };
        // check for the user and throw errorr if not found
        const user = await Host.findOne({email: email.toLowerCase()})
        if(user == null){
            return res.status(404).json({
                message: "Host not found"
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
        const token = await jwt.sign({userId: user._id,isLoggedIn : true }, 
            process.env.SECRET, {expiresIn: '1d'});

              user.isLoggedIn = true;
        await user.save();
        //password destructuring
        const {password: hashedPassword, ...data} = user._doc
        // send a success response
        res.status(200).json({
            message: " Host Login successful",
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
