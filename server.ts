import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { 
  sendBookingConfirmationEmail, 
  sendOrderConfirmationEmail, 
  sendGiftCardConfirmationEmail 
} from "./server/emailService";
import { dispatchAutomatedReminder, ReminderPayload } from "./server/reminderService";
import { verifyAndFulfillTransaction } from "./server/paymentVerification";
import { startReminderCron, execute24hReminderScan, getReminderCronStats } from "./server/reminderCron";
import { startEODCron, getEODCronStats } from "./server/eodCron";
import { compileDailyEODReport, dispatchDailyEODSettlement } from "./server/eodSettlementService";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- PESAPAL API INTEGRATION ---

const getPesapalBaseUrl = () => {
  // Default to production since real credentials are added
  return process.env.PESAPAL_ENV === 'sandbox' 
    ? 'https://cybqa.pesapal.com/pesapalv3'
    : 'https://pay.pesapal.com/v3'; 
};

// 1. Authenticate with Pesapal
async function getPesapalToken() {
  const url = `${getPesapalBaseUrl()}/api/Auth/RequestToken`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Pesapal Auth Error:', errorText);
    throw new Error('Failed to authenticate with Pesapal');
  }

  const data = await response.json();
  return data.token;
}

// 2. Register IPN (Lazy load/cache could be used, but doing it simple here)
async function registerIPN(token: string, baseUrl: string) {
  const url = `${getPesapalBaseUrl()}/api/URLSetup/RegisterIPN`;
  const ipnUrl = `${baseUrl}/api/pesapal/ipn`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: 'GET' // Pesapal default is GET for v3 usually, or POST. Let's use GET as standard IPN
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Pesapal IPN Registration Error:', errorText);
    throw new Error('Failed to register IPN');
  }

  const data = await response.json();
  return data.ipn_id;
}

app.post("/api/pesapal/checkout", async (req, res) => {
  try {
    const { orderId, amount, description, email, phone, firstName, lastName } = req.body;

    if (!orderId || !amount || !description) {
      return res.status(400).json({ error: "Missing required fields: orderId, amount, description" });
    }

    if (!process.env.PESAPAL_CONSUMER_KEY || !process.env.PESAPAL_CONSUMER_SECRET) {
      console.warn("Pesapal credentials not found. Returning a mock URL for development.");
      return res.json({ 
        redirect_url: `/checkout/callback?OrderTrackingId=mock_${orderId}&OrderMerchantReference=${orderId}`,
        mock: true
      });
    }

    const token = await getPesapalToken();
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const ipnId = await registerIPN(token, baseUrl);

    const submitUrl = `${getPesapalBaseUrl()}/api/Transactions/SubmitOrderRequest`;
    const callbackUrl = `${baseUrl}/checkout/callback`;

    const requestBody = {
      id: orderId,
      currency: 'UGX',
      amount: amount,
      description: description,
      callback_url: callbackUrl,
      notification_id: ipnId,
      billing_address: {
        email_address: email || 'customer@example.com',
        phone_number: phone || '',
        country_code: 'UG', // Adjust as needed
        first_name: firstName || 'Customer',
        middle_name: '',
        last_name: lastName || '',
        line_1: '',
        line_2: '',
        city: '',
        state: '',
        postal_code: '',
        zip_code: ''
      }
    };

    const response = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pesapal Submit Order Error:', errorText);
      return res.status(500).json({ error: 'Failed to submit order to Pesapal' });
    }

    const data = await response.json();
    res.json({ redirect_url: data.redirect_url });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- GEMINI AI HAIRSTYLIST ADVICE API ---
app.post("/api/ai/hairstylist-advice", async (req, res) => {
  try {
    const { shadeName, textureName, skinTone, notes } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        advice: `The **${shadeName}** shade beautifully complements ${textureName || 'your natural'} hair texture! For long-lasting vibrancy, we recommend sulfate-free color-protecting shampoo and weekly gloss conditioning sessions.`,
        recommendedServices: ['Gloss & Color Protect Treatment', 'Hydrating Steam Mask']
      });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are BabyJat's master luxury salon colorist and stylist in Kampala, Uganda. 
A client is considering the hair color shade "${shadeName}" with "${textureName || 'natural'}" texture.
Additional Client Notes: "${notes || 'None'}".

Provide a concise, ultra-luxurious, expert analysis (max 3 sentences) answering:
1. Why this shade looks stunning with their selected hair texture.
2. Personalized home care and maintenance advice (e.g., silk bonnet, color lock serum).
3. 2 recommended BabyJat salon treatments that will keep this shade rich and healthy.

Format your response as valid JSON with keys: "advice" (string) and "recommendedServices" (array of string service names).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || '';
    let parsedJson = { advice: '', recommendedServices: [] };
    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      parsedJson = {
        advice: responseText || `The ${shadeName} shade provides a radiant, multi-dimensional finish for ${textureName} hair.`,
        recommendedServices: ['Gloss & Color Protect Treatment', 'Hydrating Steam Mask']
      };
    }

    res.json(parsedJson);
  } catch (err) {
    console.error('Gemini Hairstylist Advice Error:', err);
    res.json({
      advice: `The selected shade creates a rich, radiant reflection that brings out depth and movement in your hair texture.`,
      recommendedServices: ['Gloss & Color Protect Treatment', 'Hydrating Steam Mask']
    });
  }
});

