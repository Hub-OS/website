export function PlayButton({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 1 1" fill="white" width={size} height={size}>
      <polygon points="0.1 0 1 0.5 0.1 1" />
    </svg>
  );
}
