const senderName = process.env.BREVO_SENDER_NAME || "Talish Clothes";
const senderEmail = process.env.BREVO_SENDER_EMAIL;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "harshuu2106@gmail.com";
const WEBSITE_URL =
  process.env.WEBSITE_URL || "https://talishclothes.netlify.app";

if (!BREVO_API_KEY) {
  console.warn("BREVO_API_KEY not set - emails will fail");
} else {
  console.log("Email service ready (Brevo API)");
}

const emailWrapper = (title, contentHtml) => `
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
            <td style="background: linear-gradient(135deg, #4a0e2e 0%, #831843 40%, #be185d 100%); padding: 32px 30px; text-align:center;">
              <div style="font-family: 'Georgia', serif; font-size: 32px; color: #fce7f3; margin-bottom: 4px; font-style: italic;">Talish</div>
              <div style="font-family: 'Arial', sans-serif; font-size: 10px; letter-spacing: 6px; color: #fbcfe8; text-transform: uppercase; font-weight: bold;">Clothes</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 30px;">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="background: #fdf2f8; padding: 20px 30px; text-align: center; border-top: 1px solid #fce7f3;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280;">
                Need help? Contact us at <a href="mailto:${ADMIN_EMAIL}" style="color: #be185d; text-decoration: none;">${ADMIN_EMAIL}</a>
              </p>
              <p style="margin: 0 0 4px; font-size: 13px; color: #831843; font-weight: 600;">Talish Clothes</p>
              <p style="margin: 0 0 8px; font-size: 11px; color: #9ca3af;">
                Shop at <a href="${WEBSITE_URL}" style="color: #be185d; text-decoration: none;">${WEBSITE_URL}</a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #9ca3af;">
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

const otpTemplate = (otp, name, purpose) => {
  const isRegister = purpose === "register";
  const title = isRegister ? "Verify Your Email" : "Reset Your Password";
  const message = isRegister
    ? "Thanks for signing up! Use the code below to verify your email and complete registration."
    : "You requested to reset your password. Use the code below to continue.";

  const content = `
    <h1 style="margin: 0 0 12px; font-size: 24px; color: #1a1a2e; font-weight: 700;">${title}</h1>
    <p style="margin: 0 0 8px; font-size: 15px; color: #4b5563; line-height: 1.6;">Hi ${name || "there"},</p>
    <p style="margin: 0 0 24px; font-size: 15px; color: #4b5563; line-height: 1.6;">${message}</p>
    <div style="background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="margin: 0 0 12px; font-size: 12px; color: #831843; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
      <div style="font-size: 42px; font-weight: 800; color: #831843; letter-spacing: 12px; font-family: 'Courier New', monospace;">${otp}</div>
      <p style="margin: 12px 0 0; font-size: 12px; color: #831843; opacity: 0.7;">Valid for 10 minutes</p>
    </div>
    <div style="background: #fff7ed; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 8px;">
      <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.5;">
        <strong>Security Notice:</strong> Never share this code with anyone. Talish Clothes staff will never ask for your OTP.
      </p>
    </div>
  `;
  return emailWrapper(title, content);
};

const formatRs = (amount) => `Rs.${Number(amount).toFixed(2)}`;
const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const orderItemsTable = (items) => {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #fce7f3;">
          <img src="${item.image}" alt="${item.name}" width="50" height="60" style="border-radius: 6px; object-fit: cover; display: block;" />
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #fce7f3; font-size: 13px; color: #1a1a2e;">
          <div style="font-weight: 600; margin-bottom: 4px;">${item.name}</div>
          <div style="font-size: 11px; color: #6b7280;">
            ${item.size ? `Size: ${item.size}` : ""} ${item.size && item.color ? " | " : ""} ${item.color ? `Color: ${item.color}` : ""}
          </div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Qty: ${item.quantity}</div>
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #fce7f3; text-align: right; font-size: 13px; font-weight: 700; color: #1a1a2e;">
          ${formatRs(item.price * item.quantity)}
        </td>
      </tr>
    `,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
      ${rows}
    </table>
  `;
};

const priceBreakdown = (order) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #fdf2f8; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
    <tr>
      <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Subtotal</td>
      <td style="padding: 6px 0; font-size: 13px; color: #1a1a2e; text-align: right; font-weight: 500;">${formatRs(order.subtotal)}</td>
    </tr>
    ${
      order.discount > 0
        ? `
    <tr>
      <td style="padding: 6px 0; font-size: 13px; color: #059669;">Discount</td>
      <td style="padding: 6px 0; font-size: 13px; color: #059669; text-align: right; font-weight: 500;">-${formatRs(order.discount)}</td>
    </tr>
    `
        : ""
    }
    <tr>
      <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Delivery</td>
      <td style="padding: 6px 0; font-size: 13px; color: ${order.deliveryCharge === 0 ? "#059669" : "#1a1a2e"}; text-align: right; font-weight: 500;">
        ${order.deliveryCharge === 0 ? "FREE" : formatRs(order.deliveryCharge)}
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 0 0; font-size: 15px; color: #1a1a2e; font-weight: 700; border-top: 2px dashed #fbcfe8;">Total Amount</td>
      <td style="padding: 12px 0 0; font-size: 18px; color: #831843; text-align: right; font-weight: 800; border-top: 2px dashed #fbcfe8;">${formatRs(order.totalAmount)}</td>
    </tr>
  </table>
`;

