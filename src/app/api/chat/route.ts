import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'placeholder-gemini-key');

// Helper for CORS headers
function getCorsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-client-id',
  };
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// POST handler for chat message requests
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    const body = await request.json();
    const { message, clientId } = body;

    // 1. Basic validation
    if (!message || !clientId) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required parameters: message or clientId' }),
        { status: 400, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch client configuration from Supabase
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client lookup error:', clientError);
      return new NextResponse(
        JSON.stringify({ error: 'Client not found or invalid client ID' }),
        { status: 404, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    // 3. Origin check (bill protection / API misuse protection)
    const isAllowed = checkOrigin(origin, client.allowed_domain);
    if (!isAllowed) {
      console.warn(`Origin block: client=${clientId}, origin=${origin}, expected=${client.allowed_domain}`);
      return new NextResponse(
        JSON.stringify({ error: `Origin '${origin}' is not authorized for this chatbot.` }),
        { status: 403, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    // 4. Monthly limit check
    if (client.messages_used >= client.monthly_limit) {
      // Return a polite message streamed or as text
      const encoder = new TextEncoder();
      const limitReachedMessage = "Sorry, this chatbot has reached its monthly conversation limit. Please try again later or contact the site administrator.";
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(limitReachedMessage));
          controller.close();
        }
      });
      return new Response(stream, {
        headers: {
          ...getCorsHeaders(origin),
          'Content-Type': 'text/plain; charset=utf-8',
        }
      });
    }

    // 5. Check if Gemini Key is configured
    if (!process.env.GEMINI_API_KEY) {
      return new NextResponse(
        JSON.stringify({ error: 'Gemini API key is not configured on the server.' }),
        { status: 500, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
      );
    }

    // 6. Call Gemini and stream the completion
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.5-flash',
      systemInstruction: client.system_prompt
    });

    const result = await model.generateContentStream({
      contents: [
        { role: 'user', parts: [{ text: message }] }
      ]
    });

    const encoder = new TextEncoder();
    let responseText = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              responseText += chunkText;
              controller.enqueue(encoder.encode(chunkText));
            }
          }
          controller.close();

          // Stream completed successfully. Now log and update the count in database.
          try {
            // Call the database function to increment messages_used atomically
            const { error: incError } = await supabase.rpc('increment_messages_used', {
              client_id_param: clientId,
            });
            if (incError) {
              console.error('Error incrementing usage:', incError);
            }

            // Insert a log of this chat session
            const { error: logError } = await supabase.from('logs').insert({
              client_id: clientId,
              message: message,
              response: responseText,
              origin: origin || 'unknown',
            });
            if (logError) {
              console.error('Error writing log entry:', logError);
            }
          } catch (dbErr) {
            console.error('Database logging operation failed:', dbErr);
          }
        } catch (err) {
          console.error('Error inside streaming data reader:', err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...getCorsHeaders(origin),
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (err: any) {
    console.error('API Error:', err);
    return new NextResponse(
      JSON.stringify({ error: `Internal server error: ${err.message}` }),
      { status: 500, headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' } }
    );
  }
}

// Origin validation logic
function checkOrigin(originHeader: string | null, allowedDomain: string): boolean {
  if (!originHeader || originHeader === 'null') {
    // During local development, curl or server-to-server calls may not pass Origin.
    // Also, browsers send 'null' origin when loading HTML files via the file:// protocol.
    if (process.env.NODE_ENV === 'development') return true;
    
    const normalizedAllowed = allowedDomain.toLowerCase().trim();
    if (
      normalizedAllowed === '*' ||
      normalizedAllowed === 'localhost' ||
      normalizedAllowed === '127.0.0.1' ||
      normalizedAllowed === 'null'
    ) {
      return true;
    }
    return false;
  }

  try {
    const originUrl = new URL(originHeader);
    const originHost = originUrl.hostname.toLowerCase().replace(/^www\./, '');
    
    let normalizedAllowed = allowedDomain.toLowerCase().trim();
    if (normalizedAllowed.includes('://')) {
      try {
        const allowedUrl = new URL(normalizedAllowed);
        normalizedAllowed = allowedUrl.hostname;
      } catch {
        // ignore
      }
    }
    normalizedAllowed = normalizedAllowed.replace(/^www\./, '');

    // 1. Exact match
    if (originHost === normalizedAllowed) {
      return true;
    }

    // 2. Local development matching
    if (normalizedAllowed === 'localhost' && (originHost === 'localhost' || originHost === '127.0.0.1')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
