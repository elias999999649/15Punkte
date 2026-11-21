import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://15punkte.pages.dev',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