const addressBlock = (address) => `
  <div style="background: #fdf2f8; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
    <p style="margin: 0 0 8px; font-size: 11px; color: #831843; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Shipping Address</p>
    <p style="margin: 0 0 4px; font-size: 14px; color: #1a1a2e; font-weight: 600;">${address.fullName}</p>
    <p style="margin: 0 0 4px; font-size: 13px; color: #4b5563; line-height: 1.5;">
      ${address.address}, ${address.city}<br/>
      ${address.state} - ${address.pincode}
    </p>
    <p style="margin: 0; font-size: 13px; color: #4b5563;">Phone: ${address.phone}</p>
  </div>
`;

const ctaButton = (text, url) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px auto;">
    <tr>
      <td style="border-radius: 12px; background: linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%);">
        <a href="${url}" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>
`;

const statusBadge = (status, color) => `
  <div style="display: inline-block; background: ${color}; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">
    ${status}
  </div>
`;

const orderPlacedTemplate = (order, name) => {
  const paymentText =
    order.paymentMethod === "COD"
      ? "Cash on Delivery"
      : order.paymentStatus === "Paid"
        ? "Payment Received"
        : order.paymentMethod;

  const content = `
    ${statusBadge("Order Placed", "#10b981")}
    <h1 style="margin: 0 0 8px; font-size: 24px; color: #1a1a2e; font-weight: 700;">Thanks for your order!</h1>
    <p style="margin: 0 0 4px; font-size: 15px; color: #4b5563;">Hi ${name},</p>
    <p style="margin: 0 0 20px; font-size: 14px; color: #4b5563; line-height: 1.6;">
      Your order <strong style="color: #831843;">#${order.orderId}</strong> has been placed successfully.
      ${order.paymentStatus === "Paid" ? "Payment received." : "You will pay on delivery."}
    </p>
    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px; font-size: 12px; color: #065f46; font-weight: 700; text-transform: uppercase;">Expected Delivery</p>
      <p style="margin: 0; font-size: 15px; color: #065f46; font-weight: 600;">
        ${order.expectedDelivery ? formatDate(order.expectedDelivery) : "5-7 business days"}
      </p>
    </div>
    <h2 style="margin: 24px 0 12px; font-size: 16px; color: #1a1a2e; font-weight: 700;">Order Summary</h2>
    ${orderItemsTable(order.items)}
    ${priceBreakdown(order)}
    ${addressBlock(order.shippingAddress)}
    <p style="margin: 0 0 8px; font-size: 13px; color: #4b5563;">
      <strong>Payment:</strong> ${paymentText}
    </p>
    ${ctaButton("Track Your Order", `${WEBSITE_URL}/my-orders`)}
  `;
  return emailWrapper("Order Placed", content);
};

const orderStatusTemplate = (order, name, newStatus) => {
  const statusConfig = {
    Confirmed: {
      title: "Order Confirmed",
      color: "#3b82f6",
      message:
        "Great news! Your order has been confirmed and is being prepared.",
      badge: "Confirmed",
    },
    Processing: {
      title: "Order Being Processed",
      color: "#8b5cf6",
      message: "Your order is now being packed with care.",
      badge: "Processing",
    },
    Shipped: {
      title: "Order Shipped",
      color: "#6366f1",
      message: "Your order is on its way! You will receive it soon.",
      badge: "Shipped",
    },
    "Out for Delivery": {
      title: "Out for Delivery",
      color: "#a855f7",
      message: "Your order is out for delivery today. Please be available.",
      badge: "Out for Delivery",
    },
    Delivered: {
      title: "Order Delivered",
      color: "#10b981",
      message: "Your order has been delivered. Enjoy your purchase!",
      badge: "Delivered",
    },
    Cancelled: {
      title: "Order Cancelled",
      color: "#ef4444",
      message: "Your order has been cancelled as requested.",
      badge: "Cancelled",
    },
  };

  const config = statusConfig[newStatus] || {
    title: `Order ${newStatus}`,
    color: "#6b7280",
    message: `Your order status has been updated to ${newStatus}.`,
    badge: newStatus,
  };

  const content = `
    ${statusBadge(config.badge, config.color)}
    <h1 style="margin: 0 0 8px; font-size: 24px; color: #1a1a2e; font-weight: 700;">${config.title}</h1>
    <p style="margin: 0 0 4px; font-size: 15px; color: #4b5563;">Hi ${name},</p>
    <p style="margin: 0 0 20px; font-size: 14px; color: #4b5563; line-height: 1.6;">
      ${config.message}
    </p>
    <div style="background: #fdf2f8; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px; font-size: 12px; color: #831843; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Order ID</p>
      <p style="margin: 0 0 12px; font-size: 16px; color: #1a1a2e; font-weight: 700;">#${order.orderId}</p>
      <p style="margin: 0 0 4px; font-size: 12px; color: #831843; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Total Amount</p>
      <p style="margin: 0; font-size: 16px; color: #1a1a2e; font-weight: 700;">${formatRs(order.totalAmount)}</p>
    </div>
    ${newStatus === "Shipped" || newStatus === "Out for Delivery" ? addressBlock(order.shippingAddress) : ""}
    ${ctaButton("View Order Details", `${WEBSITE_URL}/my-orders`)}
  `;
  return emailWrapper(config.title, content);
};

const refundRequestedTemplate = (order, name) => {
  const content = `
    ${statusBadge("Refund Requested", "#f59e0b")}
    <h1 style="margin: 0 0 8px; font-size: 24px; color: #1a1a2e; font-weight: 700;">Refund Request Received</h1>
    <p style="margin: 0 0 4px; font-size: 15px; color: #4b5563;">Hi ${name},</p>
    <p style="margin: 0 0 20px; font-size: 14px; color: #4b5563; line-height: 1.6;">
      We have received your refund request for order <strong style="color: #831843;">#${order.orderId}</strong>.
      Your refund of <strong>${formatRs(order.totalAmount)}</strong> will be processed within 5-7 business days.
    </p>
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0 0 6px; font-size: 13px; color: #78350f; font-weight: 700;">Refund Amount: ${formatRs(order.totalAmount)}</p>
      <p style="margin: 0; font-size: 12px; color: #92400e;">
        Bank Account: ****${order.refundDetails?.bankDetails?.accountNumber?.slice(-4) || "XXXX"}
        <br/>
        IFSC: ${order.refundDetails?.bankDetails?.ifscCode || "N/A"}
      </p>
    </div>
    ${ctaButton("View Order", `${WEBSITE_URL}/my-orders`)}
  `;
  return emailWrapper("Refund Requested", content);
};

const refundProcessedTemplate = (order, name) => {
  const proofSection = order.refundDetails?.paymentProofUrl
    ? `
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #1e40af; font-weight: 700; text-transform: uppercase;">Payment Proof</p>
      <a href="${order.refundDetails.paymentProofUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 600;">
        View Payment Receipt
      </a>
    </div>
  `
    : "";

  const additionalNotesSection = order.refundDetails?.additionalDetails
    ? `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0 0 4px; font-size: 11px; color: #78350f; font-weight: 700; text-transform: uppercase;">Additional Notes</p>
      <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">${order.refundDetails.additionalDetails}</p>
    </div>
  `
    : "";

  const content = `
    ${statusBadge("Refund Completed", "#10b981")}
    <h1 style="margin: 0 0 8px; font-size: 24px; color: #1a1a2e; font-weight: 700;">Refund Processed Successfully</h1>
    <p style="margin: 0 0 4px; font-size: 15px; color: #4b5563;">Hi ${name},</p>
    <p style="margin: 0 0 20px; font-size: 14px; color: #4b5563; line-height: 1.6;">
      Good news! Your refund for order <strong style="color: #831843;">#${order.orderId}</strong> has been processed.
    </p>
    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #065f46; font-weight: 700; text-transform: uppercase;">Refund Details</p>
      <p style="margin: 0 0 6px; font-size: 15px; color: #065f46; font-weight: 700;">Amount: ${formatRs(order.totalAmount)}</p>
      <p style="margin: 0 0 4px; font-size: 12px; color: #047857;">
        Payment Method: <strong>${order.refundDetails?.paymentMethod || "Bank Transfer"}</strong>
      </p>
      <p style="margin: 0 0 4px; font-size: 12px; color: #047857;">
        Transaction ID: <strong>${order.refundDetails?.refundTransactionId || "N/A"}</strong>
      </p>
      <p style="margin: 0; font-size: 12px; color: #047857;">
        Credited to: ****${order.refundDetails?.bankDetails?.accountNumber?.slice(-4) || "XXXX"}
      </p>
    </div>
    ${proofSection}
    ${additionalNotesSection}
    <p style="margin: 0 0 20px; font-size: 13px; color: #6b7280; line-height: 1.6;">
      The amount should reflect in your bank account within 2-3 business days depending on your bank. If you have any questions, please contact our support team.
    </p>
    ${ctaButton("Shop Again", `${WEBSITE_URL}/products`)}
  `;
  return emailWrapper("Refund Processed", content);
};

const adminNewOrderTemplate = (order, customerName, customerEmail) => {
  const content = `
    <div style="display: inline-block; background: #10b981; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">
      New Order Alert
    </div>
    <h1 style="margin: 0 0 8px; font-size: 24px; color: #1a1a2e; font-weight: 700;">New Order Received!</h1>
    <p style="margin: 0 0 20px; font-size: 14px; color: #4b5563; line-height: 1.6;">
      A new order has been placed on Talish Clothes.
    </p>
    <div style="background: #fdf2f8; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding: 6px 0; font-size: 12px; color: #6b7280; width: 40%;">Order ID:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #1a1a2e; font-weight: 700;">#${order.orderId}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 12px; color: #6b7280;">Customer:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #1a1a2e;">${customerName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 12px; color: #6b7280;">Email:</td>
          <td style="padding: 6px 0; font-size: 13px; color: #1a1a2e;">${customerEmail || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 12px; color: #6b7280;">Phone:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #1a1a2e;">${order.shippingAddress.phone}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 12px; color: #6b7280;">Payment:</td>
          <td style="padding: 6px 0; font-size: 14px; color: ${order.paymentStatus === "Paid" ? "#10b981" : "#f59e0b"}; font-weight: 700;">
            ${order.paymentMethod} - ${order.paymentStatus}
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 12px; color: #6b7280;">Items:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #1a1a2e;">${order.items.length} product(s)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 12px; color: #6b7280;">Total:</td>
          <td style="padding: 6px 0; font-size: 18px; color: #831843; font-weight: 800;">${formatRs(order.totalAmount)}</td>
        </tr>
      </table>
    </div>
    ${orderItemsTable(order.items)}
    ${addressBlock(order.shippingAddress)}
    ${ctaButton("View in Admin Panel", `${WEBSITE_URL}/admin/orders`)}
  `;
  return emailWrapper("New Order Alert", content);
};

const sendEmail = async (to, subject, htmlContent, textContent = "") => {
  try {
    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY not configured - skipping email");
      return { success: false, error: "Email service not configured" };
    }

    if (!to) {
      console.warn("No recipient email - skipping");
      return { success: false, error: "No recipient" };
    }

    const payload = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent,
      textContent: textContent || subject,
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
      return { success: false, error: data.message || "Failed to send email" };
    }

    console.log(`Email sent to ${to}:`, subject);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error("Email send error:", error.message);
    return { success: false, error: error.message };
  }
};

const sendOTPEmail = async (to, otp, name = "", purpose = "register") => {
  const subject =
    purpose === "register"
      ? `Verify your email - OTP ${otp}`
      : `Reset your password - OTP ${otp}`;
  const html = otpTemplate(otp, name, purpose);
  const text = `Your Talish Clothes verification code is: ${otp}. Valid for 10 minutes. Do not share with anyone.`;
  return sendEmail(to, subject, html, text);
};

const sendOrderPlacedEmail = async (order, user) => {
  if (!user?.email) return { success: false, error: "No email" };
  const subject = `Order Confirmed #${order.orderId} - Talish Clothes`;
  const html = orderPlacedTemplate(order, user.name);
  const text = `Your order #${order.orderId} has been placed. Total: Rs.${order.totalAmount}`;
  return sendEmail(user.email, subject, html, text);
};

