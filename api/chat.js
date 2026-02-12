export default async function handler(req, res) {
  // CORS - allow from anywhere for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle browser preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the request body (messages from frontend)
    const body = req.body;

    // Safety check: make sure we have the key
    if (!process.env.GROQ_API_KEY) {
      console.error('CRITICAL: GROQ_API_KEY is missing in Vercel env vars');
      return res.status(500).json({ error: 'Server error: API key not configured' });
    }

    console.log('Proxy: Sending request to Groq...');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',   // fastest free model - change if you want
        messages: body.messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: false                     // no streaming = full reply
      })
    });

    // Log status for Vercel logs
    console.log('Groq responded with status:', groqResponse.status);

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq failed:', groqResponse.status, errorText);
      return res.status(groqResponse.status).json({ 
        error: `Groq error ${groqResponse.status}: ${errorText}` 
      });
    }

    // Get full JSON response
    const data = await groqResponse.json();

    // Extract assistant reply
    const assistantReply = data.choices?.[0]?.message?.content;

    if (!assistantReply) {
      console.error('No reply content from Groq');
      return res.status(500).json({ error: 'No valid reply from AI' });
    }

    // Send back to frontend
    return res.status(200).json({
      choices: [{
        message: {
          role: 'assistant',
          content: assistantReply
        }
      }]
    });

  } catch (error) {
    console.error('Proxy crashed:', error.message, error.stack);
    return res.status(500).json({ 
      error: 'Proxy failed: ' + (error.message || 'Unknown error') 
    });
  }
}
