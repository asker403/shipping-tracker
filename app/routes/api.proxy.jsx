import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);
    
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const shop = session.shop;
    const body = await request.json();
    const { event, cartTotal } = body;

    if (!event || !["impression", "threshold_reached"].includes(event)) {
      return new Response(JSON.stringify({ error: "Invalid event type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await db.analyticsEvent.create({
      data: {
        shop,
        event,
        cartTotal: parseInt(cartTotal, 10) || 0,
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[Proxy API Exception]:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.public.appProxy(request);
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }
    return new Response(JSON.stringify({ ok: true, shop: session.shop }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[Proxy API Loader Exception]:", err);
    return new Response("Unauthorized", { status: 401 });
  }
};
