export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
    "./app.vue"
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
  plugins: [],
}