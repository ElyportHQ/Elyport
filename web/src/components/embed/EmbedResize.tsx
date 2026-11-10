"use client";

import { useEffect } from "react";

/** Tells the host page how tall the widget is, so embed.js can size the iframe. */
export function EmbedResize() {
  useEffect(() => {
    if (window.parent === window) return;
    let min = 0;
    const post = () => {
      const page = document.querySelector<HTMLElement>(".ew-page");
      const h = Math.max(Math.ceil(page ? page.getBoundingClientRect().height : document.body.offsetHeight), min);
      window.parent.postMessage({ type: "elyport:resize", height: h, path: location.pathname }, "*");
    };
    const onMin = (e: Event) => {
      min = (e as CustomEvent<number>).detail || 0;
      post();
    };
    const ro = new ResizeObserver(post);
    const page = document.querySelector(".ew-page");
    ro.observe(page ?? document.body);
    window.addEventListener("elyport:minheight", onMin);
    post();
    return () => {
      ro.disconnect();
      window.removeEventListener("elyport:minheight", onMin);
    };
  }, []);
  return null;
}
