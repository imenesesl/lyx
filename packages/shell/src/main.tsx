import React from "react";
import { createRoot } from "react-dom/client";
import { ShellApp } from "./ShellApp";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ShellApp />
  </React.StrictMode>
);
