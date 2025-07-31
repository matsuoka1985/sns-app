/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue", 
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue"
  ],
  theme: {
    extend: {
      colors: {
        'custom-dark': 'rgb(21,32,43)',
        'custom-purple': 'rgb(84,25,218)',
      },
      backgroundImage: {
        'purple-gradient': 'linear-gradient(135deg, rgb(84,25,218) 0%, rgb(120,40,230) 100%)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}