// --- GEMINI AI HAIRSTYLE TRY-ON & TRANSFORMATION API ---
app.post("/api/ai/hairstyle-transformation", async (req, res) => {
  try {
    const { hairstyleName, shadeName, customPrompt, userImageBase64 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        transformationSummary: `Luxury ${hairstyleName || 'Custom Style'} in ${shadeName || 'Signature Shade'}`,
        faceShapeAnalysis: `This ${hairstyleName || 'hairstyle'} creates flawless balance by framing your cheeks and highlighting your jawline.`,
        stylingTechnique: `Precision sectioning, tension-free knotless braiding, and steam setting for silky longevity.`,
        estimatedTime: `2.5 - 3 Hours`,
        maintenanceTips: [
          'Sleep with a pure silk bonnet to prevent friction frizz.',
          'Apply Lumina Silk Hair Oil daily to nourish scalp & maintain shine.'
        ],
        recommendedServices: [`BabyJat ${hairstyleName || 'Style'} Execution`, 'Scalp Detox & Steam Treatment']
      });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const contents: any[] = [];
    
    if (userImageBase64) {
      let mimeType = "image/jpeg";
      const mimeMatch = userImageBase64.match(/^data:(image\/\w+);base64,/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      const base64Clean = userImageBase64.replace(/^data:image\/\w+;base64,/, "");
      contents.push({
        inlineData: {
          mimeType,
          data: base64Clean
        }
      });
    }

    const promptText = `You are BabyJat's chief celebrity hair architect in Kampala, Uganda. 
A client has selected the Hairstyle: "${hairstyleName || customPrompt || 'Custom Hairstyle'}" and Hair Color Shade: "${shadeName || 'Natural Gloss'}".
${userImageBase64 ? 'You are reviewing their attached selfie photo to analyze face geometry and skin tone.' : ''}

Provide a comprehensive, high-end stylist consultation breakdown in JSON format containing:
1. "transformationSummary" (string): A short, glamorous title for this look.
2. "faceShapeAnalysis" (string): 2 sentences analyzing how this specific hairstyle and length complements their face contours, cheeks, and eyes.
3. "stylingTechnique" (string): 2 sentences explaining the exact professional salon technique BabyJat stylists will execute.
4. "estimatedTime" (string): Expected duration (e.g. "2 - 3 Hours").
5. "maintenanceTips" (array of 2 strings): High-impact home care rules.
6. "recommendedServices" (array of 2 strings): Complementary BabyJat salon services.

Respond ONLY with raw JSON matching this structure.`;

    contents.push(promptText);

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || '';
    let parsedJson = {};
    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      parsedJson = {
        transformationSummary: `${hairstyleName} in ${shadeName}`,
        faceShapeAnalysis: `This ${hairstyleName} perfectly frames face contours with elegant movement.`,
        stylingTechnique: `Tension-controlled styling with silk infusion setting.`,
        estimatedTime: `2.5 Hours`,
        maintenanceTips: ['Wear a silk bonnet at night', 'Moisturize scalp with Lumina Serum'],
        recommendedServices: ['Scalp Treatment', 'Silk Press Finish']
      };
    }

    res.json(parsedJson);
  } catch (err) {
    console.error('Gemini Hairstyle Transformation Error:', err);
    res.json({
      transformationSummary: `${req.body.hairstyleName || 'Custom Hair Style'} Transformation`,
      faceShapeAnalysis: `This hairstyle highlights your natural facial features and provides effortless movement.`,
      stylingTechnique: `Hand-crafted sectioning and precision styling for maximum volume and scalp comfort.`,
      estimatedTime: `2 - 3 Hours`,
      maintenanceTips: ['Wrap hair in a silk scarf nightly', 'Apply light hair oil twice weekly'],
      recommendedServices: ['Deep Conditioning Steam', 'Scalp Refresh']
    });
  }
});

