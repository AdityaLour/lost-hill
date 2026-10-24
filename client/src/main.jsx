import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { AuthProvider } from "./auth.jsx";
import "@fontsource/big-shoulders-display/700";
import "@fontsource/big-shoulders-display/900";
import "@fontsource/ibm-plex-mono/400";
import "@fontsource/ibm-plex-mono/500";
import "@fontsource/ibm-plex-mono/600";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
