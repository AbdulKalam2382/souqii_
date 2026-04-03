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

// Helper: format a product card as text
function formatProduct(p) {
  var msg = "🖥 <b>" + p.name + "</b>\n";
  msg += "💰 Price: KD " + p.price + "\n";
  msg += "📦 Stock: " + (p.stock > 0 ? p.stock + " available" : "Out of stock") + "\n";
  if (p.specs) {
    var specsStr = typeof p.specs === 'string' ? p.specs : JSON.stringify(p.specs);
    if (specsStr.length > 200) specsStr = specsStr.substring(0, 200) + "...";
    msg += "📋 Specs: " + specsStr + "\n";
  }
  msg += "🆔 Product ID: " + p.id;
  return msg;
}

// ──────────────────────────────────────────
// PENDING CART: Store in Supabase via 
// a simple "telegram_pending_orders" approach
// using the existing orders table with 
// status='draft' and telegram_chat_id
// ──────────────────────────────────────────

// Check if user has a pending draft (waiting for address)
async function getPendingDraft(chatId) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products(name, price))')
    .eq('telegram_chat_id', chatId.toString())
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) {
    console.error("Error checking pending draft:", error);
    return null;
  }
  return data;
}

// Create a draft order (product selected, waiting for address)
async function createDraftOrder(chatId, productId, qty) {
  // First clean up any old drafts for this chat
  await supabaseAdmin
    .from('orders')
    .delete()
    .eq('telegram_chat_id', chatId.toString())
    .eq('status', 'draft');

  // Get product info
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  
  if (prodErr || !product) return { error: 'Product not found' };
  if (product.stock < qty) return { error: `Only ${product.stock} units in stock` };

  const total = (product.price * qty).toFixed(2);

  // Create draft order
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .insert({
      status: 'draft',
      channel: 'telegram',
      total: total,
      telegram_chat_id: chatId.toString()
    })
    .select()
    .single();

  if (orderErr) return { error: orderErr.message };

  // Add items
  await supabaseAdmin.from('order_items').insert({
    order_id: order.id,
    product_id: product.id,
    quantity: qty,
    unit_price: product.price
  });

  return { order, product, total };
}

// Finalize draft with address and generate Stripe link
async function finalizeDraft(orderId, address, city) {
  // Get AI courier
  const { data: orderData } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products(*))')
    .eq('id', orderId)
    .single();

  if (!orderData) return { error: 'Draft not found' };

  const aiCourier = await selectBestCourier({
    destinationCity: city,
    orderValue: parseFloat(orderData.total),
    packageWeight: 1.5
  });

  // Update draft to pending_payment
  const { error: upErr } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'pending_payment',
      shipping_address: address,
      shipping_city: city,
      courier: aiCourier.courier,
      courier_cost: aiCourier.cost,
      estimated_delivery: aiCourier.estimatedDays,
      ai_courier_reason: aiCourier.reasoning
    })
    .eq('id', orderId);

  if (upErr) return { error: upErr.message };

  // Generate Stripe link
  const baseUrl = "https://souqii-one.vercel.app";
  const checkoutUrl = await createCheckoutSession(orderId, parseFloat(orderData.total), baseUrl);

  return { checkoutUrl, courier: aiCourier, orderData };
}

// Use Gemini to understand what the user wants from their natural message
async function parseUserIntent(userMessage) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  var prompt = 'You are the AI chatbot for Souqii, a PC parts e-commerce store in Kuwait. ';
  prompt += 'Analyze this customer message and determine their intent.\n\n';
  prompt += 'Customer message: "' + userMessage + '"\n\n';
  prompt += 'Return exactly this JSON:\n';
  prompt += '{\n';
  prompt += '  "intent": "browse" | "search" | "order" | "track" | "compatibility" | "recommend" | "greeting" | "help" | "address" | "unknown",\n';
  prompt += '  "searchQuery": "extracted search terms if intent is search, otherwise empty string",\n';
  prompt += '  "productId": null or integer if they mention a specific product ID,\n';
  prompt += '  "shippingAddress": "extracted shipping address if this looks like an address, otherwise null",\n';
  prompt += '  "shippingCity": "extracted city in Kuwait (default: Kuwait City) if mentioned, otherwise null",\n';
  prompt += '  "orderId": null or integer if they want to track an order,\n';
  prompt += '  "part1Id": null or integer for compatibility check part 1,\n';
  prompt += '  "part2Id": null or integer for compatibility check part 2,\n';
  prompt += '  "quantity": 1 (default) or the number they want to buy,\n';
  prompt += '  "friendlyReply": "A short friendly one-liner acknowledging what they want"\n';
  prompt += '}\n\n';
  prompt += 'IMPORTANT: If the message looks like a physical address or location (contains block, street, area name, etc), set intent to "address" and put the full text in shippingAddress.';

  try {
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (err) {
    console.error("Intent parsing error:", err);
    return { intent: "unknown", searchQuery: "", friendlyReply: "I didn't quite catch that!" };
  }
}

