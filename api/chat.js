export default async function handler(req, res) {
  // CORS headers - allow frontend to call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // Use your OpenRouter key from env var (add it in Vercel settings if not there yet)
    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
      console.error('OPENROUTER_API_KEY missing in env vars');
      return res.status(500).json({ error: 'Server error: API key not set' });
    }

    console.log('Sending request to OpenRouter');

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://elxora.frii.site',
        'X-Title': 'ElXora Chat'
      },
      body: JSON.stringify({
        model: 'google/gemma-2-27b-it:free',  // Fast free model on OpenRouter
        messages: body.messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true  // No streaming = full reply at once, no stuck "Thinking..."
      })
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter error:', openRouterResponse.status, errorText);
      return res.status(openRouterResponse.status).json({ 
        error: `OpenRouter error ${openRouterResponse.status}: ${errorText}` 
      });
    }

    const data = await openRouterResponse.json();

    const assistantReply = data.choices?.[0]?.message?.content || '';

    if (!assistantReply) {
      return res.status(500).json({ error: 'No reply from OpenRouter' });
    }

    return res.status(200).json({
      choices: [{
        message: {
          role: 'assistant',
          content: assistantReply
        }
      }]
    });

  } catch (error) {
    console.error('Proxy error:', error.message, error.stack);
    return res.status(500).json({ error: 'Proxy failed: ' + (error.message || 'Unknown') });
  }
          }
