/* Elyport widgets: https://elyport.com/docs/widgets
 * <div data-elyport="claim" data-token="0x…" data-theme="light"></div>
 * <div data-elyport="refuel" data-to="0x…"></div>            (full refuel form)
 * <div data-elyport="refuel-button" data-to="0x…"></div>     ("Need gas?" button that opens it)
 * <script src="https://elyport.com/embed.js" async></script>
 */
(function () {
  if (window.__elyportEmbed) return;
  window.__elyportEmbed = true;
  var origin = "https://elyport.com";
  try {
    var s = document.currentScript;
    if (s && s.src) origin = new URL(s.src).origin;
  } catch (e) {}

  function refuelSrc(el) {
    var to = el.getAttribute("data-to") || "";
    return origin + "/embed/refuel" + (/^0x[0-9a-fA-F]{40}$/.test(to) ? "?to=" + to : "");
  }

  function refuelFrame(src) {
    var f = document.createElement("iframe");
    f.src = src;
    f.title = "Refuel on Elyport";
    f.setAttribute("allow", "clipboard-write");
    f.style.cssText = "display:block;width:100%;max-width:480px;border:0;background:transparent;color-scheme:normal;height:760px";
    return f;
  }

  function openModal(src) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:rgba(17,20,29,.45);display:flex;align-items:center;justify-content:center;padding:16px";
    var box = document.createElement("div");
    box.style.cssText = "position:relative;width:100%;max-width:480px;max-height:92vh;overflow:auto;border-radius:24px;background:#F5F6F8;box-shadow:0 30px 80px rgba(0,0,0,.3)";
    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    close.style.cssText = "position:absolute;top:10px;right:12px;z-index:1;width:36px;height:36px;border:0;border-radius:50%;background:#fff;font:22px/1 system-ui;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)";
    function shut() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    close.onclick = shut;
    wrap.onclick = function (e) { if (e.target === wrap) shut(); };
    box.appendChild(close);
    box.appendChild(refuelFrame(src));
    wrap.appendChild(box);
    document.body.appendChild(wrap);
  }

  function mount(el) {
    if (el.getAttribute("data-elyport-ready")) return;
    var kind = el.getAttribute("data-elyport");
    if (kind === "refuel") {
      el.setAttribute("data-elyport-ready", "1");
      el.appendChild(refuelFrame(refuelSrc(el)));
      return;
    }
    if (kind === "refuel-button") {
      el.setAttribute("data-elyport-ready", "1");
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = el.getAttribute("data-label") || "Need gas? Refuel HYPE";
      b.style.cssText = "display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;border:1px solid #d9dce6;background:#fff;color:#11141d;font:600 14px/1.2 system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 16px -8px rgba(40,46,90,.35)";
      b.onclick = function () { openModal(refuelSrc(el)); };
      el.appendChild(b);
      return;
    }
    var token = el.getAttribute("data-token") || "";
    if (!/^(claim|lock)$/.test(kind) || !/^0x[0-9a-fA-F]{40}$/.test(token)) return;
    el.setAttribute("data-elyport-ready", "1");
    var q = [];
    var theme = el.getAttribute("data-theme");
    var accent = (el.getAttribute("data-accent") || "").replace("#", "");
    if (theme === "dark" || theme === "light") q.push("theme=" + theme);
    if (/^[0-9a-fA-F]{6}$/.test(accent)) q.push("accent=" + accent);
    var f = document.createElement("iframe");
    f.src = origin + "/embed/" + kind + "/" + token + (q.length ? "?" + q.join("&") : "");
    f.title = kind === "claim" ? "Claim on Elyport" : "Token locks on Elyport";
    f.loading = "lazy";
    f.setAttribute("allow", "clipboard-write");
    f.style.cssText = "display:block;width:100%;max-width:460px;border:0;background:transparent;color-scheme:normal;height:" + (kind === "claim" ? 420 : 400) + "px";
    el.appendChild(f);
  }

  function scan() {
    var els = document.querySelectorAll("[data-elyport]");
    for (var i = 0; i < els.length; i++) mount(els[i]);
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== origin || !e.data || e.data.type !== "elyport:resize") return;
    var frames = document.getElementsByTagName("iframe");
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === e.source) frames[i].style.height = Math.ceil(e.data.height) + "px";
    }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
  if (window.MutationObserver) new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
