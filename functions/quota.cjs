'use strict';
const {createHash} = require('node:crypto');
const {fail} = require('./chat.cjs');
async function reserveQuota(db, uid, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  const minute = Math.floor(now / 60000);
  const refs = [db.doc(`aiUsage/${createHash('sha256').update(uid).digest('hex')}`), db.doc('aiUsage/global')];
  await db.runTransaction(async tx => {
    const docs = await tx.getAll(...refs);
    const values = docs.map(doc => doc.data() || {});
    const counts = values.map(v => v.day === day ? v.count || 0 : 0);
    const burst = values[0].minute === minute ? values[0].burst || 0 : 0;
    if (counts[0] >= 30 || counts[1] >= 200 || burst >= 5) throw fail(429, 'Limite de uso atingido. Tente novamente mais tarde.');
    tx.set(refs[0], {day, count: counts[0] + 1, minute, burst: burst + 1});
    tx.set(refs[1], {day, count: counts[1] + 1});
  });
}
module.exports = {reserveQuota};
