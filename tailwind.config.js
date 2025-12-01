/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slack: {
          bg: '#1a1d21',
          sidebar: '#19171d',
          hover: '#27242c',
          active: '#1164a3',
          text: '#d1d2d3',
          muted: '#ababad',
          border: '#35373b',
          purple: '#4a154b',
        }
      },
    },
  },
  plugins: [],
}
