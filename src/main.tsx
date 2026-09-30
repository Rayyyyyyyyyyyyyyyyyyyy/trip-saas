import React from "react";
import { createRoot } from "react-dom/client";

import { TripRuntimeApp } from "./app/TripRuntimeApp";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Application root element is missing.");

const root = import.meta.hot?.data.root ?? createRoot(rootElement);
if (import.meta.hot) import.meta.hot.data.root = root;

root.render(
  <React.StrictMode>
    <TripRuntimeApp />
  </React.StrictMode>,
);