// ============================
// MAIN WEBHOOK HANDLER
// ============================
export async function POST(request) {
  try {
    const body = await request.json();

    // Telegram sends updates with a "message" field
    if (!body.message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = body.message.chat.id;
    const userName = body.message.from.first_name || "Friend";
    const userMessage = (body.message.text || "").trim();

    if (!userMessage) {
      return NextResponse.json({ ok: true });
    }

    // ──────────────────────────────
    // Handle /start command
    // ──────────────────────────────
    if (userMessage === '/start') {
      var welcome = "👋 Welcome to <b>Souqii</b>, " + userName + "!\n\n";
      welcome += "I'm your AI-powered PC parts assistant. Here's what I can do:\n\n";
      welcome += "🔍 <b>Search</b> — Just type what you want!\n";
      welcome += '   Example: "gaming GPU under $500"\n\n';
      welcome += "📦 <b>Browse</b> — Type \"browse\" to see all products\n\n";
      welcome += "🛒 <b>Order</b> — Type \"order [product ID]\"\n";
      welcome += '   Example: "order 3"\n\n';
      welcome += "🔧 <b>Compatibility</b> — Type \"compatible [ID1] [ID2]\"\n";
      welcome += '   Example: "compatible 1 5"\n\n';
      welcome += "📍 <b>Track</b> — Type \"track [order ID]\"\n";
      welcome += '   Example: "track 101"\n\n';
      welcome += "Just type naturally — I understand plain English! 🚀";
      await sendMessage(chatId, welcome);
      return NextResponse.json({ ok: true });
    }

    // ──────────────────────────────
    // CHECK: Does user have a pending draft order waiting for address?
    // ──────────────────────────────
    const pendingDraft = await getPendingDraft(chatId);

    if (pendingDraft) {
      // User has a draft order — this message is probably their address
      // Use AI to check if this looks like an address or an explicit cancel
      const lowerMsg = userMessage.toLowerCase();
      
      if (lowerMsg === 'cancel' || lowerMsg === '/cancel') {
        // Cancel the draft
        await supabaseAdmin.from('order_items').delete().eq('order_id', pendingDraft.id);
        await supabaseAdmin.from('orders').delete().eq('id', pendingDraft.id);
        await sendMessage(chatId, "🚫 Order cancelled. Feel free to browse again!");
        return NextResponse.json({ ok: true });
      }

      // Treat the message as the shipping address
      const intent = await parseUserIntent(userMessage);
      const address = intent.shippingAddress || userMessage;
      const city = intent.shippingCity || "Kuwait City";

      await sendMessage(chatId, "📍 Got your address! Setting up payment...");

      const result = await finalizeDraft(pendingDraft.id, address, city);
      
      if (result.error) {
        await sendMessage(chatId, "❌ Error: " + result.error);
        return NextResponse.json({ ok: true });
      }

      // Get item names for the confirmation
      const itemNames = pendingDraft.order_items
        ? pendingDraft.order_items.map(oi => oi.products ? oi.products.name : 'Product').join(', ')
        : 'Your items';

      var confirm = "🛒 <b>Order Ready!</b>\n\n";
      confirm += "📦 " + itemNames + "\n";
      confirm += "💰 Total: KD " + pendingDraft.total + "\n";
      confirm += "📍 Shipping to: " + address + ", " + city + "\n";
      confirm += "🚚 Courier: " + result.courier.courier + " (" + result.courier.estimatedDays + ")\n\n";
      confirm += "Complete your payment below:";

      await sendMessage(chatId, confirm, {
        reply_markup: {
          inline_keyboard: [[
            { text: "💳 Pay Now (Secure Stripe)", url: result.checkoutUrl }
          ]]
        }
      });

      return NextResponse.json({ ok: true });
    }

    // ──────────────────────────────
    // Use AI to understand the message
    // ──────────────────────────────
    const intent = await parseUserIntent(userMessage);

    // Send the friendly acknowledgment first
    if (intent.friendlyReply && intent.intent !== 'greeting') {
      await sendMessage(chatId, "🤖 " + intent.friendlyReply);
    }

    // ──────────────────────────────
    // GREETING
    // ──────────────────────────────
    if (intent.intent === 'greeting') {
      var hi = "Hey " + userName + "! 👋 Welcome to Souqii!\n";
      hi += "I'm here to help you find the perfect PC parts. Just tell me what you need!";
      await sendMessage(chatId, hi);
    }

    // ──────────────────────────────
    // BROWSE — show all products
    // ──────────────────────────────
    else if (intent.intent === 'browse') {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price, stock')
        .order('id', { ascending: true });

      if (!products || products.length === 0) {
        await sendMessage(chatId, "😔 No products found in the store right now.");
      } else {
        var list = "📋 <b>Souqii Product Catalog</b>\n\n";
        for (var i = 0; i < products.length; i++) {
          var p = products[i];
          list += "• <b>" + p.name + "</b> — KD " + p.price + " (ID: " + p.id + ")\n";
        }
        list += "\nType \"order [ID]\" to buy, or ask me about any product!";
        await sendMessage(chatId, list);
      }
    }

    // ──────────────────────────────
    // SEARCH — AI-powered search
    // ──────────────────────────────
    else if (intent.intent === 'search') {
      var query = intent.searchQuery || userMessage;
      var results = await aiSmartSearch(query);

      if (!results || results.length === 0) {
        await sendMessage(chatId, "😔 No products matched \"" + query + "\". Try different keywords!");
      } else {
        await sendMessage(chatId, "🔍 Found " + results.length + " result(s):\n");
        // Show max 5 results
        var limit = Math.min(results.length, 5);
        for (var j = 0; j < limit; j++) {
          await sendMessage(chatId, formatProduct(results[j]));
        }
        if (results.length > 5) {
          await sendMessage(chatId, "...and " + (results.length - 5) + " more. Narrow your search to see them!");
        }
      }
    }

    // ──────────────────────────────
    // ORDER — place an order (Step 1: create draft, ask for address)
    // ──────────────────────────────
    else if (intent.intent === 'order') {
      var productId = intent.productId;
      var qty = intent.quantity || 1;

      if (!productId) {
        await sendMessage(chatId, "🛒 Please specify a product ID. Example: \"order 3\"");
        return NextResponse.json({ ok: true });
      }

      // Check if they also provided an address in the same message
      if (intent.shippingAddress) {
        // Full order in one message! Create draft and finalize immediately
        const draftResult = await createDraftOrder(chatId, productId, qty);
        if (draftResult.error) {
          await sendMessage(chatId, "❌ " + draftResult.error);
          return NextResponse.json({ ok: true });
        }

        const finalResult = await finalizeDraft(
          draftResult.order.id,
          intent.shippingAddress,
          intent.shippingCity || "Kuwait City"
        );

        if (finalResult.error) {
          await sendMessage(chatId, "❌ " + finalResult.error);
          return NextResponse.json({ ok: true });
        }

        var oneshot = "🛒 <b>Order Ready!</b>\n\n";
        oneshot += "📦 " + draftResult.product.name + " x" + qty + "\n";
        oneshot += "💰 Total: KD " + draftResult.total + "\n";
        oneshot += "📍 Shipping to: " + intent.shippingAddress + "\n";
        oneshot += "🚚 Courier: " + finalResult.courier.courier + "\n\n";
        oneshot += "Complete your payment below:";

        await sendMessage(chatId, oneshot, {
          reply_markup: {
            inline_keyboard: [[
              { text: "💳 Pay Now (Secure Stripe)", url: finalResult.checkoutUrl }
            ]]
          }
        });

        return NextResponse.json({ ok: true });
      }

      // No address provided — create a draft and ask for address
      const draftResult = await createDraftOrder(chatId, productId, qty);
      if (draftResult.error) {
        await sendMessage(chatId, "❌ " + draftResult.error);
        return NextResponse.json({ ok: true });
      }

      var askAddr = "✅ <b>Added to your order:</b>\n\n";
      askAddr += "📦 " + draftResult.product.name + " x" + qty + "\n";
      askAddr += "💰 Total: KD " + draftResult.total + "\n\n";
      askAddr += "📍 <b>Where should I ship this?</b>\n";
      askAddr += "Just type your address (e.g., \"Block 5, Salmiya\")\n\n";
      askAddr += "Type /cancel to cancel the order.";
      
      await sendMessage(chatId, askAddr);
    }

    // ──────────────────────────────
    // TRACK — track an order
    // ──────────────────────────────
    else if (intent.intent === 'track') {
      var trackOrderId = intent.orderId;
      if (!trackOrderId) {
        // Try to find their most recent order by chat ID
        const { data: recentOrder } = await supabaseAdmin
          .from('orders')
          .select('*, order_items(*, products(name, price))')
          .eq('telegram_chat_id', chatId.toString())
          .neq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentOrder) {
          trackOrderId = recentOrder.id;
        } else {
          await sendMessage(chatId, "📍 Please provide your order ID. Example: \"track 101\"");
          return NextResponse.json({ ok: true });
        }
      }

      const { data: orderData, error: trackErr } = await supabaseAdmin
        .from('orders')
        .select('*, order_items(*, products(name, price))')
        .eq('id', trackOrderId)
        .single();

      if (trackErr || !orderData) {
        await sendMessage(chatId, "❌ Order #" + trackOrderId + " not found.");
        return NextResponse.json({ ok: true });
      }

      var statusEmoji = orderData.status === 'paid' ? '✅' : orderData.status === 'pending_payment' ? '⏳' : '📦';
      var status = "📍 <b>Order #" + orderData.id + " Status</b>\n\n";
      status += "📊 Status: <b>" + statusEmoji + " " + orderData.status + "</b>\n";
      status += "💰 Total: KD " + orderData.total + "\n";
      status += "🚚 Courier: " + (orderData.courier || "Pending") + "\n";
      status += "📅 Est. Delivery: " + (orderData.estimated_delivery || "TBD") + "\n";
      status += "📍 Address: " + (orderData.shipping_address || "—") + "\n\n";
      if (orderData.order_items && orderData.order_items.length > 0) {
        status += "<b>Items:</b>\n";
        for (var k = 0; k < orderData.order_items.length; k++) {
          var item = orderData.order_items[k];
          var itemName = item.products ? item.products.name : "Product #" + item.product_id;
          status += "• " + itemName + " x" + item.quantity + " — KD " + item.unit_price + "\n";
        }
      }

      // If pending payment, show pay button again
      if (orderData.status === 'pending_payment') {
        status += "\n⚠️ <b>Payment not yet completed.</b>";
        try {
          const baseUrl = "https://souqii-one.vercel.app";
          const payUrl = await createCheckoutSession(orderData.id, parseFloat(orderData.total), baseUrl);
          await sendMessage(chatId, status, {
            reply_markup: {
              inline_keyboard: [[
                { text: "💳 Complete Payment", url: payUrl }
              ]]
            }
          });
        } catch {
          await sendMessage(chatId, status);
        }
      } else {
        await sendMessage(chatId, status);
      }
    }

    // ──────────────────────────────
    // COMPATIBILITY — check two parts
    // ──────────────────────────────
    else if (intent.intent === 'compatibility') {
      var p1 = intent.part1Id;
      var p2 = intent.part2Id;
      if (!p1 || !p2) {
        await sendMessage(chatId, "🔧 Please provide two product IDs. Example: \"compatible 1 5\"");
        return NextResponse.json({ ok: true });
      }

      var compat = await checkCompatibility(p1, p2);
      var icon = compat.compatible ? "✅" : "❌";
      var msg = icon + " <b>Compatibility Check</b>\n\n";
      msg += compat.notes;
      await sendMessage(chatId, msg);
    }

    // ──────────────────────────────
    // HELP or UNKNOWN
    // ──────────────────────────────
    else {
      var helpMsg = "🤖 Here's how to use Souqii bot:\n\n";
      helpMsg += "🔍 Just type what you're looking for\n";
      helpMsg += "📦 \"browse\" — see all products\n";
      helpMsg += "🛒 \"order 3\" — buy product with ID 3\n";
      helpMsg += "🔧 \"compatible 1 5\" — check if parts work together\n";
      helpMsg += "📍 \"track 101\" — track your order\n\n";
      helpMsg += "Or just chat with me naturally! I'm powered by AI 🧠";
      await sendMessage(chatId, helpMsg);
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true }); // Always return 200 so Telegram doesn't retry
  }
}
