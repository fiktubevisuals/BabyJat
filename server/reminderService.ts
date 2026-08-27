import twilio from 'twilio';

export interface ReminderPayload {
  appointmentId: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  appointmentDate: string;
  stylistName?: string;
  channel: 'sms' | 'whatsapp' | 'both';
  actionConfirmUrl?: string;
  actionRescheduleUrl?: string;
}

export interface ReminderResult {
  reminderId: string;
  appointmentId: string;
  channel: 'sms' | 'whatsapp' | 'both';
  smsStatus: 'sent' | 'simulated' | 'failed';
  whatsappStatus: 'sent' | 'simulated' | 'failed';
  whatsappDeepLink?: string;
  smsMessageText: string;
  whatsappMessageText: string;
  dispatchedAt: string;
}

/**
 * Builds the SMS text for a 24-hour appointment reminder
 */
export function buildSmsText(payload: ReminderPayload): string {
  const confirmCode = `CONFIRM_${payload.appointmentId.slice(0, 6)}`;
  const rescheduleCode = `RESCHED_${payload.appointmentId.slice(0, 6)}`;
  
  return `[BabyJat Luxury Salon] Hi ${payload.clientName}, your appointment for ${payload.serviceName} with ${payload.stylistName || 'BabyJat Master Stylist'} is scheduled for ${payload.appointmentDate}. Reply YES to confirm or RESCHEDULE to pick a new date. Direct link: ${payload.actionConfirmUrl || 'https://babyjat.com/profile'}`;
}

/**
 * Builds the rich WhatsApp message text for a 24-hour appointment reminder
 */
export function buildWhatsAppText(payload: ReminderPayload): string {
  return `✨ *BABYJAT LUXURY SALON & BOUTIQUE* ✨
-------------------------------------
Dear *${payload.clientName}*,

This is your automated 24-Hour Salon Appointment Reminder! 👑

💇‍♀️ *Service:* ${payload.serviceName}
📅 *Date & Time:* ${payload.appointmentDate}
✂️ *Stylist:* ${payload.stylistName || 'Master Stylist'}
📍 *Location:* BabyJat Studio, Kampala

Please choose a quick action below to confirm your slot:

✅ *Confirm Appointment:*
${payload.actionConfirmUrl || 'https://babyjat.com/profile?action=confirm&apt=' + payload.appointmentId}

🔄 *Reschedule Slot:*
${payload.actionRescheduleUrl || 'https://babyjat.com/profile?action=reschedule&apt=' + payload.appointmentId}

We look forward to giving you a crown-worthy transformation! 💎`;
}

/**
 * Creates a WhatsApp web deep-link to trigger direct sending or previewing
 */
export function generateWhatsAppDeepLink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Dispatch SMS and WhatsApp automated reminders
 */
export async function dispatchAutomatedReminder(payload: ReminderPayload): Promise<ReminderResult> {
  const reminderId = `rem_${Math.random().toString(36).substring(2, 10)}`;
  const dispatchedAt = new Date().toISOString();

  const smsText = buildSmsText(payload);
  const waText = buildWhatsAppText(payload);
  const waLink = generateWhatsAppDeepLink(payload.clientPhone || '+256700000000', waText);

  // Check if Twilio / SMS provider keys exist in environment
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  
  let smsStatus: 'sent' | 'simulated' | 'failed' = 'simulated';
  let whatsappStatus: 'sent' | 'simulated' | 'failed' = 'simulated';

  if (twilioSid && twilioAuthToken && twilioPhone) {
    try {
      const client = twilio(twilioSid, twilioAuthToken);
      
      if (payload.channel === 'sms' || payload.channel === 'both') {
        console.log(`[SMS Dispatch] Sending real SMS to ${payload.clientPhone}`);
        await client.messages.create({
          body: smsText,
          from: twilioPhone,
          to: payload.clientPhone
        });
        smsStatus = 'sent';
      }
      
      if (payload.channel === 'whatsapp' || payload.channel === 'both') {
        console.log(`[WhatsApp Dispatch] Sending real WhatsApp to ${payload.clientPhone}`);
        await client.messages.create({
          body: waText,
          from: `whatsapp:${twilioPhone}`,
          to: `whatsapp:${payload.clientPhone}`
        });
        whatsappStatus = 'sent';
      }
    } catch (e: any) {
      console.error('[Twilio Dispatch Error]', e.message);
      smsStatus = 'failed';
      whatsappStatus = 'failed';
    }
  } else {
    console.log(`[Simulated Dispatch] To ${payload.clientPhone} using ${payload.channel}`);
  }

  return {
    reminderId,
    appointmentId: payload.appointmentId,
    channel: payload.channel,
    smsStatus,
    whatsappStatus,
    whatsappDeepLink: waLink,
    smsMessageText: smsText,
    whatsappMessageText: waText,
    dispatchedAt
  };
}
