import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
        redirect_url: `/checkout/success?order_tracking_id=mock_${orderId}`,
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

// 3. Handle IPN Callback from Pesapal
app.get("/api/pesapal/ipn", async (req, res) => {
  const { OrderNotificationType, OrderTrackingId, OrderMerchantReference } = req.query;
  
  if (!OrderTrackingId || !OrderMerchantReference) {
    return res.status(400).send('Missing tracking ID or reference');
  }

  try {
    const token = await getPesapalToken();
    const url = `${getPesapalBaseUrl()}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const statusData = await response.json();
      console.log('Pesapal Transaction Status:', statusData);
      
      // In a real app, you would verify the payment status here and update Firestore:
      // statusData.payment_status_description === 'Completed'
      // statusData.amount
      // e.g., admin.firestore().collection('orders').doc(OrderMerchantReference).update({ status: 'completed' })
    }

    // Acknowledge receipt of IPN
    res.json({
      orderNotificationType: OrderNotificationType,
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200
    });
  } catch (error) {
    console.error('IPN processing error:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function startServer() {
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
