import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received GDPR webhook: ${topic} for shop: ${shop}`);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      // Handle request for customer data
      // Since we don't store customer personal data, return success
      return new Response(JSON.stringify({ message: "No customer data stored." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      
    case "CUSTOMERS_REDACT":
      // Handle request to redact customer data
      // Since we don't store customer personal data, return success
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      
    case "SHOP_REDACT":
      // Handle request to redact shop data (delete session and analytics data)
      try {
        await db.session.deleteMany({ where: { shop } });
        await db.analyticsEvent.deleteMany({ where: { shop } });
        console.log(`Successfully redacted shop data for ${shop}`);
      } catch (err) {
        console.error(`Failed to redact shop data for ${shop}:`, err);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      
    default:
      return new Response("Unhandled webhook topic", { status: 400 });
  }
};
