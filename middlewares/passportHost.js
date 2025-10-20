const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const userModel = require('../models/host');
const sendEmail = require('../helper/nodemailer');
const signup = require('../helper/signup')
passport.use('google-host',new GoogleStrategy({
    clientID: process.env.GOOGLE_Host_ID,
    clientSecret: process.env.GOOGLE_Host_SECRET,
    callbackURL: "https://mooves.onrender.com/host/auth/google/login"
  },
  async (accessToken, refreshToken, profile, cb) => {
 console.log("Profile: ",profile);
    try {
    let user = await userModel.findOne({email: profile.emails[0].value});
    if(!user){
        user = new userModel({
            email: profile.emails[0].value,
            fullName: profile.displayName,
   password:"",
  googleId: profile.id

        });
        await user.save();

         const firstName = fullName.trim().split(' ')[0];
                        
                            //  Setup email details
                            const mailDetails = {
                              email: host.email,
                              subject: 'Welcome to the MOOOVES Platform!',
                              html: signup( firstName)
                            };
                  
                            // Send email
                    await sendEmail(mailDetails);
    }
    return cb(null,user);
  } catch (error) {
    return cb(error,null)
  }
  }
));

passport.serializeUser((user,cb) => {
console.log('user serialized:',user);
cb(null,user.id)
})
passport.deserializeUser(async(id,cb)=>{
    try {
        const user = await userModel.findById(id);
        if(!user){
          return cb(new Error('User not found'),null)
        }
        cb(null,user)
    } catch (error) {
        cb(error,null)
    }
})
module.exports = passport