import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				'background-secondary': 'hsl(var(--background-secondary))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					soft: 'hsl(var(--primary-soft))',
					accent: 'hsl(var(--primary-accent))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
					accent: 'hsl(var(--destructive-accent))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
					icon: 'hsl(var(--muted-icon))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					elevated: 'hsl(var(--accent-elevated))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
					low: 'hsl(var(--card-low))',
					high: 'hsl(var(--card-high))'
				},
				tooltip: {
					DEFAULT: 'hsl(var(--tooltip))',
					foreground: 'hsl(var(--tooltip-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				chart: {
					grid: {
						light: '#eee',
						dark: '#333'
					},
					tooltip: {
						light: '#fff',
						dark: '#333'
					}
				},
				green: {
					DEFAULT: 'hsl(var(--green))',
				},
				purple: {
					DEFAULT: 'hsl(var(--purple))',
				},
				yellow: {
					DEFAULT: 'hsl(var(--yellow))',
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
				}
			},
			borderRadius: {
				none: '0px',
				'sm': '2px',
				DEFAULT: '4px',
				'md': '6px',
				'lg': '8px',
				'xl': '10px',
				'2xl': '12px',
				'3xl': '16px',
				'4xl': '24px',
				'full': '9999px',
			},
			boxShadow: {
				DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
				'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
				'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
				'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
				'none': 'none',
			},
			spacing: {
				'0': '0px',
				'px': '1px',
				'0.5': '2px',
				'1': '4px',
				'1.5': '6px',
				'2': '8px',
				'2.5': '10px',
				'3': '12px',
				'3.5': '14px',
				'4': '16px',
				'5': '20px',
				'6': '24px',
				'7': '28px',
				'8': '32px',
				'9': '36px',
				'10': '40px',
			},
			fontFamily: {
				sans: ['SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
				mono: ['Fira Code', 'monospace'],
			},
			fontSize: {
				'xs': ['12px', { lineHeight: '16px' }],
				'sm': ['13px', { lineHeight: '16px' }],
				'base': ['14px', { lineHeight: '20px' }],
				'lg': ['16px', { lineHeight: '22px' }],
				'xl': ['18px', { lineHeight: '24px' }],
				'2xl': ['24px', { lineHeight: '32px' }],
			},
			fontWeight: {
				normal: '400',
				medium: '500',
				semibold: '600',
				bold: '700',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		require("tailwind-scrollbar"),
	],
} satisfies Config;
