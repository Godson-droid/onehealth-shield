import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig({
  plugins: [react()],
  server: {
    // Corrected to use an array []
    allowedHosts: [
      'onehealth-shield.onrender.com'
    ]
  }
})
