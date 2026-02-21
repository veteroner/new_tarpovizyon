/**
 * Shared TreemapContent renderer for Recharts Treemap components.
 * Used across TradeOverview, PlantTrade, and other pages.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TreemapContent = (props: any) => {
  const { x, y, width, height, name, value } = props;
  if (width < 40 || height < 30) return null;

  const displayName = name?.length > 14 ? name.substring(0, 14) + '..' : name;
  const displayValue = value >= 1e9
    ? `$${(value / 1e9).toFixed(1)}B`
    : value >= 1e6
    ? `$${(value / 1e6).toFixed(0)}M`
    : `$${(value / 1e3).toFixed(0)}K`;

  return (
    <g>
      <rect
        x={x} y={y} width={width} height={height} rx={4}
        style={{ fill: props.fill, stroke: '#fff', strokeWidth: 2 }}
      />
      <text
        x={x + width / 2} y={y + height / 2 - 8}
        textAnchor="middle" fill="#fff"
        fontSize={width < 80 ? 10 : 12} fontWeight={600}
      >
        {displayName}
      </text>
      <text
        x={x + width / 2} y={y + height / 2 + 10}
        textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={10}
      >
        {displayValue}
      </text>
    </g>
  );
};
