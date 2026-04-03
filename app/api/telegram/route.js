import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { aiSmartSearch, checkCompatibility } from '@/lib/ai';
import { selectBestCourier } from '@/lib/courier';
import { createCheckoutSession } from '@/lib/stripe';

// Helper: send a message back to the user on Telegram
async function sendMessage(chatId, text, options) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const url = "https://api.telegram.org/bot" + token + "/sendMessage";
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  if (options && options.reply_markup) {
    payload.reply_markup = options.reply_markup;
  }
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// Helper: get clean organized specs for the bot without stock display
function formatProduct(p) {
  var msg = "🖥 <b>" + p.name + "</b>\n";
  msg += "💰 Price: KD " + p.price + "\n";
  
  // Hide stock as requested, just cleanly display specs
  if (p.specs) {
    msg += "\n<b>Specifications:</b>\n";
    if (p.specs.socket) msg += "• Socket: " + p.specs.socket + "\n";
    if (p.specs.cores) msg += "• Cores: " + p.specs.cores + " Cores\n";
    if (p.specs.vram) msg += "• VRAM: " + p.specs.vram + "\n";
    if (p.specs.chipset) msg += "• Chipset: " + p.specs.chipset + "\n";
    if (p.specs.type) msg += "• Type: " + p.specs.type + "\n";
    if (p.specs.capacity) msg += "• Capacity: " + p.specs.capacity + "\n";
    if (p.specs.wattage) msg += "• Power: " + p.specs.wattage + "\n";
    if (p.specs.tdp) msg += "• TDP: " + p.specs.tdp + "\n";
  }
  msg += "\n💡 Type <b>Buy " + p.id + "</b> to order this item.";
  return msg;
}

// ──────────────────────────────────────────
// STATE MACHINE: Multi-step address collection
// using the 'bot_state' and 'orders' columns
// ──────────────────────────────────────────

async function getPendingDraft(chatId) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products(name, price))')
    .eq('telegram_chat_id', chatId.toString())
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) return null;
  return data;
}

async function createDraftOrder(chatId, productId, qty) {
  await supabaseAdmin
    .from('orders')
    .delete()
    .eq('telegram_chat_id', chatId.toString())
    .eq('status', 'draft');

  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  
  if (prodErr || !product) return { error: 'Product not found' };

  const total = (product.price * qty).toFixed(2);

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .insert({
      status: 'draft',
      channel: 'telegram',
      total: total,
      telegram_chat_id: chatId.toString(),
      // Use bot_state if column exists, otherwise we wait for the user to add it.
      bot_state: 'awaiting_door' 
    })
    .select()
    .single();

  if (orderErr) return { error: orderErr.message };

  await supabaseAdmin.from('order_items').insert({
    order_id: order.id,
    product_id: product.id,
    quantity: qty,
    unit_price: product.price
  });

  return { order, product, total };
}

async function advanceDraftState(orderId, currentState, userInput) {
  let updateData = {};
  let nextStateLabel = "";
  let botReply = "";

  switch (currentState) {
    case 'awaiting_door':
      updateData = { door_number: userInput, bot_state: 'awaiting_street' };
      nextStateLabel = "awaiting_street";
      botReply = "Got the House/Door number. Next, what is your **Street Name or Number**?";
      break;
    case 'awaiting_street':
      updateData = { street: userInput, bot_state: 'awaiting_block' };
      nextStateLabel = "awaiting_block";
      botReply = "Got the Street. Next, what is your **Block Number**?";
      break;
    case 'awaiting_block':
      updateData = { block: userInput, bot_state: 'awaiting_area' };
      nextStateLabel = "awaiting_area";
      botReply = "Got the Block. Next, what **Area** in Kuwait is this? (e.g. Salmiya, Hawally)";
      break;
    case 'awaiting_area':
      updateData = { area: userInput, bot_state: 'awaiting_city' };
      nextStateLabel = "awaiting_city";
      botReply = "Got the Area. What is the **City / Governorate**?";
      break;
    case 'awaiting_city':
      updateData = { shipping_city: userInput, bot_state: 'awaiting_pincode' };
      nextStateLabel = "awaiting_pincode";
      botReply = "Got the Governorate. Finally, what is your **Pincode / Postal Code**? (Type 'skip' if you don't know it).";
      break;
    case 'awaiting_pincode':
      updateData = { pincode: userInput === 'skip' ? '' : userInput, bot_state: 'completed' };
      nextStateLabel = "completed";
      break;
    default:
      return { error: 'Invalid state' };
  }

  const { error } = await supabaseAdmin.from('orders').update(updateData).eq('id', orderId);
  return { error: error ? error.message : null, nextState: nextStateLabel, botReply };
}

