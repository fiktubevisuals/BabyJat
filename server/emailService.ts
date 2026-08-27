import nodemailer from 'nodemailer';

// Configure transport
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback json/stream transporter for development/preview
  return nodemailer.createTransport({
    jsonTransport: true
  });
};

const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || '"BabyJat Luxury Salon & Boutique" <concierge@babyjat.com>';

export interface BookingEmailPayload {
  email: string;
  clientName: string;
  serviceName: string;
  date: string; // e.g. 2026-08-28T10:30:00
  stylistName?: string;
  price: number;
  bookingId?: string;
  requestedShade?: string;
}

export interface OrderEmailPayload {
  email: string;
  clientName: string;
  orderId: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  shippingAddress?: string;
}

export interface GiftCardEmailPayload {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  senderEmail: string;
  cardCode: string;
  amount: number;
  giftNote?: string;
}

/**
 * Sends automated booking confirmation email
 */
export async function sendBookingConfirmationEmail(payload: BookingEmailPayload) {
  const transporter = createTransporter();
  
  const formattedDate = new Date(payload.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeStr = payload.date.includes('T') ? payload.date.split('T')[1].substring(0, 5) : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f6f4; margin: 0; padding: 20px; color: #2a2024; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #efe8e4; }
        .header { background: linear-gradient(135deg, #1f1118 0%, #3d1b2b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; color: #eec0c6; }
        .header p { margin: 6px 0 0; font-size: 12px; letter-spacing: 1.5px; opacity: 0.8; text-transform: uppercase; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #1f1118; }
        .intro { font-size: 14px; line-height: 1.6; color: #66585f; margin-bottom: 24px; }
        .card { background: #faf7f5; border: 1px solid #eddcd4; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .card-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; border-bottom: 1px dashed #e6d7ce; padding-bottom: 8px; }
        .card-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .card-label { color: #806e76; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .card-val { color: #1f1118; font-weight: 600; text-align: right; }
        .highlight { color: #b60055; font-weight: 700; }
        .footer { background: #faf7f5; padding: 20px; text-align: center; font-size: 12px; color: #806e76; border-top: 1px solid #efe8e4; }
        .badge { display: inline-block; background: #b60055; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>BABYJAT</h1>
          <p>Luxury Salon &amp; Haute Coiffure</p>
        </div>
        <div class="content">
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="badge">Appointment Confirmed</span>
          </div>
          <div class="greeting">Hello ${payload.clientName || 'Valued Client'},</div>
          <p class="intro">
            We are delighted to confirm your upcoming luxury salon appointment at BabyJat. Our master stylists are preparing an exquisite experience tailored just for you.
          </p>

          <div class="card">
            <div class="card-row">
              <span class="card-label">Service</span>
              <span class="card-val">${payload.serviceName}</span>
            </div>
            ${payload.requestedShade ? `
            <div class="card-row">
              <span class="card-label">Custom Shade</span>
              <span class="card-val highlight">${payload.requestedShade}</span>
            </div>` : ''}
            <div class="card-row">
              <span class="card-label">Date</span>
              <span class="card-val">${formattedDate}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Time Slot</span>
              <span class="card-val">${timeStr || 'Scheduled Slot'}</span>
            </div>
            ${payload.stylistName ? `
            <div class="card-row">
              <span class="card-label">Master Stylist</span>
              <span class="card-val">${payload.stylistName}</span>
            </div>` : ''}
            <div class="card-row">
              <span class="card-label">Estimated Price</span>
              <span class="card-val highlight">UGX ${payload.price.toLocaleString()}</span>
            </div>
          </div>

          <p class="intro" style="font-size: 13px;">
            <strong>Salon Location:</strong> Plot 14 Acacia Avenue, Kololo, Kampala.<br/>
            <em>Complimentary espresso, fruit infusions, and champagne served upon arrival. Please arrive 10 minutes prior to your reservation.</em>
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} BabyJat Luxury Salon. All rights reserved.<br/>
          For inquiries or rescheduling, please contact concierge@babyjat.com or +256 700 000 000.
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: FROM_EMAIL,
    to: payload.email,
    subject: `✨ Appointment Confirmed: ${payload.serviceName} - BabyJat Luxury Salon`,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Email Service] Automated Booking Confirmation email sent to ${payload.email}. MessageId: ${info.messageId || 'simulated'}`);
  return info;
}

/**
 * Sends automated product order confirmation email
 */
export async function sendOrderConfirmationEmail(payload: OrderEmailPayload) {
  const transporter = createTransporter();

  const itemsHtml = payload.items.map(item => `
    <tr style="border-bottom: 1px solid #f0e6e0;">
      <td style="padding: 12px 0; color: #1f1118; font-weight: 500;">${item.name}</td>
      <td style="padding: 12px 0; text-align: center; color: #66585f;">x${item.quantity}</td>
      <td style="padding: 12px 0; text-align: right; color: #b60055; font-weight: bold;">UGX ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f6f4; margin: 0; padding: 20px; color: #2a2024; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #efe8e4; }
        .header { background: linear-gradient(135deg, #1f1118 0%, #3d1b2b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; color: #eec0c6; }
        .header p { margin: 6px 0 0; font-size: 12px; letter-spacing: 1.5px; opacity: 0.8; text-transform: uppercase; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #1f1118; }
        .intro { font-size: 14px; line-height: 1.6; color: #66585f; margin-bottom: 24px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #806e76; border-bottom: 2px solid #eddcd4; padding-bottom: 8px; }
        .total-box { background: #faf7f5; border: 1px solid #eddcd4; border-radius: 12px; padding: 16px; text-align: right; margin-bottom: 24px; }
        .total-label { font-size: 12px; text-transform: uppercase; color: #806e76; font-weight: bold; }
        .total-amount { font-size: 22px; font-weight: 800; color: #b60055; margin-top: 4px; }
        .footer { background: #faf7f5; padding: 20px; text-align: center; font-size: 12px; color: #806e76; border-top: 1px solid #efe8e4; }
        .badge { display: inline-block; background: #2e7d32; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>BABYJAT</h1>
          <p>Haute Boutique &amp; Cosmetics</p>
        </div>
        <div class="content">
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="badge">Order Received</span>
          </div>
          <div class="greeting">Thank you, ${payload.clientName || 'Valued Client'}!</div>
          <p class="intro">
            Your order <strong>#${payload.orderId.slice(0, 8)}</strong> has been placed successfully and is being processed by our dispatch concierge team.
          </p>

          <table class="table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-label">Total Amount Paid</div>
            <div class="total-amount">UGX ${payload.total.toLocaleString()}</div>
          </div>

          ${payload.shippingAddress ? `
          <div style="background: #faf7f5; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px;">
            <strong style="color: #1f1118;">Shipping Destination:</strong><br/>
            <span style="color: #66585f;">${payload.shippingAddress}</span>
          </div>` : ''}

          <p class="intro" style="font-size: 13px; text-align: center;">
            You will receive a dispatch tracking SMS/Email as soon as your luxury package is out for delivery.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} BabyJat Boutique. All rights reserved.<br/>
          For order modifications, please contact support@babyjat.com
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: FROM_EMAIL,
    to: payload.email,
    subject: `🛍️ Order Confirmed #${payload.orderId.slice(0, 8)} - BabyJat Boutique`,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Email Service] Automated Order Confirmation email sent to ${payload.email}. MessageId: ${info.messageId || 'simulated'}`);
  return info;
}

/**
 * Sends automated gift card confirmation email
 */
export async function sendGiftCardConfirmationEmail(payload: GiftCardEmailPayload) {
  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f6f4; margin: 0; padding: 20px; color: #2a2024; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #efe8e4; }
        .header { background: linear-gradient(135deg, #1f1118 0%, #3d1b2b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; color: #eec0c6; }
        .content { padding: 32px 24px; text-align: center; }
        .code-box { background: linear-gradient(135deg, #b60055 0%, #80003c 100%); color: #ffffff; padding: 24px; border-radius: 16px; margin: 24px 0; box-shadow: 0 6px 20px rgba(182,0,85,0.2); }
        .code-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; }
        .code-val { font-size: 28px; font-weight: 800; letter-spacing: 4px; font-mono; margin: 12px 0; }
        .code-amount { font-size: 18px; font-weight: 600; background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 16px; border-radius: 20px; }
        .note { font-style: italic; background: #faf7f5; padding: 16px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #b60055; color: #55484f; text-align: left; }
        .footer { background: #faf7f5; padding: 20px; text-align: center; font-size: 12px; color: #806e76; border-top: 1px solid #efe8e4; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>BABYJAT</h1>
          <p>Haute Coiffure VIP Digital Pass</p>
        </div>
        <div class="content">
          <h2 style="color: #1f1118; margin-top: 0;">You've Received a Gift!</h2>
          <p style="color: #66585f; font-size: 14px;">
            <strong>${payload.senderName}</strong> has sent you a BabyJat Luxury Digital E-Gift Pass.
          </p>

          ${payload.giftNote ? `<div class="note">"${payload.giftNote}"</div>` : ''}

          <div class="code-box">
            <div class="code-title">Your VIP Pass Code</div>
            <div class="code-val">${payload.cardCode}</div>
            <div class="code-amount">UGX ${payload.amount.toLocaleString()}</div>
          </div>

          <p style="font-size: 13px; color: #806e76;">
            Use this code at checkout on <a href="https://babyjat.com" style="color: #b60055;">babyjat.com</a> or present it at BabyJat Luxury Salon in Kampala.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} BabyJat Luxury Salon. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: FROM_EMAIL,
    to: payload.recipientEmail,
    subject: `🎁 You received a BabyJat VIP Gift Pass from ${payload.senderName}!`,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Email Service] Automated Gift Card email sent to ${payload.recipientEmail}. MessageId: ${info.messageId || 'simulated'}`);
  return info;
}
