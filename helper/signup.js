const html = (otpCode,firstName) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MOOOVES</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #006400, #00a651); /* Green gradient */
      color: #fff;
    }
    .container {
      max-width: 600px;
      margin: 50px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      text-align: center;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
      color: #333;
    }
    .header {
      background: #008000; /* Dark green */
      padding: 40px 20px;
      color: #fff;
      position: relative;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
    }
    .header p {
      margin: 10px 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
      font-size: 16px;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 24px;
      color: #006400;
      margin-bottom: 15px;
    }
    .welcome-btn {
      display: inline-block;
      margin-top: 25px;
      padding: 14px 28px;
      background: #00a651;
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      text-decoration: none;
      border-radius: 8px;
      transition: background 0.3s ease;
    }
    .welcome-btn:hover {
      background: #008000;
    }
    .footer {
      background: #f5f5f5;
      color: #555;
      font-size: 14px;
      padding: 20px;
      text-align: center;
    }
    /* X/O subtle background shapes */
    .xo-bg {
      position: absolute;
      top: 10px;
      left: 10px;
      font-size: 60px;
      font-weight: bold;
      opacity: 0.1;
      color: #fff;
    }
    .xo-bg-right {
      position: absolute;
      bottom: 10px;
      right: 10px;
      font-size: 60px;
      font-weight: bold;
      opacity: 0.1;
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="xo-bg">X</div>
      <div class="xo-bg-right">O</div>
      <h1>Welcome to MOOOVES!</h1>
      <p>Hello ${firstName}, we’re excited to have you on board 🚀</p>
    </div>
    <div class="content">
      <h2>You’re officially part of the game!</h2>
      <h4>Your OTP is ${otpCode}</h4>
      <p>
        MOOOVES is where competition meets fun.  
        Get ready to join tournaments, connect with other players, and climb to the top.
      </p>
      <a href="${process.env.FRONTEND_URL || '#'}" class="welcome-btn">Go to MOOOVES</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} MOOOVES Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
};

module.exports = html;