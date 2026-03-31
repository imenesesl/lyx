import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ShadowContainerProps {
  children: React.ReactNode;
  styles?: string[];
  styleLinks?: string[];
}

/**
 * Renders children inside a Shadow DOM boundary, providing automatic CSS
 * isolation per MFE slot. Captured CSS text and stylesheet links are injected
 * into the shadow root so they scope exclusively to this MFE.
 *
 * CSS custom properties (--*) still inherit from the light DOM, so
 * design tokens defined on :root or the shell continue to work.
 */
export function ShadowContainer({
  children,
  styles = [],
  styleLinks = [],
}: ShadowContainerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mountPoint, setMountPoint] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let shadow = host.shadowRoot;
    if (!shadow) {
      shadow = host.attachShadow({ mode: "open" });
    }

    let mount = shadow.querySelector<HTMLElement>("[data-lyx-shadow-mount]");
    if (!mount) {
      mount = document.createElement("div");
      mount.setAttribute("data-lyx-shadow-mount", "");
      shadow.appendChild(mount);
    }

    setMountPoint(mount);
  }, []);

  return (
    <div ref={hostRef} data-lyx-shadow-host="">
      {mountPoint &&
        createPortal(
          <>
            {styleLinks.map((href) => (
              <link key={href} rel="stylesheet" href={href} />
            ))}
            {styles.map((css, i) => (
              <style key={`${i}-${css.length}`}>{css}</style>
            ))}
            {children}
          </>,
          mountPoint,
        )}
    </div>
  );
}
