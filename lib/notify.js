import { GoogleGenerativeAI } from '@google/generative-ai';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

const resend = new Resend(process.env.RESEND_API_KEY || 'missing_key');

async function generatePersonalizedMessage(customerName, items) {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const itemNames = items.map(i => i.name).join(', ');
  const prompt = "You are the friendly AI assistant for Souqii (a PC parts store). Write a short, exciting dispatch notification for buyer " + customerName + ". They bought: " + itemNames + ". Keep it under 3 short sentences. Sound enthusiastic and geeky. Return ONLY the message text.";
  
  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Failed to generate AI message:", err);
    return "Great news " + customerName + ", your Souqii order containing " + itemNames + " has been dispatched!";
  }
}

export async function processOrderNotifications(order) {
  const message = await generatePersonalizedMessage(order.customer_name, order.items);
  
  let DBNotificationId = null;

  try {
    const { data: notifData } = await supabase
      .from('notifications')
      .insert({
        order_id: order.id,
        user_id: order.customer_id,
        message: message,
        status: 'pending'
      })
      .select()
      .single();
      
    if (notifData) DBNotificationId = notifData.id;
  } catch (dbErr) {
    console.error("DB Logging issue:", dbErr);
  }

  let telegramSuccess = false;
  let emailSuccess = false;

  // Send via Telegram (bot channel priority)
  if (order.source === 'bot' && order.telegram_chat_id && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const tgUrl = "https://api.telegram.org/bot" + process.env.TELEGRAM_BOT_TOKEN + "/sendMessage";
      const res = await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: order.telegram_chat_id,
          text: "📦 " + message
        })
      });
      const tgData = await res.json();
      telegramSuccess = tgData.ok;
    } catch (e) {
      console.error("Telegram posting error:", e);
    }
  }

  // Send Email backup (Resend) if Telegram fails or it's a website user
  if (!telegramSuccess && order.customer_email && process.env.RESEND_API_KEY) {
    try {
      const { error } = await resend.emails.send({
        from: 'Souqii Orders <onboarding@resend.dev>', 
        to: [order.customer_email],
        subject: "Your Souqii PC Parts (Order #" + order.id + ")",
        html: "<h3>Order Update</h3><p>" + message + "</p>"
      });
      if (!error) emailSuccess = true;
    } catch (e) {
      console.error("Resend emailing error:", e);
    }
  }

  // Update Notification Status in Supabase
  if (DBNotificationId) {
    await supabase
      .from('notifications')
      .update({ status: (telegramSuccess || emailSuccess) ? 'sent' : 'failed' })
      .eq('id', DBNotificationId);
  }

  return { 
    success: (telegramSuccess || emailSuccess),
    transport: telegramSuccess ? 'telegram' : (emailSuccess ? 'email' : 'none'),
    messageSent: message 
  };
}
