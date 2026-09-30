/** Same theme as the original HTML's inline tailwind.config, now compiled offline. */
module.exports = {
  darkMode: 'class',
  content: ['./www/index.html'],
  theme: {
    extend: {
      colors: {
        blackpure: '#000000',
        darksurface: '#08080c',
        darkpanel: '#0f0f15',
        darkcard: '#15151e',
        darkborder: '#232330',
        darkhover: '#1e1e2b'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  }
};
