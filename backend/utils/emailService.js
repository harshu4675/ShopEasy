const nodemailer = require("nodemailer");

// ==================== TRANSPORTER ====================

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ==================== EMAIL TEMPLATES ====================

const emailTemplates = {
  verificationOTP: (name, otp) => ({
    subject: "Verify Your Email - ShopEasy",
    html: `
    <div style="font-family:Arial,sans-serif;background:#f4f6f8;padding:30px">
      <div style="max-width:600px;margin:auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">
        <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:25px;text-align:center;color:white">
          <h1 style="margin:0">🛍️ ShopEasy</h1>
        </div>
        <div style="padding:30px;text-align:center">
          <h2>Hello ${name}! 👋</h2>
          <p>Please use the OTP below to verify your email address.</p>
          <div style="margin:30px 0;padding:20px;background:#f3f4f6;border-radius:8px">
            <h1 style="letter-spacing:6px;margin:0;color:#333">${otp}</h1>
          </div>
          <p style="color:#666">This OTP is valid for <b>10 minutes</b>.</p>
          <p style="color:#888;font-size:13px">If you didn't create this account, you can safely ignore this email.</p>
        </div>
        <div style="background:#fafafa;padding:15px;text-align:center;font-size:12px;color:#888">
          © 2026 ShopEasy. All rights reserved.
        </div>
      </div>
    </div>
    `,
  }),

  passwordResetOTP: (name, otp) => ({
    subject: "Password Reset OTP - ShopEasy",
    html: `
    <div style="font-family:Arial,sans-serif;background:#f4f6f8;padding:30px">
      <div style="max-width:600px;margin:auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">
        <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:25px;text-align:center;color:white">
          <h1 style="margin:0">🔐 Password Reset</h1>
        </div>
        <div style="padding:30px;text-align:center">
          <h2>Hello ${name}! 👋</h2>
          <p>We received a request to reset your password.</p>
          <div style="margin:30px 0;padding:20px;background:#f3f4f6;border-radius:8px">
            <h1 style="letter-spacing:6px;margin:0;color:#333">${otp}</h1>
          </div>
          <p style="color:#666">This OTP is valid for <b>10 minutes</b>.</p>
          <p style="color:#888;font-size:13px">If you didn't request this password reset, please ignore this email.</p>
        </div>
        <div style="background:#fafafa;padding:15px;text-align:center;font-size:12px;color:#888">
          © 2026 ShopEasy
        </div>
      </div>
    </div>
    `,
  }),

  passwordChanged: (name) => ({
    subject: "Password Changed Successfully - ShopEasy",
    html: `
    <div style="font-family:Arial,sans-serif;background:#f4f6f8;padding:30px">
      <div style="max-width:600px;margin:auto;background:white;border-radius:10px;padding:30px;text-align:center">
        <h2>✅ Password Updated</h2>
        <p>Hello ${name},</p>
        <p>Your password has been changed successfully.</p>
        <p style="color:#666">If you didn't make this change, please secure your account immediately.</p>
      </div>
    </div>
    `,
  }),

  welcomeEmail: (name) => ({
    subject: "Welcome to ShopEasy 🎉",
    html: `
    <div style="font-family:Arial,sans-serif;background:#f4f6f8;padding:30px">
      <div style="max-width:600px;margin:auto;background:white;border-radius:10px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center;color:white">
          <h1>Welcome to ShopEasy!</h1>
        </div>
        <div style="padding:30px;text-align:center">
          <h2>Hello ${name} 👋</h2>
          <p>Your account has been successfully verified.</p>
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}"
             style="display:inline-block;margin-top:20px;padding:12px 30px;background:#667eea;color:white;text-decoration:none;border-radius:6px">
            Start Shopping
          </a>
        </div>
      </div>
    </div>
    `,
  }),
};

// ==================== SEND EMAIL FUNCTION ====================

const sendEmail = async (to, template, ...args) => {
  try {
    console.log("📧 Sending email to:", to);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("❌ EMAIL_USER or EMAIL_PASS missing");
      return false;
    }

    if (!emailTemplates[template]) {
      console.error(`❌ Template "${template}" not found`);
      return false;
    }

    const { subject, html } = emailTemplates[template](...args);

    const info = await transporter.sendMail({
      from: `"ShopEasy" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    });

    console.log("✅ Email sent successfully!");
    console.log("📧 Message ID:", info.messageId);

    return true;
  } catch (error) {
    console.error("❌ Email error:", error.message);

    if (process.env.NODE_ENV === "development") {
      console.log("🔑 OTP:", args[1] || args[0]);
    }

    return false;
  }
};

module.exports = { sendEmail };
