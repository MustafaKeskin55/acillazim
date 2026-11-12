/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx,css}",
    "./Page/**/*.{js,ts,jsx,tsx,mdx,css}",
    "./components/**/*.{js,ts,jsx,tsx,mdx,css}",
    "./Sidebar/**/*.{js,ts,jsx,tsx,mdx,css}",
    "./styles/**/*.{js,ts,jsx,tsx,mdx,css}",
  ],
  theme: {
    screens: {
      'xs': '360px',
      'sm': '480px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1270px',
      '2xl': '1440px',
    },
    extend: {
      colors: {
        brand: {
          deep: '#003466',
          accent: '#FF6B00',
          'accent-soft': '#FFB07A',
          ink: '#0A0E27',
          'ink-2': '#050816',
          cream: '#FAF8F3',
          paper: '#FFFFFF',
          bg: '#F5F6F8',
          mist: '#F4F2EC',
          line: '#ECE7DC',
          muted: '#6B7280',
          success: '#10B981',
          gold: '#efb036',
          danger: '#ff3b30',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', "'Bricolage Grotesque'", "'Inter'", 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', "'Manrope'", "'Inter'", 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', "'Fraunces'", 'Georgia', 'serif'],
      },
      maxWidth: {
        'site': '1270px',
      },
    },
  },
  corePlugins: {
    preflight: false, // Mevcut etiket ve buton stillerinin 1 piksel dahi bozulmaması için sıfırlama kapalı
  },
  plugins: [],
};

