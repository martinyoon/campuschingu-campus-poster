// check-results v1
import { readFileSync } from 'node:fs';
const errs = [];
const e = (m) => errs.push(m);
const f = process.argv[2] || 'results/latest.json';
const raw = readFileSync(f, 'utf8');
if (raw.includes('blob.vercel-storage.com')) e('금지 글자: blob.vercel-storage.com');
if (raw.includes('Bearer')) e('금지 글자: Bearer');
let d; try { d = JSON.parse(raw); } catch (x) { console.log('JSON 오류'); process.exit(1); }
const only = (o, keys, p) => { for (const k of Object.keys(o)) if (!keys.includes(k)) e(`${p}: 모르는 칸 ${k}`); };
const isStr = (s, min, max) => typeof s === 'string' && s.length >= min && s.length <= max;
const date = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
only(d, ['runAt', 'results'], 'root');
if (!isStr(d.runAt, 1, 40)) e('runAt 1~40자');
if (!Array.isArray(d.results) || d.results.length > 200) e('results 200줄 이하 배열');
const KIND = ['scholarship','job','contest','event','recruit','dept','etc'];
const HT = ['school','council','club','dept','outside'];
const AU = ['undergrad','grad','anyone','intl'];
const UN = ['audience','apply','eventDate','place','benefit','howToApply','link'];
const seen = new Set();
(d.results || []).forEach((r, i) => {
  const p = `results[${i}]`;
  if (!isStr(r.photoId, 1, 40)) e(`${p}: photoId`);
  if (seen.has(r.photoId)) e(`${p}: photoId 중복`);
  const before = new Set(seen); seen.add(r.photoId);
  if (!['new','same','hold','skip'].includes(r.action)) { e(`${p}: action`); return; }
  if (r.action === 'hold' || r.action === 'skip') {
    only(r, ['photoId','action','reason'], p);
    if (!isStr(r.reason, 1, 200)) e(`${p}: reason 1~200자`);
    return;
  }
  only(r, ['photoId','action','poster','blur','posterId','samePhotoId'], p);
  if (r.action === 'new') { if (!r.poster) e(`${p}: poster 필요`); if (r.posterId || r.samePhotoId) e(`${p}: new 에 posterId/samePhotoId 금지`); }
  else {
    const a = r.posterId !== undefined, b = r.samePhotoId !== undefined;
    if (a === b) e(`${p}: posterId 와 samePhotoId 중 정확히 하나`);
    if (b && !before.has(r.samePhotoId)) e(`${p}: samePhotoId 는 앞줄의 photoId`);
  }
  if (r.blur !== undefined) {
    if (!Array.isArray(r.blur) || r.blur.length > 20) e(`${p}: blur 20개 이하`);
    else r.blur.forEach((b, j) => {
      only(b, ['x','y','w','h'], `${p}.blur[${j}]`);
      for (const k of ['x','y']) if (!(b[k] >= 0 && b[k] <= 1)) e(`${p}.blur[${j}].${k} 0~1`);
      for (const k of ['w','h']) if (!(b[k] > 0 && b[k] <= 1)) e(`${p}.blur[${j}].${k} 0초과 1이하`);
    });
  }
  const q = r.poster;
  if (q) {
    const pp = p + '.poster';
    only(q, ['kind','title','summary','hostName','hostType','audience','applyStart','applyEnd','eventDate','place','benefit','howToApply','link','fullText','uncertain'], pp);
    if (!KIND.includes(q.kind)) e(`${pp}: kind`);
    if (q.hostType !== undefined && !HT.includes(q.hostType)) e(`${pp}: hostType`);
    if (q.audience !== undefined && (!Array.isArray(q.audience) || q.audience.some((x) => !AU.includes(x)))) e(`${pp}: audience`);
    if (q.uncertain !== undefined && (!Array.isArray(q.uncertain) || q.uncertain.some((x) => !UN.includes(x)))) e(`${pp}: uncertain`);
    for (const [k, m] of [['title',120],['summary',200],['hostName',80],['fullText',3000]]) if (!isStr(q[k], 1, m)) e(`${pp}: ${k} 1~${m}자`);
    for (const [k, m] of [['place',120],['benefit',200],['howToApply',300]]) if (q[k] !== undefined && !isStr(q[k], 0, m)) e(`${pp}: ${k} ${m}자 이하`);
    for (const k of ['applyStart','applyEnd','eventDate']) if (q[k] !== undefined && !date(q[k])) e(`${pp}: ${k} 날짜꼴`);
    if (q.applyStart && q.applyEnd && q.applyStart > q.applyEnd) e(`${pp}: applyStart > applyEnd`);
    if (q.link !== undefined && !/^https:\/\//.test(q.link)) e(`${pp}: link https만`);
  }
});
if (errs.length) { console.log(errs.join('\n')); process.exit(1); }
console.log('OK');
