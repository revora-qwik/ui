import { serve } from "bun";
import { joinWaitlist } from "./actions/joinWaitlist";
import { getLeaderboard } from "./queries/leaderboard";
import { sendWaitlistOtp, verifyWaitlistOtp } from "./actions/SendOtp";


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

    
    if (req.method === "POST" && url.pathname === "/waitlist/email/send-otp") {
      const { email } = await req.json();
      const result = await sendWaitlistOtp(email);
    
      
      if (result?.alreadyJoined) {
        return Response.json(
          {
            alreadyJoined: true,
            referralCode: result.referralCode,
            points: result.points,
          },
          { headers: corsHeaders }
        );
      }
    
      if (result?.error) {
        return Response.json(
          { error: result.error },
          { status: 429, headers: corsHeaders }
        );
      }
    
      
      return Response.json(
        { message: "OTP sent" },
        { headers: corsHeaders }
      );
    }
    
    
   
    if (req.method === "POST" && url.pathname === "/waitlist/email/verify-otp") {
      const { email, otp } = await req.json();
      const result = await verifyWaitlistOtp(email, otp);
      return Response.json(result, { headers: corsHeaders });
    }


    return new Response("Not found", {
      status: 404,
      headers: corsHeaders,
    });
  },
});

console.log("✅ Server running on port 5000");
console.log("🌍 CORS allowed origin:", ALLOWED_ORIGIN);
