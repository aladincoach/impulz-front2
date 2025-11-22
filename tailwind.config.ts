import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        'light-salmon': '#FFA07A',
        'orange': {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        'peach': {
          50: '#fff5f0',
          100: '#ffe8dc',
          200: '#ffd4c3',
          300: '#ffb89a',
          400: '#ff9b71',
          500: '#ff7e48',
          600: '#ff6b2c',
          700: '#e85a1f',
          800: '#c04a18',
          900: '#983a13',
        }
      },
      backgroundImage: {
        'gradient-orange-light': 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)',
        'gradient-orange-warm': 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 50%, #fdba74 100%)',
        'gradient-orange-glow': 'linear-gradient(135deg, #fff5f0 0%, #ffe8dc 50%, #ffd4c3 100%)',
        'gradient-orange-radial': 'radial-gradient(circle at top right, #fff7ed, #ffedd5, #fed7aa)',
      }
    }
  }
}