const sendOrderStatusEmail = async (order, user, newStatus) => {
  if (!user?.email) return { success: false, error: "No email" };
  const subject = `Order ${newStatus} - #${order.orderId} | Talish Clothes`;
  const html = orderStatusTemplate(order, user.name, newStatus);
  const text = `Your order #${order.orderId} status: ${newStatus}`;
  return sendEmail(user.email, subject, html, text);
};

const sendRefundRequestedEmail = async (order, user) => {
  if (!user?.email) return { success: false, error: "No email" };
  const subject = `Refund Requested - Order #${order.orderId}`;
  const html = refundRequestedTemplate(order, user.name);
  const text = `Refund request received for order #${order.orderId}`;
  return sendEmail(user.email, subject, html, text);
};

const sendRefundProcessedEmail = async (order, user) => {
  if (!user?.email) return { success: false, error: "No email" };
  const subject = `Refund Processed - Order #${order.orderId}`;
  const html = refundProcessedTemplate(order, user.name);
  const text = `Your refund for order #${order.orderId} has been processed`;
  return sendEmail(user.email, subject, html, text);
};

const sendAdminNewOrderAlert = async (order, user) => {
  if (!ADMIN_EMAIL) {
    console.warn("ADMIN_EMAIL not set - skipping admin alert");
    return { success: false, error: "No admin email" };
  }
  const subject = `New Order #${order.orderId} - Rs.${order.totalAmount}`;
  const html = adminNewOrderTemplate(order, user.name, user.email);
  const text = `New order received: #${order.orderId} from ${user.name}`;
  console.log(`Sending admin alert to: ${ADMIN_EMAIL}`);
  return sendEmail(ADMIN_EMAIL, subject, html, text);
};

module.exports = {
  sendOTPEmail,
  sendOrderPlacedEmail,
  sendOrderStatusEmail,
  sendRefundRequestedEmail,
  sendRefundProcessedEmail,
  sendAdminNewOrderAlert,
};
