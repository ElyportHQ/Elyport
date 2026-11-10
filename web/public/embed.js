/* Elyport widgets: https://elyport.com/docs/widgets
 * <div data-elyport="claim" data-token="0x…" data-theme="light"></div>
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

  function mount(el) {
    if (el.getAttribute("data-elyport-ready")) return;
    var kind = el.getAttribute("data-elyport");
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
