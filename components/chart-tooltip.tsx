/**
 * 다크모드 대응 공통 Recharts 툴팁 스타일
 * 
 * 모든 Recharts Tooltip에 spread로 적용:
 * <Tooltip {...chartTooltipStyle} />
 */
export const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--card-foreground))',
  },
  labelStyle: {
    color: 'hsl(var(--muted-foreground))',
  },
};
