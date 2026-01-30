import { serve } from "bun";
import { joinWaitlist } from "./actions/joinWaitlist";
import { getLeaderboard } from "./queries/leaderboard";


const ALLOWED_ORIGIN = process.env.CLIENT_URL ?? "";

serve({
  port: 5000,
  async fetch(req) {
    const url = new URL(req.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

   
    if (req.method === "POST" && url.pathname === "/waitlist") {
      const body = await req.json();
      const result = await joinWaitlist(body);
      return Response.json(result, {
        headers: corsHeaders,
      });
    }

   
    if (req.method === "GET" && url.pathname === "/leaderboard") {
      const data = await getLeaderboard();
      return Response.json(data, {
        headers: corsHeaders,
      });
    }

    return new Response("Not found", {
      status: 404,
      headers: corsHeaders,
    });
  },
});

console.log("✅ Server running on port 5000");
console.log("🌍 CORS allowed origin:", ALLOWED_ORIGIN);
