// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // shadcn-style tokens so classes like border-border/bg-background work
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary:{ DEFAULT: 'hsl(var(--secondary))',foreground:'hsl(var(--secondary-foreground))' },
        muted:   { DEFAULT: 'hsl(var(--muted))',   foreground:'hsl(var(--muted-foreground))' },
        accent:  { DEFAULT: 'hsl(var(--accent))',  foreground:'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground:'hsl(var(--popover-foreground))' },
        card:    { DEFAULT: 'hsl(var(--card))',    foreground:'hsl(var(--card-foreground))' },

        // your brand palette (kept)
        iamcfo: {
          blue: '#3CA9E0',
          dark: '#2B91C0',
          green: '#10B981',
          red: '#EF4444',
          text: '#111827',
          muted: '#6B7280',
          background: '#F9FAFB',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
