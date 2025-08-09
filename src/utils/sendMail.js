import sendMail from "nodemailer";

const SendEmail = async (Options) => {
  const transporter = sendMail.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT, // 587
    secure: true, // false 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM, 
    to: Options.email,
    subject: Options.subject,
    html: Options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw error;
  }
};

export default SendEmail;