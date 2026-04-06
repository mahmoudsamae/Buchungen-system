/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        info: "hsl(var(--info))"
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px"
      },
      boxShadow: {
        soft: "0 2px 8px rgba(2, 6, 23, 0.06)",
        card: "0 1px 2px rgba(2, 6, 23, 0.08), 0 8px 20px rgba(2, 6, 23, 0.05)",
        glow: "0 0 0 1px hsl(var(--primary) / 0.12), 0 20px 50px -20px hsl(var(--primary) / 0.35)"
      }
    }
  },
  plugins: []
};
