import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Honor PORT env var (set by Claude Preview runtime when autoPort is on);
    // fall back to 5173 for plain `npm run dev`.
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
  },
})
