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

export async function sendDispatchNotification(orderId, customerName, items, courier, estDelivery, chatId = null, email = null) {
  const message = await generatePersonalizedMessage(customerName, items);
  const fullMessage = `${message}\n\n🚚 Courier: ${courier}\n📅 Est. Delivery: ${estDelivery}\n🧾 Order: #${orderId}`;

  let telegramSuccess = false;
  let emailSuccess = false;

  // 1. Try Telegram if chatId is provided
  if (chatId && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const tgUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const res = await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: "📦 " + fullMessage,
          parse_mode: 'HTML'
        })
      });
      const data = await res.json();
      telegramSuccess = data.ok;
    } catch (e) {
      console.error("Telegram notify error:", e);
    }
  }

  // 2. Try Email if telegram failed or no chatId
  if (!telegramSuccess && email && process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: 'Souqii Orders <onboarding@resend.dev>',
        to: [email],
        subject: `Your Souqii Order #${orderId} is Dispatched!`,
        html: `<h3>Great News!</h3><p>${fullMessage.replace(/\n/g, '<br>')}</p>`
      });
      emailSuccess = true;
    } catch (e) {
      console.error("Email notify error:", e);
    }
  }

  return telegramSuccess || emailSuccess;
}

export async function processOrderNotifications(order) {
  return await sendDispatchNotification(
    order.id,
    order.customer_name || "Valued Customer",
    order.items,
    order.courier,
    order.estimated_delivery,
    order.telegram_chat_id,
    order.customer_email
  );
}