// --- REAL IMAGE GENERATION / PREVIEW API (Nano Banana 2 Lite & Gemini Omni Flash) ---
app.post("/api/ai/generate-tryon-image", async (req, res) => {
  try {
    const { 
      modelName = "nano-banana-lite", 
      hairstyleName, 
      shadeName, 
      customPrompt, 
      userImageBase64,
      colorMode = "preset",
      customHex,
      rootHex,
      tipHex,
      balayageStyle,
      angle = "front"
    } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "GEMINI_API_KEY environment variable is missing." });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    // Map user selected model alias
    let targetModel = "gemini-3.1-flash-lite-image"; // Nano Banana 2 Lite
    if (modelName === "omni" || modelName === "gemini-omni-flash-preview") {
      targetModel = "gemini-omni-flash-preview"; // Gemini Omni Flash
    } else if (modelName === "nano-banana-2" || modelName === "gemini-3.1-flash-image") {
      targetModel = "gemini-3.1-flash-image"; // Nano Banana 2
    } else if (modelName === "nano-banana-lite" || modelName === "gemini-3.1-flash-lite-image") {
      targetModel = "gemini-3.1-flash-lite-image"; // Nano Banana 2 Lite
    }

    const inputs: any[] = [];
    if (userImageBase64) {
      let mimeType = "image/jpeg";
      const mimeMatch = userImageBase64.match(/^data:(image\/\w+);base64,/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      const base64Clean = userImageBase64.replace(/^data:image\/\w+;base64,/, "");
      inputs.push({
        type: "image",
        mime_type: mimeType,
        data: base64Clean
      });
    }

    // Construct color description
    let colorDescription = shadeName || 'The Copper Muse';
    if (colorMode === 'custom' && customHex) {
      colorDescription = `Custom solid hair shade (${customHex})`;
    } else if (colorMode === 'gradient' && rootHex && tipHex) {
      colorDescription = `Multi-tone ${balayageStyle || 'Balayage'} gradient with deep roots (${rootHex}) melting seamlessly into bright tips/highlights (${tipHex})`;
    }

    // Angle perspective text
    let angleText = "front facial view";
    if (angle === "left_profile") angleText = "left side profile view";
    if (angle === "right_profile") angleText = "right side profile view";
    if (angle === "back") angleText = "back view showing full hair length";

    const promptText = `A photorealistic ultra-high definition beauty salon photo of the person in the image styled from a ${angleText} perspective with a brand new hairstyle: "${hairstyleName || customPrompt || 'Luxury Hairstyle'}" and hair color specification: "${colorDescription}". Preserve exact head anatomy, skin tone, facial features (if visible from ${angleText}), and studio lighting from the uploaded photo. Render realistic, silky hair strands, multi-dimensional volumetric shine, and professional salon finish. Photorealistic, 8k resolution, beauty studio lighting.`;

    inputs.push({
      type: "text",
      text: promptText
    });

    const interaction = await ai.interactions.create({
      model: targetModel,
      input: inputs,
      response_modalities: ['image', 'text'],
      generation_config: {
        image_config: {
          aspect_ratio: "3:4",
          image_size: "1K"
        }
      }
    });

    let generatedImageUrl = null;
    let generatedText = "";

    for (const step of interaction.steps) {
      if (step.type === 'model_output' && step.content) {
        for (const c of step.content as any[]) {
          if (c.type === 'image' && c.data) {
            const mime = c.mime_type || 'image/png';
            generatedImageUrl = `data:${mime};base64,${c.data}`;
          }
          if (c.type === 'text' && c.text) {
            generatedText += c.text;
          }
        }
      }
    }

    if (!generatedImageUrl && interaction.output_image) {
      const mime = interaction.output_image.mime_type || 'image/png';
      generatedImageUrl = `data:${mime};base64,${interaction.output_image.data}`;
    }

    if (generatedImageUrl) {
      res.json({ imageUrl: generatedImageUrl, description: generatedText || `Generated image using ${targetModel}` });
    } else {
      res.status(500).json({ error: `Image generation did not produce an image. Please ensure your API key has access to ${targetModel}.` });
    }
  } catch (err: any) {
    const errStr = String(err?.message || err?.body || err?.cause || err || "");
    const isRegionError =
      errStr.includes("not available in your country") ||
      errStr.includes("invalid_request") ||
      errStr.includes("locationNotSupported") ||
      errStr.includes("REGION_NOT_SUPPORTED");

    if (isRegionError) {
      console.log("[Info] Gemini Direct Image Generation is geographically restricted in this server region. Serving smart canvas try-on fallback.");
      return res.json({
        fallback: true,
        isRegionRestricted: true,
        message: "AI Direct Image Generation is geographically restricted by Gemini in this server region. High-precision Canvas Try-On Simulator & AI Hair Architect Dossier remain fully active."
      });
    }

    console.error("Gemini Real Image Generation Error:", err);
    res.status(500).json({ error: errStr || "Failed to generate realistic AI image preview." });
  }
});

