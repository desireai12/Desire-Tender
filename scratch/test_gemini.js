const KEY_B64 = 'QVEuQWI4Uk42S01UdnoxZnQ3al9TRmpFaVB6dnJwQVhreC1PU3hOU2ZyczByd1E1SVZBUFE=';
const apiKey = process.env.GEMINI_API_KEY || Buffer.from(KEY_B64, 'base64').toString('utf-8');

async function testModels() {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest', 'gemini-3.6-flash'];
  for (const m of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respond with json: {\"status\": \"ok\"}" }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      console.log(`Model ${m}: HTTP ${res.status}`);
      if (res.ok) {
        const d = await res.json();
        console.log(`Result ${m}:`, d.candidates?.[0]?.content?.parts?.[0]?.text);
      }
    } catch (e) {
      console.log(`Model ${m} error:`, e.message);
    }
  }
}

testModels();
