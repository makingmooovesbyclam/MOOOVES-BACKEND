const html = (verifyLink, firstName) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Confirmation</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            font-family: Arial, sans-serif;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            display: flex;
        }
        .header {
            background-color: #ffd500;
            padding: 40px;
            text-align: center;
            position: relative;
        }
        .header img {
            width: 50px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #333333;
            font-size: 28px;
            margin: 0 0 10px;
        }
        .header p {
            color: #333333;
            font-size: 16px;
            margin: 0 0 20px;
        }
      
        .brand-logo-container {
            width: 50px;
            height: 50px;
            /* background-color: #fff; */
            display: flex;
            justify-content: center;
            align-items: center;
            /* margin-bottom: 20px; */

            & img {
                width: 300px;
                height: 100%;
            }
        }

        .btn {
            display: inline-block;
            padding: 15px 30px;
            font-size: 16px;
            background-color: #a63dff;
            color: #fff;
            border-radius: 5px;
            text-decoration: none;
            margin-top: 20px;
        }
        .footer {
            background-color: #333333;
            color: #fff;
            text-align: center;
            padding: 20px;
        }
        .footer img {
            width: 30px;
            margin: 0 10px;
        }
        .footer p {
            font-size: 14px;
            margin: 10px 0 48px 10px;
            color: #b6adad;

        }

        .social-icons {
            display: flex;
            flex-direction: column; 
            margin-top: 20px;
            gap: 17px;

            & img {
                width: 25px;
                margin: 0 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="brand-logo-container">
            <img src="https://res.cloudinary.com/dhlfbfuem/image/upload/v1740670068/The_Boring_Company-Logo.wine_rhqzpr.svg" alt="Brandindoor Logo" class="brand-logo"> 
            </div>
            <h1>Welcome Aboard, ${firstName}!</h1>
            <p>Thanks for joining AI Engineer Podcast!</p>
            <p>To finish signing up, please confirm your email address. This ensures we have the right email in case we need to contact you.</p>
            <a href="${verifyLink}" class="btn">Confirm email address</a>
        </div>
        <div class="footer">
            <p>Thanks,<br>AI Engineer Team!</p>
            <div class="social-icons">
                <!-- If not used with rel="noopener noreferrer", it can create security risks. -->
                <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">
                    <img src="https://res.cloudinary.com/dhlfbfuem/image/upload/v1740669623/317727_facebook_social_media_social_icon_afymw8.png" alt="Facebook">
                </a>
                <a href="https://www.twitter.com" target="_blank" rel="noopener noreferrer">
                    <img src="https://res.cloudinary.com/dhlfbfuem/image/upload/v1740669617/317720_social_media_tweet_twitter_social_icon_fcisjd.png" alt="Twitter">
                </a>
                <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
                    <img src="https://res.cloudinary.com/dhlfbfuem/image/upload/v1740669616/instagram_2111463_uielj2.png" alt="Instagram">
                </a>
                <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer">
                    <img src="https://res.cloudinary.com/dhlfbfuem/image/upload/v1740669623/317725_linkedin_social_icon_yucjxn.png" alt="LinkedIn">
                </a>
            </div>
            
        </div>
    </div>
</body>
</html>
`;
};

module.exports = html;
