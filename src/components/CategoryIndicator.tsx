import type { CategoryShape } from '../types';

interface CategoryIndicatorProps {
  shape: CategoryShape;
  color: string;
  size?: number;
}

/**
 * Renders the accessibility-friendly category shape indicator.
 * Classes = square, Exams = diamond, Deadlines = outline square, Personal = circle.
 */
export function CategoryIndicator({ shape, color, size = 10 }: CategoryIndicatorProps) {
  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    display: 'inline-block',
  };

  switch (shape) {
    case 'square':
      return (
        <span
          className="shape-indicator shape-square"
          style={{ ...baseStyle, backgroundColor: color }}
        />
      );
    case 'diamond':
      return (
        <span
          className="shape-indicator shape-diamond"
          style={{ ...baseStyle, backgroundColor: color }}
        />
      );
    case 'outline-square':
      return (
        <span
          className="shape-indicator shape-outline-square"
          style={{ ...baseStyle, borderColor: color, color }}
        />
      );
    case 'circle':
      return (
        <span
          className="shape-indicator shape-circle"
          style={{ ...baseStyle, backgroundColor: color }}
        />
      );
    default:
      return (
        <span
          className="shape-indicator shape-square"
          style={{ ...baseStyle, backgroundColor: color }}
        />
      );
  }
}
