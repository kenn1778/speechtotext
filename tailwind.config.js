export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        accent: {
          glow: 'var(--accent-glow)',
        },
      },
      boxShadow: {
        glow: '0 0 24px rgba(255,255,255,0.12)',
        'glow-sm': '0 0 12px rgba(255,255,255,0.06)',
      },
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    }
  },
  plugins: []
}
