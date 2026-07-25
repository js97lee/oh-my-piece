export default function DiscountBadge({ value, tone }) {
  return <span className={`discount-badge discount-badge--${tone}`}>{value}</span>;
}
