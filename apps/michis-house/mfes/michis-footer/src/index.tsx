import React, { useState, useEffect, useRef } from "react";

const P = 3;
const px = (n: number) => `${n * P}px`;

const CAT_COLORS = [
  { body: "#3a3a3a", light: "#5a5a5a", ear: "#ff8fa3" },
  { body: "#e07b39", light: "#f0a060", ear: "#ffcda8" },
  { body: "#e8e0d4", light: "#f5f0ea", ear: "#ffb3c1" },
  { body: "#9b7ec8", light: "#c4a8e8", ear: "#e8c8f0" },
  { body: "#d4c5a9", light: "#e8dcc4", ear: "#d4a574" },
  { body: "#2a2a2a", light: "#f0f0f0", ear: "#ff8fa3" },
];

interface RunningCat {
  id: number;
  x: number;
  color: typeof CAT_COLORS[0];
  speed: number;
  jumpPhase: number;
  size: number;
  direction: 1 | -1;
  runFrame: number;
}

function PixelMiniCat({ cat, frame }: { cat: RunningCat; frame: number }) {
  const s = cat.size;
  const jumpY = Math.sin(cat.jumpPhase) * 8 * s;
  const isJumping = jumpY < -2;
  const runBob = isJumping ? 0 : (cat.runFrame % 4 < 2 ? -0.5 : 0.5);
  const tailAngle = Math.sin(frame * 0.3 + cat.id) * 25;
  const legOffset = isJumping ? 2 : (cat.runFrame % 4 < 2 ? 1 : -1);

  return (
    <div style={{
      position: "absolute",
      left: `${cat.x}%`,
      bottom: `${8 - jumpY}px`,
      transform: `scaleX(${-cat.direction}) translateY(${runBob * P}px)`,
      transition: "none",
      width: px(12 * s),
      height: px(10 * s),
    }}>
      {/* Ears */}
      <div style={{ position: "absolute", left: px(1 * s), top: px(0), width: px(2 * s), height: px(2.5 * s), background: cat.color.body, clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
      <div style={{ position: "absolute", left: px(1.5 * s), top: px(0.8 * s), width: px(0.8 * s), height: px(1 * s), background: cat.color.ear }} />
      <div style={{ position: "absolute", right: px(3 * s), top: px(0), width: px(2 * s), height: px(2.5 * s), background: cat.color.body, clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
      <div style={{ position: "absolute", right: px(3.5 * s), top: px(0.8 * s), width: px(0.8 * s), height: px(1 * s), background: cat.color.ear }} />

      {/* Head */}
      <div style={{ position: "absolute", left: px(0), top: px(2 * s), width: px(8 * s), height: px(5 * s), background: cat.color.body, borderRadius: px(2 * s) }} />

      {/* Eyes */}
      <div style={{ position: "absolute", left: px(1.5 * s), top: px(3.5 * s), width: px(1.5 * s), height: px(1.5 * s), background: "#fff", borderRadius: px(0.5 * s) }} />
      <div style={{ position: "absolute", left: px(2 * s), top: px(4 * s), width: px(0.7 * s), height: px(0.7 * s), background: "#1a1a1a" }} />
      <div style={{ position: "absolute", left: px(4.5 * s), top: px(3.5 * s), width: px(1.5 * s), height: px(1.5 * s), background: "#fff", borderRadius: px(0.5 * s) }} />
      <div style={{ position: "absolute", left: px(5 * s), top: px(4 * s), width: px(0.7 * s), height: px(0.7 * s), background: "#1a1a1a" }} />

      {/* Body */}
      <div style={{ position: "absolute", left: px(3 * s), top: px(5 * s), width: px(9 * s), height: px(3.5 * s), background: cat.color.body, borderRadius: `0 ${px(2 * s)} ${px(1.5 * s)} 0` }} />
      <div style={{ position: "absolute", left: px(4 * s), top: px(5.5 * s), width: px(6 * s), height: px(2 * s), background: cat.color.light, borderRadius: px(1 * s) }} />

      {/* Front legs */}
      <div style={{ position: "absolute", left: px(4 * s), top: px(8 * s), width: px(1.2 * s), height: px(2 * s), background: cat.color.body, borderRadius: `0 0 ${px(0.5 * s)} ${px(0.5 * s)}`, transform: `rotate(${legOffset * 15}deg)`, transformOrigin: "top center" }} />
      <div style={{ position: "absolute", left: px(6 * s), top: px(8 * s), width: px(1.2 * s), height: px(2 * s), background: cat.color.body, borderRadius: `0 0 ${px(0.5 * s)} ${px(0.5 * s)}`, transform: `rotate(${-legOffset * 15}deg)`, transformOrigin: "top center" }} />

      {/* Back legs */}
      <div style={{ position: "absolute", left: px(9 * s), top: px(7.5 * s), width: px(1.5 * s), height: px(2.5 * s), background: cat.color.body, borderRadius: `0 0 ${px(0.5 * s)} ${px(0.5 * s)}`, transform: `rotate(${-legOffset * 20}deg)`, transformOrigin: "top center" }} />
      <div style={{ position: "absolute", left: px(10.5 * s), top: px(7.5 * s), width: px(1.5 * s), height: px(2.5 * s), background: cat.color.body, borderRadius: `0 0 ${px(0.5 * s)} ${px(0.5 * s)}`, transform: `rotate(${legOffset * 20}deg)`, transformOrigin: "top center" }} />

      {/* Tail */}
      <div style={{ position: "absolute", right: px(-1 * s), top: px(4 * s), width: px(3 * s), height: px(1 * s), background: cat.color.body, borderRadius: px(0.5 * s), transform: `rotate(${tailAngle}deg)`, transformOrigin: "left center" }} />
    </div>
  );
}

function MichisFooter() {
  const [frame, setFrame] = useState(0);
  const [cats, setCats] = useState<RunningCat[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => setFrame((f) => f + 1), 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function spawnCat() {
      const dir = Math.random() > 0.5 ? 1 : -1 as 1 | -1;
      const cat: RunningCat = {
        id: nextId.current++,
        x: dir === 1 ? -10 : 110,
        color: CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)],
        speed: 0.3 + Math.random() * 0.5,
        jumpPhase: Math.random() * Math.PI * 2,
        size: 0.7 + Math.random() * 0.5,
        direction: dir,
        runFrame: 0,
      };
      setCats((prev) => [...prev.slice(-8), cat]);
    }

    spawnCat();
    spawnCat();
    const interval = setInterval(spawnCat, 2500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCats((prev) =>
      prev
        .map((c) => ({
          ...c,
          x: c.x + c.speed * c.direction,
          jumpPhase: c.jumpPhase + 0.12 + c.speed * 0.05,
          runFrame: c.runFrame + 1,
        }))
        .filter((c) => c.x > -15 && c.x < 115)
    );
  }, [frame]);

  return (
    <div style={{
      background: "linear-gradient(0deg, #0d0a14 0%, #1a1625 100%)",
      height: "60px",
      position: "relative",
      overflow: "hidden",
      borderTop: "2px solid #4a3f6b",
      fontFamily: "'Press Start 2P', monospace",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>

      {/* Ground line */}
      <div style={{
        position: "absolute",
        bottom: "6px",
        left: 0,
        right: 0,
        height: "1px",
        background: "linear-gradient(90deg, transparent 0%, #4a3f6b40 20%, #4a3f6b60 50%, #4a3f6b40 80%, transparent 100%)",
      }} />

      {/* Ground dots */}
      <div style={{
        position: "absolute",
        bottom: "3px",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-around",
        padding: "0 20px",
      }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={{
            width: "2px",
            height: "2px",
            background: "#4a3f6b30",
            borderRadius: "50%",
          }} />
        ))}
      </div>

      {/* Cats */}
      {cats.map((cat) => (
        <PixelMiniCat key={cat.id} cat={cat} frame={frame} />
      ))}

      {/* Credits */}
      <div style={{
        position: "absolute",
        bottom: "2px",
        right: "12px",
        fontSize: "5px",
        color: "#4a3f6b80",
        letterSpacing: "1px",
      }}>
        POWERED BY LYX
      </div>
      <div style={{
        position: "absolute",
        bottom: "2px",
        left: "12px",
        fontSize: "5px",
        color: "#4a3f6b80",
        letterSpacing: "1px",
      }}>
        MICHIS HOUSE © 2026
      </div>
    </div>
  );
}

export default MichisFooter;
