/** Deterministic star positions for night sky — no random flicker on re-render. */
type StarSpec = {
  id: number;
  left: number;
  top: number;
  size: number;
  opacity: number;
  delay: number;
  twinkle: boolean;
};

function createSeededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rand = createSeededRandom(20260618);
const STAR_COUNT = 74;

const STARS: StarSpec[] = Array.from({ length: STAR_COUNT }, (_, i) => {
  // Slightly bias stars toward upper sky while keeping broad spread.
  const left = 2 + rand() * 96;
  const top = 3 + Math.pow(rand(), 1.25) * 79;

  const sizeRoll = rand();
  const size = sizeRoll > 0.92 ? 2.35 : sizeRoll > 0.68 ? 1.75 : 1.15;

  return {
    id: i,
    left,
    top,
    size,
    opacity: 0.28 + rand() * 0.66,
    delay: rand() * 5.2,
    twinkle: rand() > 0.22,
  };
});

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
      <div className="star-moon-wrap">
        <div className="star-moon-glow" />
        <div className="star-moon" />
      </div>
    </div>
  );
}
