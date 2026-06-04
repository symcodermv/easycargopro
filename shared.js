/* ═══════════════════════════════════════════════════
   EasyCargo MV — shared.js
   Shared across: index.html, driver.html, admin.html
   Firebase config + helpers used by all 3 apps
   ═══════════════════════════════════════════════════ */

/* ── Firebase Config (Singapore database) ── */
const fbCfg = {
  apiKey: "AIzaSyAnY8cnBA2lfNmTsUZKh20ZXvZwaXBhw-g",
  authDomain: "easycargo-mv.firebaseapp.com",
  databaseURL: "https://easycargo-mv-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "easycargo-mv",
  storageBucket: "easycargo-mv.firebasestorage.app",
  messagingSenderId: "243526736761",
  appId: "1:243526736761:web:b9bae2df8df118d4cf2da8"
};

/* ── Telegram config ── */
const TG_BOT  = '8417757176:AAEWgzN_MK9ljtV9WN4vtW1ag9ZoYEsY6Ck';
const TG_IDS  = [965429044, 7307324767, 319043357];

/* ── Firebase init (called once) ── */
firebase.initializeApp(fbCfg);
const db = firebase.database();

/* ── Core helpers ── */
function toArr(d) {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  return Object.values(d);
}

function fmtD(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60)   return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function genRef() {
  return 'CARGO-' + Date.now().toString().slice(-6) +
    Math.floor(Math.random() * 900 + 100);
}

function $(id) { return document.getElementById(id); }

/* ── Toast notification ── */
function showToast(msg, type) {
  var el = $('toastEl');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastEl';
    el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;padding:10px 20px;border-radius:22px;font-size:.82rem;font-weight:700;color:white;transition:opacity .3s;pointer-events:none;min-width:200px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.4)';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = type === 'err' ? '#e74c3c' : type === 'ok' ? '#27ae60' : '#3498db';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(function() { el.style.opacity = '0'; }, 3000);
}

function showMsg(id, msg, type) {
  var el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'msg ' + (type || 'info');
  el.style.display = 'block';
}

/* ── Status badges ── */
function sBadge(s) {
  var colors = {
    'Order Placed':'#3498db','Processing':'#f39c12','In Transit':'#9b59b6',
    'Out for Delivery':'#e67e22','Pending Approval':'#e74c3c','Delivered':'#27ae60'
  };
  var c = colors[s] || '#888';
  return '<span style="background:'+c+'22;color:'+c+';border:1px solid '+c+'44;border-radius:10px;padding:2px 9px;font-size:.65rem;font-weight:700">'+s+'</span>';
}

function pBadge(s) {
  var colors = { paid:'#27ae60', pending:'#f39c12', under_review:'#3498db', refunded:'#e74c3c' };
  var c = colors[s] || '#888';
  return '<span style="background:'+c+'22;color:'+c+';border:1px solid '+c+'44;border-radius:10px;padding:2px 9px;font-size:.65rem;font-weight:700">'+s+'</span>';
}

/* ── Telegram notify ── */
async function sendTelegram(msg) {
  await Promise.all(TG_IDS.map(function(cid) {
    return fetch('https://api.telegram.org/bot' + TG_BOT + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cid, text: msg })
    }).catch(function() {});
  }));
}

/* ── Twilio SMS ── */
async function callTwilioSMS(phone, message, cfg) {
  if (!cfg || !cfg.sid || !cfg.token) return false;
  var num = phone.replace(/[^0-9]/g, '');
  if (!num.startsWith('960')) num = '960' + num;
  var body = new URLSearchParams();
  body.append('To', '+' + num);
  body.append('Body', message);
  if (cfg.msgSid && cfg.msgSid.startsWith('MG')) {
    body.append('MessagingServiceSid', cfg.msgSid);
  } else {
    body.append('From', cfg.from || '');
  }
  var creds = btoa(cfg.sid + ':' + cfg.token);
  var resp = await fetch(
    'https://api.twilio.com/2010-04-01/Accounts/' + cfg.sid + '/Messages.json',
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + creds,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    }
  );
  return resp.ok;
}

/* ── Image compression ── */
async function compressAndUpload(file, storagePath) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var MAX = 800;
        var w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ── Local cache (30 min TTL) ── */
var CACHE_KEY = 'ec_config_v3';
var CACHE_TTL = 30 * 60 * 1000;

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
  } catch(e) {}
}

function loadCache() {
  try {
    var raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (Date.now() - obj.ts > CACHE_TTL) return null;
    return obj.data;
  } catch(e) { return null; }
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem('ec_admin_v2');
}

/* ── Fast single-record save (no full array rewrite) ── */
async function saveRecord(path, allArr, recordId, changes) {
  var idx = allArr.findIndex(function(o) {
    return String(o.id) === String(recordId);
  });
  if (idx === -1) {
    await db.ref(path).set(allArr);
    return;
  }
  Object.assign(allArr[idx], changes);
  await db.ref(path + '/' + idx).update(changes);
}
