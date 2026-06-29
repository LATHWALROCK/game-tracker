const GIST_ID   = process.env.GIST_ID;
const GH_TOKEN  = process.env.GH_TOKEN;
const GIST_FILE = process.env.GIST_FILE || 'games.json';

export default async function handler(req, res) {
  if (!GIST_ID || !GH_TOKEN) {
    return res.status(500).json({ error: 'Server misconfigured: missing GIST_ID or GH_TOKEN env vars' });
  }

  const headers = {
    'Authorization': `Bearer ${GH_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // GET — load games
  if (req.method === 'GET') {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers });
    if (!response.ok) {
      return res.status(response.status).json({ error: `GitHub API error: ${response.status}` });
    }
    const json = await response.json();
    const raw  = json.files?.[GIST_FILE]?.content;
    if (!raw) {
      return res.status(404).json({ error: `File "${GIST_FILE}" not found in Gist` });
    }
    return res.status(200).json(JSON.parse(raw));
  }

  // POST — save games
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        files: { [GIST_FILE]: { content: JSON.stringify(body, null, 2) } }
      }),
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: `GitHub API error: ${response.status}` });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
