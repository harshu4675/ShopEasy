const senderName = process.env.BREVO_SENDER_NAME || "Talish Clothes";
const senderEmail = process.env.BREVO_SENDER_EMAIL;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

if (!BREVO_API_KEY) {
  console.warn("BREVO_API_KEY not set - emails will fail");
} else {
  console.log("Email service ready (Brevo API)");
}

const buildOTPEmailTemplate = (otp, name, purpose) => {
  const isRegister = purpose === "register";
  const title = isRegister ? "Verify Your Email" : "Reset Your Password";
  const message = isRegister
    ? "Thanks for signing up! Use the code below to verify your email and complete registration."
    : "You requested to reset your password. Use the code below to continue.";

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color:#fdf2f8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fdf2f8; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow: 0 10px 40px rgba(190, 24, 93, 0.15);">

          <tr>
            <td style="background: linear-gradient(135deg, #4a0e2e 0%, #831843 40%, #be185d 100%); padding: 40px 30px; text-align:center;">
              <div style="font-family: 'Georgia', serif; font-size: 36px; color: #fce7f3; margin-bottom: 4px; font-style: italic;">Talish</div>
              <div style="font-family: 'Arial', sans-serif; font-size: 11px; letter-spacing: 6px; color: #fbcfe8; text-transform: uppercase; font-weight: bold;">Clothes</div>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <h1 style="margin: 0 0 12px; font-size: 24px; color: #1a1a2e; font-weight: 700;">${title}</h1>
              <p style="margin: 0 0 8px; font-size: 15px; color: #4b5563; line-height: 1.6;">Hi ${name || "there"},</p>
              <p style="margin: 0 0 30px; font-size: 15px; color: #4b5563; line-height: 1.6;">${message}</p>

              <div style="background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 30px;">
                <p style="margin: 0 0 12px; font-size: 12px; color: #831843; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
                <div style="font-size: 42px; font-weight: 800; color: #831843; letter-spacing: 12px; font-family: 'Courier New', monospace;">${otp}</div>
                <p style="margin: 12px 0 0; font-size: 12px; color: #831843; opacity: 0.7;">Valid for 10 minutes</p>
              </div>

              <div style="background: #fff7ed; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;">
                  <strong>Security Notice:</strong> Never share this code with anyone. Talish Clothes staff will never ask for your OTP.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
                If you did not request this code, please ignore this email or contact our support team.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background: #fdf2f8; padding: 24px 30px; text-align: center; border-top: 1px solid #fce7f3;">
              <p style="margin: 0 0 6px; font-size: 13px; color: #831843; font-weight: 600;">Talish Clothes</p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} Talish Clothes. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const sendOTPEmail = async (to, otp, name = "", purpose = "register") => {
  try {
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const subject =
      purpose === "register"
        ? `Verify your email - OTP ${otp}`
        : `Reset your password - OTP ${otp}`;

    const payload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent: buildOTPEmailTemplate(otp, name, purpose),
      textContent: `Your Talish Clothes verification code is: ${otp}. Valid for 10 minutes. Do not share with anyone.`,
    };

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Brevo API error:", data);
      return {
        success: false,
        error: data.message || "Failed to send email",
      };
    }

    console.log("OTP email sent:", data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error("Email send error:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTPEmail };
