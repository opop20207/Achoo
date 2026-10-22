// Optional story generator for Achoo. Deploy with `wrangler deploy`, then put the
// worker URL in story.json -> "endpoint". Without it the game uses story.json as is.
const ORIGIN = 'https://opop20207.github.io';
const SYSTEM = `너는 짧은 한국어 미스터리 문장을 쓰는 작가다.
설정: 플레이어는 거대한 존재의 코 속에 사는 먼지다. 플레이어는 그 사실을 아직 모른다.
방을 하나 깰 때마다 한 문장을 쓴다. 규칙:
- 한 문장, 공백 포함 24자 이내, 마침표로 끝낸다.
- 설명하지 말고 이상한 느낌만 남긴다. 반전("먼지")은 절대 직접 말하지 않는다.
- 예시 문장들과 같은 톤을 유지하되 예시를 그대로 베끼지 않는다.
문장만 출력한다.`;

const cors = (o) => ({
  'access-control-allow-origin': o === ORIGIN ? o : ORIGIN,
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
});

export default {
  async fetch(req, env) {
    const h = cors(req.headers.get('origin'));
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    if (req.method !== 'POST') return new Response('no', { status: 405, headers: h });
    let c;
    try { c = await req.json(); } catch { return Response.json({ line: null }, { headers: h }); }
    const ex = Array.isArray(c.style) ? c.style.slice(0, 5).join(' / ') : '';
    const user = `방 ${Number(c.room) + 1}/5을 방금 깼다. ${Number(c.round) + 1}회차. 찾은 눈: ${(c.secrets || []).filter(Boolean).length}개.\n예시: ${ex}`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 60, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
    });
    if (!r.ok) return Response.json({ line: null }, { headers: h });
    const j = await r.json();
    const line = (j.content?.[0]?.text || '').trim().split('\n')[0];
    // never trust the model's length; the client falls back to story.json on null
    return Response.json({ line: line && line.length <= 30 ? line : null }, { headers: h });
  },
};
