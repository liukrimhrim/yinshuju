// 构建后加锁：把入口 JS/CSS 整体 AES-GCM 加密，index.html 换成口令门。
// 没有口令就只有密文——界面都拼不出来，不是「前端比一下字符串」那种假门。
// 用法: SITE_PASSWORD=xxx node scripts/lock-dist.mjs   （无此环境变量则跳过）
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

const PW = process.env.SITE_PASSWORD;
const DIST = path.join(import.meta.dirname, '..', 'dist');
const ITER = 310_000; // OWASP 2023 建议的 PBKDF2-SHA256 迭代数

if (!PW) {
  console.log('lock-dist: 未设 SITE_PASSWORD，跳过加锁（站点保持公开）');
  process.exit(0);
}

const html = await readFile(path.join(DIST, 'index.html'), 'utf8');
// 只锁 index.html 直接引用的入口文件；动态分包（opencc/pdf-lib 等第三方库）留明文，
// 它们本就公开，且原生 import 无法解密
const jsRefs = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]);
const cssRefs = [...html.matchAll(/<link[^>]+href="([^"]*assets\/[^"]+\.css)"/g)].map((m) => m[1]);
if (!jsRefs.length) throw new Error('lock-dist: index.html 里没找到入口脚本');

const local = (url) => path.join(DIST, url.replace(/^.*\/assets\//, 'assets/'));
const payload = {
  js: (await Promise.all(jsRefs.map((u) => readFile(local(u), 'utf8')))).join('\n;\n'),
  css: (await Promise.all(cssRefs.map((u) => readFile(local(u), 'utf8')))).join('\n'),
};

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', enc.encode(PW), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
  base,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt'],
);
const cipher = new Uint8Array(
  await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(payload))),
);
// 文件格式：salt(16) ‖ iv(12) ‖ 密文
const blob = new Uint8Array(16 + 12 + cipher.length);
blob.set(salt, 0);
blob.set(iv, 16);
blob.set(cipher, 28);
await writeFile(path.join(DIST, 'app.enc'), blob);

// 明文入口必须删掉，否则这道门形同虚设
for (const u of [...jsRefs, ...cssRefs]) await unlink(local(u));

const gate = `<!doctype html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>印书局</title>
    <link rel="stylesheet" href="fonts/fonts.css" />
    <style>
      :root { color-scheme: light }
      body { margin:0; min-height:100dvh; display:grid; place-items:center;
             background:#efe8da; color:#2b2620; font-family:system-ui,-apple-system,sans-serif }
      .gate { text-align:center; padding:32px 28px; max-width:320px }
      h1 { font-size:26px; letter-spacing:.35em; margin:0 0 6px; font-weight:600; text-indent:.35em }
      p { margin:0 0 22px; font-size:13px; color:#7d7266 }
      input[type=password] { width:100%; box-sizing:border-box; padding:11px 13px; font-size:16px;
             border:1px solid #c9bda9; border-radius:7px; background:#faf6ee; color:inherit; text-align:center }
      input[type=password]:focus { outline:none; border-color:#9d2f26 }
      button { margin-top:12px; width:100%; padding:11px; font-size:15px; border:0; border-radius:7px;
             background:#9d2f26; color:#fff; cursor:pointer }
      label.remember { display:flex; gap:7px; align-items:center; justify-content:center;
             margin-top:14px; font-size:12.5px; color:#7d7266; cursor:pointer }
      .err { margin-top:12px; font-size:13px; color:#9d2f26; min-height:18px }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <div class="gate" id="gate" hidden>
      <h1>印书局</h1>
      <p>请输入口令</p>
      <form id="f">
        <input type="password" id="pw" autocomplete="current-password" autofocus />
        <button type="submit">进入</button>
        <label class="remember"><input type="checkbox" id="rm" checked />在这台设备上记住</label>
      </form>
      <div class="err" id="err"></div>
    </div>
    <script>
      (function () {
        var KEY = 'ysj.pw', ITER = ${ITER};
        var gate = document.getElementById('gate'), err = document.getElementById('err');
        if (location.hash === '#lock') { localStorage.removeItem(KEY); location.hash = ''; }

        async function unlock(pw) {
          var buf = new Uint8Array(await (await fetch('app.enc', { cache: 'no-store' })).arrayBuffer());
          var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
          var key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: buf.slice(0, 16), iterations: ITER, hash: 'SHA-256' },
            base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
          var plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(16, 28) }, key, buf.slice(28));
          return JSON.parse(new TextDecoder().decode(plain));
        }
        function boot(app) {
          gate.remove();
          var st = document.createElement('style'); st.textContent = app.css; document.head.appendChild(st);
          var sc = document.createElement('script'); sc.type = 'module'; sc.textContent = app.js;
          document.body.appendChild(sc);
        }
        async function tryPw(pw, remember) {
          var app = await unlock(pw); // 口令不对 → AES-GCM 校验失败抛错
          if (remember) try { localStorage.setItem(KEY, pw); } catch (e) {}
          boot(app);
        }
        var saved = null;
        try { saved = localStorage.getItem(KEY); } catch (e) {}
        (saved ? tryPw(saved, false) : Promise.reject()).catch(function () {
          try { localStorage.removeItem(KEY); } catch (e) {}
          gate.hidden = false;
          document.getElementById('pw').focus();
        });
        document.getElementById('f').addEventListener('submit', function (e) {
          e.preventDefault();
          err.textContent = '';
          var btn = e.target.querySelector('button');
          btn.disabled = true; btn.textContent = '解锁中…';
          tryPw(document.getElementById('pw').value, document.getElementById('rm').checked)
            .catch(function () {
              err.textContent = '口令不对';
              btn.disabled = false; btn.textContent = '进入';
              document.getElementById('pw').select();
            });
        });
      })();
    </script>
  </body>
</html>
`;
await writeFile(path.join(DIST, 'index.html'), gate);
console.log(`lock-dist: 已加锁 — 入口 ${(blob.length / 1024).toFixed(0)}KB 密文，明文入口已删除`);
