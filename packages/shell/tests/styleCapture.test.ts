import { describe, it, expect, afterEach } from "vitest";
import { startStyleCapture } from "../src/components/styleCapture";

describe("startStyleCapture", () => {
  afterEach(() => {
    document.head.querySelectorAll("style").forEach((s) => s.remove());
    document.head.querySelectorAll("link[rel=stylesheet]").forEach((l) => l.remove());
  });

  it("captures <style> elements appended to document.head during capture window", () => {
    const capture = startStyleCapture();

    const style = document.createElement("style");
    style.textContent = ".mfe-a { color: red; }";
    document.head.appendChild(style);

    const result = capture.stop();
    expect(result.css).toEqual([".mfe-a { color: red; }"]);
    expect(result.links).toEqual([]);
  });

  it("captures <link rel=stylesheet> elements appended to document.head", () => {
    const capture = startStyleCapture();

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.example.com/style.css";
    document.head.appendChild(link);

    const result = capture.stop();
    expect(result.links).toHaveLength(1);
    expect(result.links[0]).toContain("style.css");
    expect(result.css).toEqual([]);
  });

  it("captures <style> elements inserted via insertBefore", () => {
    const anchor = document.createElement("meta");
    document.head.appendChild(anchor);

    const capture = startStyleCapture();

    const style = document.createElement("style");
    style.textContent = ".inserted { margin: 0; }";
    document.head.insertBefore(style, anchor);

    const result = capture.stop();
    expect(result.css).toEqual([".inserted { margin: 0; }"]);
  });

  it("does not capture non-style elements", () => {
    const capture = startStyleCapture();

    const script = document.createElement("script");
    script.textContent = "console.log('hi')";
    document.head.appendChild(script);

    const meta = document.createElement("meta");
    meta.setAttribute("name", "viewport");
    document.head.appendChild(meta);

    const result = capture.stop();
    expect(result.css).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it("prevents captured styles from being added to the real DOM head", () => {
    const before = document.head.querySelectorAll("style").length;

    const capture = startStyleCapture();
    const style = document.createElement("style");
    style.textContent = ".shadow-only { display: none; }";
    document.head.appendChild(style);
    capture.stop();

    const after = document.head.querySelectorAll("style").length;
    expect(after).toBe(before);
  });

  it("restores original appendChild after stop()", () => {
    const capture = startStyleCapture();
    capture.stop();

    const style = document.createElement("style");
    style.textContent = ".post-capture { font-size: 12px; }";
    document.head.appendChild(style);

    const found = document.head.querySelector("style");
    expect(found).not.toBeNull();
    expect(found?.textContent).toBe(".post-capture { font-size: 12px; }");
  });

  it("captures multiple styles in order", () => {
    const capture = startStyleCapture();

    const s1 = document.createElement("style");
    s1.textContent = ".first {}";
    document.head.appendChild(s1);

    const s2 = document.createElement("style");
    s2.textContent = ".second {}";
    document.head.appendChild(s2);

    const s3 = document.createElement("style");
    s3.textContent = ".third {}";
    document.head.appendChild(s3);

    const result = capture.stop();
    expect(result.css).toEqual([".first {}", ".second {}", ".third {}"]);
  });

  it("ignores <style> elements with empty textContent", () => {
    const capture = startStyleCapture();

    const style = document.createElement("style");
    style.textContent = "";
    document.head.appendChild(style);

    const result = capture.stop();
    expect(result.css).toEqual([]);
  });

  it("ignores <link> elements that are not stylesheets", () => {
    const capture = startStyleCapture();

    const link = document.createElement("link");
    link.rel = "icon";
    link.href = "/favicon.ico";
    document.head.appendChild(link);

    const result = capture.stop();
    expect(result.links).toEqual([]);
  });
});
