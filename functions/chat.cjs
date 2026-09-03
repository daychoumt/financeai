'use strict';
const fail = (status, message) => Object.assign(new Error(message), {status});
function validate(body) {
  if (!body || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 2000 ||
      (body.context !== undefined && (typeof body.context !== 'string' || body.context.length > 12000))) {
    throw fail(400, 'Envie uma pergunta de até 2.000 caracteres.');
  }
  return {message: body.message.trim(), context: body.context || ''};
}
function createHandler({verifyToken, reserveQuota, generate}) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      if (req.method !== 'POST') throw fail(405, 'Use POST.');
      const match = /^Bearer (\S+)$/.exec(req.get('authorization') || '');
      if (!match) throw fail(401, 'Entre na sua conta para conversar.');
      let user;
      try { user = await verifyToken(match[1]); } catch { throw fail(401, 'Sua sessão expirou. Entre novamente.'); }
      const input = validate(req.body);
      await reserveQuota(user.uid);
      const reply = await generate(input);
      if (typeof reply !== 'string' || !reply.trim()) throw fail(502, 'A IA não retornou uma resposta. Tente outra pergunta.');
      res.status(200).json({reply: reply.slice(0, 8000)});
    } catch (error) {
      const status = [400,401,405,429,502,503,504].includes(error.status) ? error.status : 503;
      res.status(status).json({error: error.status === status ? error.message : 'Não foi possível consultar a IA agora. Tente mais tarde.'});
    }
  };
}
module.exports = {createHandler, validate, fail};