// 3. Handle IPN Callback from Pesapal
app.get("/api/pesapal/ipn", async (req, res) => {
  const { OrderNotificationType, OrderTrackingId, OrderMerchantReference } = req.query;
  
  if (!OrderTrackingId || !OrderMerchantReference) {
    return res.status(400).send('Missing tracking ID or reference');
  }

  try {
    const result = await verifyAndFulfillTransaction(
      String(OrderTrackingId),
      String(OrderMerchantReference)
    );
    console.log('[Pesapal IPN] Fulfill result:', result);

    // Acknowledge receipt of IPN to Pesapal
    res.json({
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200,
      fulfilled: result.success
    });
  } catch (error) {
    console.error('IPN processing error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 4. Secure Client Verification Callback Endpoint
app.post("/api/pesapal/verify-payment", async (req, res) => {
  try {
    const { orderTrackingId, orderMerchantReference } = req.body;

    if (!orderMerchantReference) {
      return res.status(400).json({ error: "Missing orderMerchantReference" });
    }

    const result = await verifyAndFulfillTransaction(
      String(orderTrackingId || ''),
      String(orderMerchantReference)
    );

    res.json(result);
  } catch (err: any) {
    console.error("Payment Verification API Error:", err);
    res.status(500).json({
      success: false,
      status: 'FAILED',
      message: err.message || "Failed to verify transaction"
    });
  }
});

// --- AUTOMATED EMAIL NOTIFICATION ENDPOINTS ---

// 1. Send Booking Confirmation Email
app.post("/api/email/send-booking-confirmation", async (req, res) => {
  try {
    const { email, clientName, serviceName, date, stylistName, price, bookingId, requestedShade } = req.body;

    if (!email || !serviceName || !date) {
      return res.status(400).json({ error: "Missing required booking details (email, serviceName, date)" });
    }

    const info = await sendBookingConfirmationEmail({
      email,
      clientName: clientName || 'Valued Client',
      serviceName,
      date,
      stylistName,
      price: price || 0,
      bookingId,
      requestedShade
    });

    res.json({ success: true, message: "Booking confirmation email sent successfully", info });
  } catch (err: any) {
    console.error("Booking Confirmation Email Error:", err);
    res.status(500).json({ error: err.message || "Failed to send booking confirmation email" });
  }
});

// 2. Send Product Order Confirmation Email
app.post("/api/email/send-order-confirmation", async (req, res) => {
  try {
    const { email, clientName, orderId, items, total, shippingAddress } = req.body;

    if (!email || !orderId || !items) {
      return res.status(400).json({ error: "Missing required order details (email, orderId, items)" });
    }

    const info = await sendOrderConfirmationEmail({
      email,
      clientName: clientName || 'Valued Client',
      orderId,
      items: items || [],
      total: total || 0,
      shippingAddress
    });

    res.json({ success: true, message: "Order confirmation email sent successfully", info });
  } catch (err: any) {
    console.error("Order Confirmation Email Error:", err);
    res.status(500).json({ error: err.message || "Failed to send order confirmation email" });
  }
});

// 3. Send Digital Gift Card Confirmation Email
app.post("/api/email/send-giftcard-confirmation", async (req, res) => {
  try {
    const { recipientEmail, recipientName, senderName, senderEmail, cardCode, amount, giftNote } = req.body;

    if (!recipientEmail || !cardCode || !amount) {
      return res.status(400).json({ error: "Missing required gift card details (recipientEmail, cardCode, amount)" });
    }

    const info = await sendGiftCardConfirmationEmail({
      recipientEmail,
      recipientName: recipientName || 'Special Recipient',
      senderName: senderName || 'A Friend',
      senderEmail: senderEmail || 'concierge@babyjat.com',
      cardCode,
      amount,
      giftNote
    });

    res.json({ success: true, message: "Gift card confirmation email sent successfully", info });
  } catch (err: any) {
    console.error("Gift Card Confirmation Email Error:", err);
    res.status(500).json({ error: err.message || "Failed to send gift card email" });
  }
});

// --- AUTOMATED SMS & WHATSAPP REMINDER ENDPOINTS ---

// 1. Dispatch single SMS/WhatsApp reminder for an appointment
app.post("/api/reminders/send", async (req, res) => {
  try {
    const { appointmentId, clientName, clientPhone, serviceName, appointmentDate, stylistName, channel, actionConfirmUrl, actionRescheduleUrl } = req.body;

    if (!appointmentId || !serviceName || !appointmentDate) {
      return res.status(400).json({ error: "Missing required details: appointmentId, serviceName, appointmentDate" });
    }

    const payload: ReminderPayload = {
      appointmentId,
      clientName: clientName || "Valued Client",
      clientPhone: clientPhone || "+256700000000",
      serviceName,
      appointmentDate,
      stylistName: stylistName || "Master Stylist",
      channel: channel || "both",
      actionConfirmUrl,
      actionRescheduleUrl
    };

    const result = await dispatchAutomatedReminder(payload);
    res.json({ success: true, message: "Automated SMS & WhatsApp reminder dispatched", result });
  } catch (err: any) {
    console.error("Reminder Dispatch Error:", err);
    res.status(500).json({ error: err.message || "Failed to dispatch reminder" });
  }
});

// 2. Batch 24-hour scan and auto-trigger reminders (Legacy / Manual Array)
app.post("/api/reminders/scan-24h", async (req, res) => {
  try {
    const { appointments } = req.body;
    const results = [];

    if (Array.isArray(appointments)) {
      for (const apt of appointments) {
        const result = await dispatchAutomatedReminder({
          appointmentId: apt.id || `apt_${Math.random().toString(36).substring(2,8)}`,
          clientName: apt.clientName || "Client",
          clientPhone: apt.clientPhone || "+256700000000",
          serviceName: apt.serviceName || "Salon Service",
          appointmentDate: apt.date || "Tomorrow",
          stylistName: apt.stylistName || "Master Stylist",
          channel: "both"
        });
        results.push(result);
      }
    }

    res.json({
      success: true,
      scannedCount: appointments?.length || 0,
      dispatchedCount: results.length,
      results
    });
  } catch (err: any) {
    console.error("Batch 24h Reminder Scan Error:", err);
    res.status(500).json({ error: err.message || "Failed to execute 24h reminder scan" });
  }
});

// 3. Autonomous Cron Worker Status Endpoint
app.get("/api/reminders/cron-status", (req, res) => {
  res.json(getReminderCronStats());
});

// 4. On-Demand Autonomous 24h Scan Execution
app.post("/api/reminders/run-cron", async (req, res) => {
  try {
    const result = await execute24hReminderScan();
    res.json({
      success: true,
      message: "24-hour autonomous reminder scan executed successfully",
      ...result,
      stats: getReminderCronStats()
    });
  } catch (err: any) {
    console.error("Manual Cron Trigger Error:", err);
    res.status(500).json({ error: err.message || "Failed to execute autonomous reminder scan" });
  }
});

// 5. Client Action from Reminder Link (e.g. Confirm or Reschedule)
app.post("/api/reminders/client-action", async (req, res) => {
  try {
    const { appointmentId, action } = req.body;
    if (!appointmentId || !action) {
      return res.status(400).json({ error: "Missing appointmentId or action" });
    }

    // Acknowledge action
    res.json({
      success: true,
      appointmentId,
      action,
      message: action === 'confirm' ? 'Appointment confirmed by client' : 'Reschedule request logged'
    });
  } catch (err: any) {
    console.error("Reminder Client Action Error:", err);
    res.status(500).json({ error: err.message || "Failed to process reminder action" });
  }
});

// 6. --- DAILY EOD (END-OF-DAY) SETTLEMENT ENDPOINTS ---

// EOD Cron Status
app.get("/api/eod/status", (req, res) => {
  res.json(getEODCronStats());
});

// Live Preview of Today's EOD Figures
app.get("/api/eod/preview", async (req, res) => {
  try {
    const targetDate = typeof req.query.date === 'string' ? req.query.date : undefined;
    const report = await compileDailyEODReport(targetDate);
    res.json({ success: true, report });
  } catch (err: any) {
    console.error("EOD Preview Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate EOD preview" });
  }
});

// Manual / Triggered EOD Settlement Compilation & Dispatch
app.post("/api/eod/run-report", async (req, res) => {
  try {
    const { targetDate } = req.body;
    const report = await dispatchDailyEODSettlement(targetDate);
    res.json({
      success: true,
      message: `Daily EOD Settlement Report compiled and dispatched for ${report.reportDate}`,
      report,
      stats: getEODCronStats()
    });
  } catch (err: any) {
    console.error("EOD Run Error:", err);
    res.status(500).json({ error: err.message || "Failed to execute EOD settlement" });
  }
});

async function startServer() {
  // Start autonomous 24h reminder background cron worker (running every 30 mins)
  startReminderCron(30);

  // Start autonomous 20:30 EOD Settlement background worker (checking every 5 mins)
  startEODCron(5);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
