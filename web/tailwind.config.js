/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  corePlugins: {
    // Material komponentlar bilan to'qnashmasligi uchun Tailwind'ning global reset'i o'chirilgan.
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4F8EF7', dark: '#2E6BD6' },
        accent: '#FFB020',
        success: '#2FB574',
        warning: '#F5A524',
        danger: '#E5484D',
        surface: 'var(--color-surface)',
        bg: 'var(--color-bg)',
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '20px',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