async function finalizeDraft(orderId) {
  const { data: orderData } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products(*))')
    .eq('id', orderId)
    .single();

  if (!orderData) return { error: 'Draft not found' };

  // Format old string block for legacy reference
  const compiledAddress = `House ${orderData.door_number || ''}, St ${orderData.street || ''}, Blk ${orderData.block || ''}, ${orderData.area || ''}, ${orderData.pincode || ''}`;

  const aiCourier = await selectBestCourier({
    destinationCity: orderData.shipping_city,
    orderValue: parseFloat(orderData.total),
    packageWeight: 1.5
  });

  const { error: upErr } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'pending_payment',
      shipping_address: compiledAddress,
      courier: aiCourier.courier,
      courier_cost: aiCourier.cost,
      estimated_delivery: aiCourier.estimatedDays,
      ai_courier_reason: aiCourier.reasoning
    })
    .eq('id', orderId);

  if (upErr) return { error: upErr.message };

  const baseUrl = "https://souqii-one.vercel.app";
  const checkoutUrl = await createCheckoutSession(orderId, parseFloat(orderData.total), baseUrl);

  return { checkoutUrl, courier: aiCourier, orderData, compiledAddress };
}

// ──────────────────────────────────────────
// Natural Language Intent Parsing
// ──────────────────────────────────────────
async function parseUserIntent(userMessage) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  var prompt = 'You are the AI chatbot for Souqii, a PC parts store. ';
  prompt += 'Analyze the customer message and determine exactly what they want.\n\n';
  prompt += 'Customer message: "' + userMessage + '"\n\n';
  prompt += 'RULES:\n';
  prompt += '1. If they say "Track ID 33" or "Where is my order", the intent is "track".\n';
  prompt += '2. If they say "Buy 33" or "Order ID 33", the intent is "order" and productId is 33.\n';
  prompt += '3. If they say "I want to buy a GPU" or "Looking for RAM", the intent is "search".\n';
  prompt += '4. If they say "is this compatible with...", the intent is "compatibility".\n\n';
  prompt += 'Return exactly this JSON:\n';
  prompt += '{\n';
  prompt += '  "intent": "browse" | "search" | "order" | "track" | "compatibility" | "greeting" | "help" | "unknown",\n';
  prompt += '  "searchQuery": "extracted terms to search specifically",\n';
  prompt += '  "productId": null or integer (if explicitly purchasing an ID),\n';
  prompt += '  "orderId": null or integer (if tracking an ID),\n';
  prompt += '  "quantity": 1,\n';
  prompt += '  "friendlyReply": "A short friendly prefix acknowledgment"\n';
  prompt += '}\n';

  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch {
    return { intent: "unknown" };
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.message) return NextResponse.json({ ok: true });

    const chatId = body.message.chat.id;
    const userName = body.message.from.first_name || "Friend";
    const userMessage = (body.message.text || "").trim();

    if (!userMessage) return NextResponse.json({ ok: true });

    // Handle initial /start
    if (userMessage === '/start') {
      var welcome = "👋 Welcome to <b>Souqii</b>, " + userName + "!\n\n";
      welcome += "I'm your AI-powered PC Parts Assistant. I can help you find products, check compatibility, and place orders directly here.\n\n";
      welcome += "Just type what you're looking for natively, e.g.:\n";
      welcome += "<i>\"I want to buy a gaming GPU\"</i> or <i>\"Do you have DDR5 RAM?\"</i>";
      await sendMessage(chatId, welcome);
      return NextResponse.json({ ok: true });
    }

    // ──────────────────────────────
    // CHECK if user is inside a multi-step address collection flow
    // ──────────────────────────────
    const pendingDraft = await getPendingDraft(chatId);

    if (pendingDraft && pendingDraft.bot_state && pendingDraft.bot_state !== 'completed') {
      const lowerMsg = userMessage.toLowerCase();
      
      if (lowerMsg === 'cancel' || lowerMsg === '/cancel') {
        await supabaseAdmin.from('order_items').delete().eq('order_id', pendingDraft.id);
        await supabaseAdmin.from('orders').delete().eq('id', pendingDraft.id);
        await sendMessage(chatId, "🚫 Order cancelled. Need anything else?");
        return NextResponse.json({ ok: true });
      }

      // Advance the state machine
      const result = await advanceDraftState(pendingDraft.id, pendingDraft.bot_state, userMessage);
      
      if (result.error) {
        await sendMessage(chatId, "❌ Setup encountered an anomaly. Type /cancel to abort or try again.");
        return NextResponse.json({ ok: true });
      }

      if (result.nextState !== 'completed') {
        await sendMessage(chatId, result.botReply);
        return NextResponse.json({ ok: true });
      } else {
        // Completed the 6 steps! Let's finalize it.
        await sendMessage(chatId, "⏳ Information secured. Generating invoice and querying optimal courier...");

        const finalResult = await finalizeDraft(pendingDraft.id);
        
        if (finalResult.error) {
          await sendMessage(chatId, "❌ Checkout creation failed: " + finalResult.error);
          return NextResponse.json({ ok: true });
        }

        const itemNames = pendingDraft.order_items
          ? pendingDraft.order_items.map(oi => oi.products ? oi.products.name : 'Product').join(', ')
          : 'Your items';

        var confirm = "🛒 <b>Order Invoice Ready!</b>\n\n";
        confirm += "📦 Item: " + itemNames + "\n";
        confirm += "💰 Total: KD " + pendingDraft.total + "\n";
        confirm += "📍 Ships to: " + finalResult.compiledAddress + "\n";
        confirm += "🚚 Optimal Courier: " + finalResult.courier.courier + " (" + finalResult.courier.estimatedDays + ")\n\n";
        confirm += "Your order is ready for payment:";

        await sendMessage(chatId, confirm, {
          reply_markup: {
            inline_keyboard: [[
              { text: "💳 Proceed to Payment", url: finalResult.checkoutUrl }
            ]]
          }
        });

        return NextResponse.json({ ok: true });
      }
    }

    // ──────────────────────────────
    // Intent Detection
    // ──────────────────────────────
    const intent = await parseUserIntent(userMessage);

    if (intent.friendlyReply && intent.intent !== 'greeting') {
      await sendMessage(chatId, "🤖 " + intent.friendlyReply);
    }

    if (intent.intent === 'search' || intent.intent === 'browse') {
      var query = intent.searchQuery || userMessage;
      var results = await aiSmartSearch(query);

      if (!results || results.length === 0) {
        await sendMessage(chatId, "😔 No parts found matching that description. Tell me what else you need.");
      } else {
        await sendMessage(chatId, "🔍 Found these optimized matches for you:\n");
        var limit = Math.min(results.length, 4);
        for (var j = 0; j < limit; j++) {
          await sendMessage(chatId, formatProduct(results[j]));
        }
      }
    }
    
    // Explicit purchase intent
    else if (intent.intent === 'order') {
      var productId = intent.productId;

      // Handle raw "Buy 3" bypassing AI parse 
      if (!productId) {
         const match = userMessage.match(/buy\s+(\d+)/i) || userMessage.match(/order\s+(\d+)/i);
         if (match) productId = parseInt(match[1]);
      }

      if (!productId) {
        await sendMessage(chatId, "🛒 Specify the exact Item ID you want to secure. Example: \"Buy 3\"");
        return NextResponse.json({ ok: true });
      }

      const draftResult = await createDraftOrder(chatId, productId, intent.quantity || 1);
      if (draftResult.error) {
        await sendMessage(chatId, "❌ " + draftResult.error);
        return NextResponse.json({ ok: true });
      }

      var askAddr = "✅ <b>Item Selected:</b> " + draftResult.product.name + "\n";
      askAddr += "💰 Cost: KD " + draftResult.total + "\n\n";
      askAddr += "Let's capture your exact delivery coordinates.\n\n";
      askAddr += "📍 What is your <b>Door or House Number</b>?";
      
      await sendMessage(chatId, askAddr);
    }

    else if (intent.intent === 'track') {
      var trackOrderId = intent.orderId;

      if (!trackOrderId) {
         const match = userMessage.match(/track\s+([a-zA-Z0-9\-]+)/i);
         if (match) trackOrderId = match[1];
         else {
            await sendMessage(chatId, "📍 Please supply the specific tracker ID.");
            return NextResponse.json({ ok: true });
         }
      }

      const { data: orderData, error: trackErr } = await supabaseAdmin
        .from('orders')
        .select('*, order_items(*, products(name, price))')
        .eq('id', trackOrderId)
        .single();

      if (trackErr || !orderData) {
        await sendMessage(chatId, "❌ Database returned no match for Order ID: " + trackOrderId);
        return NextResponse.json({ ok: true });
      }

      var statusEmoji = orderData.status === 'paid' ? '✅' : orderData.status === 'pending_payment' ? '⏳' : '📦';
      var status = "📍 <b>Logistics Trace: Order #" + orderData.id.split('-')[0] + "</b>\n\n";
      status += "📊 Status: <b>" + statusEmoji + " " + orderData.status + "</b>\n";
      status += "🚚 Courier Option: " + (orderData.courier || "Pending calculation") + "\n";
      status += "📅 Arrival Vector: " + (orderData.estimated_delivery || "TBD") + "\n";
      status += "📍 Destination: " + (orderData.shipping_city || "—") + "\n\n";

      if (orderData.status === 'pending_payment') {
        const baseUrl = "https://souqii-one.vercel.app";
        const payUrl = await createCheckoutSession(orderData.id, parseFloat(orderData.total), baseUrl);
        await sendMessage(chatId, status + "\n⚠️ Remittance required to trigger shipping protocol.", {
          reply_markup: {
            inline_keyboard: [[ { text: "💳 Complete Remittance", url: payUrl } ]]
          }
        });
      } else {
        await sendMessage(chatId, status);
      }
    }

    else if (intent.intent === 'compatibility') {
      var p1 = intent.part1Id;
      var p2 = intent.part2Id;
      if (!p1 || !p2) {
        // Fallback or natural text parse. 
        await sendMessage(chatId, "🔧 To run a strict diagnostic, supply two specific IDs (e.g. \"compare 12 and 15\")");
        return NextResponse.json({ ok: true });
      }

      var compat = await checkCompatibility(p1, p2);
      var icon = compat.compatible ? "✅" : "❌";
      var msg = icon + " <b>Setup Diagnostic Scan</b>\n\n";
      if (compat.accuracyRate) msg += "🎯 Predictive Accuracy: " + compat.accuracyRate + "\n\n";
      if (compat.performanceImpact) msg += "🚀 <b>Performance Projection:</b>\n" + compat.performanceImpact + "\n\n";
      msg += "📋 <b>Engineer Notes:</b>\n" + compat.notes;
      
      await sendMessage(chatId, msg);
    }
    else {
      var helpMsg = "🤖 <b>Souqii Diagnostics</b>\n";
      helpMsg += "• Query any component (e.g. \"I want a GPU\")\n";
      helpMsg += "• Buy directly (e.g. \"Buy 3\")\n";
      helpMsg += "• Run system checks (e.g. \"Is ID 4 compatible with ID 10?\")\n";
      helpMsg += "• Scan package vectors (e.g. \"Track 12345\")";
      await sendMessage(chatId, helpMsg);
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("Telegram trace error:", err);
    return NextResponse.json({ ok: true });
  }
}
