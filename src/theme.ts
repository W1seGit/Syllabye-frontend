export const palette = {
  cream: '#FFF8F1',
  blush: '#FADDE1',
  lavender: '#E4D7FF',
  mint: '#DAF5DC',
  sky: '#D6EEFB',
  plum: '#6B3FA0',
  coral: '#FF9AA2',
  gold: '#F7D08A',
  text: '#3F2E4F',
  muted: '#776185',
  border: '#E8DAEF',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 10,
  md: 18,
  lg: 26,
  pill: 999,
};

export const shadows = {
  soft: {
    shadowColor: '#B59BCB',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
};

export const gradients = {
  background: ['#FFF8F1', '#FDE1F3'],
  secondary: ['#E3FDF5', '#FFE6FA'],
};

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: palette.text,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500' as const,
    color: palette.muted,
  },
  body: {
    fontSize: 16,
    color: palette.text,
  },
};

export const pastelCard = {
  backgroundColor: palette.white,
  borderRadius: radius.lg,
  padding: spacing.lg,
  borderWidth: 1,
  borderColor: palette.border,
};
