type AppendChild = <T extends Node>(node: T) => T;
type InsertBefore = <T extends Node>(node: T, ref: Node | null) => T;

interface CapturedStyles {
  css: string[];
  links: string[];
}

interface StyleCaptureHandle {
  stop(): CapturedStyles;
}

/**
 * Patches document.head.appendChild / insertBefore to intercept <style> and
 * <link rel="stylesheet"> elements injected by Module Federation remotes
 * during loadRemote(). Returns a handle whose stop() method restores the
 * original methods and returns the captured style data.
 */
export function startStyleCapture(): StyleCaptureHandle {
  const css: string[] = [];
  const links: string[] = [];

  const origAppend = document.head.appendChild.bind(
    document.head,
  ) as AppendChild;
  const origInsert = document.head.insertBefore.bind(
    document.head,
  ) as InsertBefore;

  document.head.appendChild = function <T extends Node>(node: T): T {
    if (node instanceof HTMLStyleElement && node.textContent) {
      css.push(node.textContent);
      return node;
    }
    if (
      node instanceof HTMLLinkElement &&
      node.rel === "stylesheet" &&
      node.href
    ) {
      links.push(node.href);
      return node;
    }
    return origAppend(node);
  };

  document.head.insertBefore = function <T extends Node>(
    node: T,
    ref: Node | null,
  ): T {
    if (node instanceof HTMLStyleElement && node.textContent) {
      css.push(node.textContent);
      return node;
    }
    if (
      node instanceof HTMLLinkElement &&
      node.rel === "stylesheet" &&
      node.href
    ) {
      links.push(node.href);
      return node;
    }
    return origInsert(node, ref);
  };

  return {
    stop() {
      document.head.appendChild = origAppend as typeof document.head.appendChild;
      document.head.insertBefore = origInsert as typeof document.head.insertBefore;
      return { css, links };
    },
  };
}

export type { CapturedStyles, StyleCaptureHandle };
