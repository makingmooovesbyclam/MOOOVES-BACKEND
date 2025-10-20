// utils/emailService.js
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Send email utility
exports.sendEmail = async (to, subject, message) => {
  try {
    const msg = {
      to,
      from: process.env.SENDGRID_SENDER, // verified sender address
      subject,
      html: `<div style="font-family:Arial, sans-serif;">
              <p>${message}</p>
              <p style="font-size:12px;color:#777;">This is an automated notification from MOOOVES Tournament System.</p>
            </div>`,
    };
    await sgMail.send(msg);
    return { success: true };
  } catch (err) {
    console.error("Email send error:", err.message);
    return { success: false, error: err.message };
  }
};