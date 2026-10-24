import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the app runs on :5173 and forwards API and sign-in calls to Express on :3000.
// Google's redirect URI in dev is therefore http://localhost:5173/auth/google/callback.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/auth": "http://localhost:3000",
    },
  },
});
