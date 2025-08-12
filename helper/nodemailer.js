const nodeMailer = require("nodemailer");

const sendEmail = async (options)=>{
 
const transporter = await nodeMailer.createTransport({
    service:process.env.SERVICE,

  secure: true, // true for port 465, false for other ports
  auth: {
    user: process.env.APP_USERNAME,
    pass: process.env.APP_PASSWORD
  },
  tls:{
    rejectUnauthorized: false,
  }
});
const mailOption = {
    subject:options.subject, text:options.text, from: `"urigwe somto"<${process.env.APP_USERNAME}>`, to: options.email, html:options.html
}
await transporter.sendMail(mailOption)

}
module.exports = sendEmail