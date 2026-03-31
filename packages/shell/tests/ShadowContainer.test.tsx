import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ShadowContainer } from "../src/components/ShadowContainer";

function mockAttachShadow() {
  const originalAttachShadow = HTMLElement.prototype.attachShadow;

  HTMLElement.prototype.attachShadow = function (init: ShadowRootInit) {
    const div = document.createElement("div");
    div.setAttribute("data-shadow-root", "");
    this.appendChild(div);

    const shadow = {
      mode: init.mode,
      host: this,
      appendChild: (node: Node) => div.appendChild(node),
      querySelector: (sel: string) => div.querySelector(sel),
      querySelectorAll: (sel: string) => div.querySelectorAll(sel),
      innerHTML: "",
    } as unknown as ShadowRoot;

    Object.defineProperty(this, "shadowRoot", {
      get: () => shadow,
      configurable: true,
    });

    return shadow;
  };

  return {
    restore() {
      HTMLElement.prototype.attachShadow = originalAttachShadow;
    },
  };
}

describe("ShadowContainer", () => {
  let mock: { restore(): void };

  beforeEach(() => {
    mock = mockAttachShadow();
  });

  afterEach(() => {
    mock.restore();
  });

  it("renders children inside a shadow host element", async () => {
    render(
      <ShadowContainer>
        <p>MFE content</p>
      </ShadowContainer>,
    );

    await waitFor(() => {
      const host = document.querySelector("[data-lyx-shadow-host]");
      expect(host).not.toBeNull();
      const mount = host?.querySelector("[data-shadow-root] [data-lyx-shadow-mount]");
      expect(mount).not.toBeNull();
      expect(mount?.textContent).toContain("MFE content");
    });
  });

  it("injects captured CSS text as <style> elements inside the shadow", async () => {
    render(
      <ShadowContainer styles={[".mfe { color: red; }", ".other { margin: 0; }"]}>
        <div>content</div>
      </ShadowContainer>,
    );

    await waitFor(() => {
      const host = document.querySelector("[data-lyx-shadow-host]");
      const styles = host?.querySelectorAll("style");
      expect(styles?.length).toBe(2);
      expect(styles?.[0].textContent).toBe(".mfe { color: red; }");
      expect(styles?.[1].textContent).toBe(".other { margin: 0; }");
    });
  });

  it("injects captured stylesheet links inside the shadow", async () => {
    render(
      <ShadowContainer styleLinks={["https://cdn.example.com/a.css"]}>
        <div>linked</div>
      </ShadowContainer>,
    );

    await waitFor(() => {
      const host = document.querySelector("[data-lyx-shadow-host]");
      const links = host?.querySelectorAll("link[rel=stylesheet]");
      expect(links?.length).toBe(1);
      expect(links?.[0].getAttribute("href")).toBe("https://cdn.example.com/a.css");
    });
  });

  it("renders without styles when none are provided", async () => {
    render(
      <ShadowContainer>
        <span>no styles</span>
      </ShadowContainer>,
    );

    await waitFor(() => {
      const host = document.querySelector("[data-lyx-shadow-host]");
      expect(host?.querySelectorAll("style").length).toBe(0);
      expect(host?.querySelectorAll("link").length).toBe(0);
    });
  });

  it("creates only one shadow root on re-render", async () => {
    const attachSpy = vi.spyOn(HTMLElement.prototype, "attachShadow");

    const { rerender } = render(
      <ShadowContainer>
        <div>v1</div>
      </ShadowContainer>,
    );

    await waitFor(() => {
      expect(document.querySelector("[data-lyx-shadow-host]")).not.toBeNull();
    });

    rerender(
      <ShadowContainer>
        <div>v2</div>
      </ShadowContainer>,
    );

    expect(attachSpy).toHaveBeenCalledTimes(1);
    attachSpy.mockRestore();
  });
});
