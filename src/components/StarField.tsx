/** Deterministic star positions for night sky — no random flicker on re-render. */
const STARS = Array.from({ length: 72 }, (_, i) => ({
  id: i,
  left: ((i * 137.508 + 11) % 96) + 2,
  top: ((i * 89.317 + 5) % 78) + 4,
  size: i % 7 === 0 ? 2.2 : i % 3 === 0 ? 1.6 : 1.1,
  opacity: 0.35 + (i % 5) * 0.12,
  delay: (i * 0.37) % 5,
  twinkle: i % 4 !== 0,
}));

export function StarField() {
  return (
    <div className="star-field" aria-hidden="true">
      {STARS.map((star) => (
        <span
          key={star.id}
          className={`star ${star.twinkle ? 'star--twinkle' : ''}`}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
      <div className="star-moon-glow" />
    </div>
  );
}
