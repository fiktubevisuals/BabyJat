import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";

// Initialize Firebase Admin
admin.initializeApp();

// Initialize SendGrid
// Note: In production, configure this via Firebase Secrets or Environment Variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn("SENDGRID_API_KEY is not set. Emails will not be sent.");
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@vividluxebabyjat.com"; // Change to your verified SendGrid sender

/**
 * Trigger: Order Update
 * Event: When an order is updated in Firestore (e.g., status changes to 'paid')
 */
export const sendOrderConfirmationEmail = onDocumentUpdated("orders/{orderId}", async (event) => {
  if (!event.data) return;

  const newValue = event.data.after.data();
  const previousValue = event.data.before.data();
  const orderId = event.params.orderId;

  // Check if status transitioned to 'paid'
  if (newValue.status === 'paid' && previousValue.status !== 'paid') {
    const clientId = newValue.clientId;
    
    if (!clientId) {
      console.error("No clientId found on order", orderId);
      return;
    }

    try {
      // Fetch user email from Firebase Auth
      const userRecord = await admin.auth().getUser(clientId);
      const customerEmail = userRecord.email;
      const customerName = userRecord.displayName || "Valued Customer";

      if (!customerEmail) {
        console.error("No email found for user", clientId);
        return;
      }

      if (!SENDGRID_API_KEY) {
        console.log(`[Mock] Would have sent order confirmation to ${customerEmail}`);
        return;
      }

      const msg = {
        to: customerEmail,
        from: FROM_EMAIL,
        subject: `Order Confirmation - Vivid Luxe BabyJat (#${orderId})`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #000;">Order Confirmed</h2>
            <p>Hello ${customerName},</p>
            <p>Thank you for shopping with Vivid Luxe BabyJat! Your payment was successful.</p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px;"><strong>Order ID:</strong> ${orderId}</p>
              <p style="margin: 0 0 10px;"><strong>Total:</strong> UGX ${newValue.total.toFixed(2)}</p>
              <p style="margin: 0;"><strong>Shipping Address:</strong> ${newValue.shippingAddress || 'N/A'}</p>
            </div>
            <p>We will notify you once your items are on the way.</p>
            <br/>
            <p>Best regards,<br/><strong>Vivid Luxe BabyJat Team</strong></p>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`Order confirmation email sent successfully to ${customerEmail} for order ${orderId}`);

    } catch (error) {
      console.error("Error sending order confirmation email:", error);
    }
  }
});

/**
 * Trigger: Appointment Creation
 * Event: When a new appointment document is created in Firestore
 */
export const sendAppointmentConfirmationEmail = onDocumentCreated("appointments/{appointmentId}", async (event) => {
  if (!event.data) return;

  const appointment = event.data.data();
  const appointmentId = event.params.appointmentId;
  const clientId = appointment.clientId;

  if (!clientId) {
    console.error("No clientId found on appointment", appointmentId);
    return;
  }

  try {
    // Fetch user email from Firebase Auth
    const userRecord = await admin.auth().getUser(clientId);
    const customerEmail = userRecord.email;
    const customerName = userRecord.displayName || "Valued Client";

    if (!customerEmail) {
      console.error("No email found for user", clientId);
      return;
    }

    if (!SENDGRID_API_KEY) {
      console.log(`[Mock] Would have sent appointment confirmation to ${customerEmail}`);
      return;
    }

    // Convert Firestore Timestamp to readable date
    let dateStr = "TBD";
    let timeStr = "TBD";
    
    // Check if date is a string (ISO) or Firestore Timestamp
    if (appointment.date) {
      if (typeof appointment.date === 'string') {
        const d = new Date(appointment.date);
        dateStr = d.toLocaleDateString();
        timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (appointment.date.toDate) {
        const d = appointment.date.toDate();
        dateStr = d.toLocaleDateString();
        timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }

    const stylistName = appointment.stylistId ? appointment.stylistId.replace('stylist_', '') : 'Assigned Stylist';

    const msg = {
      to: customerEmail,
      from: FROM_EMAIL,
      subject: `Appointment Confirmed - Vivid Luxe BabyJat`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #000;">Appointment Confirmed</h2>
          <p>Hello ${customerName},</p>
          <p>Your appointment has been successfully booked.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Service:</strong> ${appointment.serviceName}</p>
            <p style="margin: 0 0 10px;"><strong>Date:</strong> ${dateStr}</p>
            <p style="margin: 0 0 10px;"><strong>Time:</strong> ${timeStr}</p>
            <p style="margin: 0;"><strong>Stylist:</strong> <span style="text-transform: capitalize;">${stylistName}</span></p>
          </div>
          <p>Location: Vivid Luxe BabyJat Studio</p>
          <p>We look forward to seeing you!</p>
          <br/>
          <p>Best regards,<br/><strong>Vivid Luxe BabyJat Team</strong></p>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`Appointment confirmation email sent successfully to ${customerEmail} for appointment ${appointmentId}`);

  } catch (error) {
    console.error("Error sending appointment confirmation email:", error);
  }
});
