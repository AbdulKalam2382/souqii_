import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { aiSmartSearch, checkCompatibility } from '@/lib/ai';
import { selectBestCourier } from '@/lib/courier';

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
  prompt += '  "intent": "browse" | "search" | "order" | "track" | "compatibility" | "recommend" | "greeting" | "help" | "unknown",\n';
  prompt += '  "searchQuery": "extracted search terms if intent is search, otherwise empty string",\n';
  prompt += '  "productId": null or integer if they mention a specific product ID,\n';
  prompt += '  "orderId": null or integer if they want to track an order,\n';
  prompt += '  "part1Id": null or integer for compatibility check part 1,\n';
  prompt += '  "part2Id": null or integer for compatibility check part 2,\n';
  prompt += '  "quantity": 1 (default) or the number they want to buy,\n';
  prompt += '  "friendlyReply": "A short friendly one-liner acknowledging what they want"\n';
  prompt += '}';

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
    // ORDER — place an order
    // ──────────────────────────────
    else if (intent.intent === 'order') {
      var productId = intent.productId;
      var qty = intent.quantity || 1;

      if (!productId) {
        await sendMessage(chatId, "🛒 Please specify a product ID. Example: \"order 3\"");
        return NextResponse.json({ ok: true });
      }

      // Fetch the product
      const { data: product, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (prodErr || !product) {
        await sendMessage(chatId, "❌ Product ID " + productId + " not found. Type \"browse\" to see available products.");
        return NextResponse.json({ ok: true });
      }

      if (product.stock < qty) {
        await sendMessage(chatId, "😔 Sorry, only " + product.stock + " units of " + product.name + " are in stock.");
        return NextResponse.json({ ok: true });
      }

      // AI selects the best courier
      var courierResult = await selectBestCourier({
        destinationCity: "Kuwait City",
        orderValue: product.price * qty,
        packageWeight: 1.5
      });

      var total = (product.price * qty).toFixed(2);
      var deliveryDate = new Date();
      var daysToAdd = parseInt(courierResult.estimatedDays) || 2;
      deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);
      var estDelivery = deliveryDate.toISOString().split('T')[0];

      // Create the order in Supabase
      const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert({
          status: 'confirmed',
          channel: 'telegram',
          total: total,
          shipping_address: 'Telegram User ' + userName,
          shipping_city: 'Kuwait City',
          courier: courierResult.courier,
          courier_cost: courierResult.cost,
          estimated_delivery: estDelivery,
          ai_courier_reason: courierResult.reasoning
        })
        .select()
        .single();

      if (orderErr) {
        await sendMessage(chatId, "❌ Failed to create order: " + orderErr.message);
        return NextResponse.json({ ok: true });
      }

      // Add order items
      await supabaseAdmin.from('order_items').insert({
        order_id: order.id,
        product_id: product.id,
        quantity: qty,
        unit_price: product.price
      });

      // Reduce stock
      await supabaseAdmin
        .from('products')
        .update({ stock: product.stock - qty })
        .eq('id', product.id);

      // Send confirmation
      var confirm = "✅ <b>Order Confirmed!</b>\n\n";
      confirm += "📦 " + product.name + " x" + qty + "\n";
      confirm += "💰 Total: KD " + total + "\n";
      confirm += "🚚 Courier: " + courierResult.courier + "\n";
      confirm += "📅 Est. Delivery: " + estDelivery + "\n";
      confirm += "🧾 Order ID: #" + order.id + "\n\n";
      confirm += "💡 " + courierResult.reasoning + "\n\n";
      confirm += "Type \"track " + order.id + "\" to check your order status!";
      await sendMessage(chatId, confirm);
    }

    // ──────────────────────────────
    // TRACK — track an order
    // ──────────────────────────────
    else if (intent.intent === 'track') {
      var orderId = intent.orderId;
      if (!orderId) {
        await sendMessage(chatId, "📍 Please provide your order ID. Example: \"track 101\"");
        return NextResponse.json({ ok: true });
      }

      const { data: orderData, error: trackErr } = await supabaseAdmin
        .from('orders')
        .select('*, order_items(*, products(name, price))')
        .eq('id', orderId)
        .single();

      if (trackErr || !orderData) {
        await sendMessage(chatId, "❌ Order #" + orderId + " not found.");
        return NextResponse.json({ ok: true });
      }

      var status = "📍 <b>Order #" + orderData.id + " Status</b>\n\n";
      status += "📊 Status: <b>" + orderData.status + "</b>\n";
      status += "💰 Total: KD " + orderData.total + "\n";
      status += "🚚 Courier: " + (orderData.courier || "Pending") + "\n";
      status += "📅 Est. Delivery: " + (orderData.estimated_delivery || "TBD") + "\n\n";
      if (orderData.order_items && orderData.order_items.length > 0) {
        status += "<b>Items:</b>\n";
        for (var k = 0; k < orderData.order_items.length; k++) {
          var item = orderData.order_items[k];
          var itemName = item.products ? item.products.name : "Product #" + item.product_id;
          status += "• " + itemName + " x" + item.quantity + " — KD " + item.unit_price + "\n";
        }
      }
      await sendMessage(chatId, status);
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
