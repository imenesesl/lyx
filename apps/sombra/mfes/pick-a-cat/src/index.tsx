import React, { useState, useEffect, useCallback, useRef } from "react";
import { on } from "@lyx/sdk";

type Mood = "happy" | "neutral" | "sad" | "sleeping" | "eating" | "playing";

interface Stats {
  hunger: number;
  happiness: number;
  energy: number;
}

const PX = 4;

function px(n: number) {
  return `${n * PX}px`;
}

interface CatPalette {
  label: string;
  body: string;
  bodyLight: string;
  ear: string;
  earInner: string;
  nose: string;
  swatch: string;
}

const CAT_PALETTES: CatPalette[] = [
  { label: "Shadow",  body: "#3a3a3a", bodyLight: "#5a5a5a", ear: "#3a3a3a", earInner: "#ff8fa3", nose: "#ff8fa3", swatch: "#3a3a3a" },
  { label: "Ginger",  body: "#e07b39", bodyLight: "#f0a060", ear: "#e07b39", earInner: "#ffcda8", nose: "#ff6b6b", swatch: "#e07b39" },
  { label: "Snow",    body: "#e8e0d4", bodyLight: "#f5f0ea", ear: "#e8e0d4", earInner: "#ffb3c1", nose: "#ffb3c1", swatch: "#e8e0d4" },
  { label: "Siamese", body: "#d4c5a9", bodyLight: "#e8dcc4", ear: "#8b6f47", earInner: "#d4a574", nose: "#c98a8a", swatch: "#d4c5a9" },
  { label: "Tuxedo",  body: "#2a2a2a", bodyLight: "#f0f0f0", ear: "#2a2a2a", earInner: "#ff8fa3", nose: "#ff8fa3", swatch: "#2a2a2a" },
  { label: "Lilac",   body: "#9b7ec8", bodyLight: "#c4a8e8", ear: "#9b7ec8", earInner: "#e8c8f0", nose: "#e8a0c0", swatch: "#9b7ec8" },
];

function getColors(palette: CatPalette, night = false) {
  if (night) {
    return {
      body: palette.body, bodyLight: palette.bodyLight,
      eye: "#ffffff", pupil: "#1a1a1a",
      nose: palette.nose, mouth: palette.nose,
      ear: palette.ear, earInner: palette.earInner,
      cheek: "#ffb3c1",
      bg: "#0d0b18",
      screen: "#1a1530",
      screenBorder: "#2e2755",
      button1: "#cc4577", button2: "#3a9e4d", button3: "#ccaa2e",
      barBg: "#2a2340", barHunger: "#cc5555", barHappy: "#ccaa2e", barEnergy: "#3a9e4d",
      stars: "#ffd43b",
      text: "#b8aed5", textDim: "#6a5f8a",
      food: "#cc7f36", heart: "#cc4577", zzz: "#6a5f8a", ball: "#3ba89e",
    };
  }
  return {
    body: palette.body, bodyLight: palette.bodyLight,
    eye: "#ffffff", pupil: "#1a1a1a",
    nose: palette.nose, mouth: palette.nose,
    ear: palette.ear, earInner: palette.earInner,
    cheek: "#ffb3c1",
    bg: "#fdf6ec",
    screen: "#fff8ee",
    screenBorder: "#e8d5b5",
    button1: "#ff6b9d", button2: "#51cf66", button3: "#ffd43b",
    barBg: "#f0e4d0", barHunger: "#ff6b6b", barHappy: "#ffd43b", barEnergy: "#51cf66",
    stars: "#ffa726",
    text: "#4a3f2e", textDim: "#8a7f6d",
    food: "#ff9f43", heart: "#ff6b9d", zzz: "#8a7f6d", ball: "#4ecdc4",
  };
}

const COLORS = getColors(CAT_PALETTES[0]);

function PixelCat({ mood, frame, colors }: { mood: Mood; frame: number; colors: ReturnType<typeof getColors> }) {
  const blinkFrame = frame % 60 < 3;
  const bounce = mood === "playing" ? (frame % 8 < 4 ? -1 : 0) : 0;
  const tailWag = frame % 10 < 5 ? 1 : -1;

  return (
    <div style={{ position: "relative", width: px(20), height: px(20), margin: "0 auto", transform: `translateY(${px(bounce)})`, transition: "transform 0.15s" }}>
      {/* Ears */}
      <div style={{ position: "absolute", left: px(2), top: px(0), width: px(3), height: px(4), background: colors.ear, clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
      <div style={{ position: "absolute", left: px(3), top: px(1), width: px(1), height: px(2), background: colors.earInner }} />
      <div style={{ position: "absolute", right: px(2), top: px(0), width: px(3), height: px(4), background: colors.ear, clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
      <div style={{ position: "absolute", right: px(3), top: px(1), width: px(1), height: px(2), background: colors.earInner }} />

      {/* Head */}
      <div style={{ position: "absolute", left: px(2), top: px(3), width: px(16), height: px(12), background: colors.body, borderRadius: px(3) }} />

      {/* Eyes */}
      {mood === "sleeping" ? (
        <>
          <div style={{ position: "absolute", left: px(5), top: px(7), width: px(3), height: px(1), background: colors.eye, borderRadius: 0 }} />
          <div style={{ position: "absolute", right: px(5), top: px(7), width: px(3), height: px(1), background: colors.eye, borderRadius: 0 }} />
        </>
      ) : blinkFrame ? (
        <>
          <div style={{ position: "absolute", left: px(5), top: px(7), width: px(3), height: px(1), background: colors.eye }} />
          <div style={{ position: "absolute", right: px(5), top: px(7), width: px(3), height: px(1), background: colors.eye }} />
        </>
      ) : (
        <>
          <div style={{ position: "absolute", left: px(5), top: px(6), width: px(3), height: px(3), background: colors.eye, borderRadius: px(1) }} />
          <div style={{ position: "absolute", left: px(6), top: px(7), width: px(1), height: px(1), background: colors.pupil }} />
          <div style={{ position: "absolute", right: px(5), top: px(6), width: px(3), height: px(3), background: colors.eye, borderRadius: px(1) }} />
          <div style={{ position: "absolute", right: px(6), top: px(7), width: px(1), height: px(1), background: colors.pupil }} />
          {mood === "happy" && (
            <>
              <div style={{ position: "absolute", left: px(5), top: px(8), width: px(3), height: px(1), background: colors.body, borderRadius: "0 0 50% 50%" }} />
              <div style={{ position: "absolute", right: px(5), top: px(8), width: px(3), height: px(1), background: colors.body, borderRadius: "0 0 50% 50%" }} />
            </>
          )}
        </>
      )}

      {/* Cheeks */}
      {(mood === "happy" || mood === "eating") && (
        <>
          <div style={{ position: "absolute", left: px(3), top: px(9), width: px(2), height: px(1), background: colors.cheek, opacity: 0.6, borderRadius: px(1) }} />
          <div style={{ position: "absolute", right: px(3), top: px(9), width: px(2), height: px(1), background: colors.cheek, opacity: 0.6, borderRadius: px(1) }} />
        </>
      )}

      {/* Nose */}
      <div style={{ position: "absolute", left: "50%", top: px(9), width: px(2), height: px(1), background: colors.nose, transform: "translateX(-50%)", borderRadius: px(1) }} />

      {/* Mouth */}
      {mood === "eating" ? (
        <div style={{ position: "absolute", left: "50%", top: px(10), width: px(3), height: px(2), background: colors.mouth, transform: "translateX(-50%)", borderRadius: `0 0 ${px(1)} ${px(1)}`, opacity: frame % 4 < 2 ? 1 : 0.7 }} />
      ) : mood === "happy" ? (
        <div style={{ position: "absolute", left: "50%", top: px(10), width: px(4), height: px(1), transform: "translateX(-50%)", borderBottom: `${px(1)} solid ${colors.mouth}`, borderRadius: `0 0 ${px(2)} ${px(2)}` }} />
      ) : mood === "sad" ? (
        <div style={{ position: "absolute", left: "50%", top: px(11), width: px(4), height: px(1), transform: "translateX(-50%)", borderTop: `${px(1)} solid ${colors.mouth}`, borderRadius: `${px(2)} ${px(2)} 0 0` }} />
      ) : (
        <div style={{ position: "absolute", left: "50%", top: px(10), width: px(2), height: px(1), background: colors.mouth, transform: "translateX(-50%)" }} />
      )}

      {/* Body */}
      <div style={{ position: "absolute", left: px(4), top: px(14), width: px(12), height: px(5), background: colors.body, borderRadius: `0 0 ${px(2)} ${px(2)}` }} />
      <div style={{ position: "absolute", left: px(6), top: px(14), width: px(8), height: px(3), background: colors.bodyLight, borderRadius: px(1) }} />

      {/* Tail */}
      <div style={{ position: "absolute", right: px(1), top: px(14), width: px(3), height: px(1), background: colors.body, transform: `rotate(${tailWag * 20}deg)`, transformOrigin: "left center", borderRadius: px(1), transition: "transform 0.2s" }} />

      {/* Feet */}
      <div style={{ position: "absolute", left: px(4), bottom: px(0), width: px(3), height: px(1), background: colors.body, borderRadius: `0 0 ${px(1)} ${px(1)}` }} />
      <div style={{ position: "absolute", right: px(4), bottom: px(0), width: px(3), height: px(1), background: colors.body, borderRadius: `0 0 ${px(1)} ${px(1)}` }} />

      {/* Mood decorations */}
      {mood === "sleeping" && (
        <div style={{ position: "absolute", right: px(-2), top: px(2), color: colors.zzz, fontSize: "10px", fontFamily: "monospace", fontWeight: "bold", opacity: frame % 6 < 3 ? 1 : 0.4, transition: "opacity 0.3s" }}>
          z<span style={{ fontSize: "8px" }}>z</span><span style={{ fontSize: "6px" }}>z</span>
        </div>
      )}
      {mood === "eating" && frame % 6 < 3 && (
        <div style={{ position: "absolute", left: px(-1), top: px(8), width: px(2), height: px(2), background: colors.food, borderRadius: "50%" }} />
      )}
      {mood === "playing" && (
        <div style={{ position: "absolute", right: px(-3), top: px(10 + (frame % 8 < 4 ? 0 : 2)), width: px(3), height: px(3), background: colors.ball, borderRadius: "50%", transition: "top 0.15s" }} />
      )}
      {mood === "happy" && frame % 20 < 10 && (
        <>
          <div style={{ position: "absolute", left: px(-1), top: px(1), color: colors.heart, fontSize: "8px" }}>♥</div>
          <div style={{ position: "absolute", right: px(-1), top: px(3), color: colors.heart, fontSize: "6px", opacity: 0.7 }}>♥</div>
        </>
      )}
    </div>
  );
}

function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
      <span style={{ fontSize: "12px", width: "16px", textAlign: "center" }}>{icon}</span>
      <span style={{ fontSize: "9px", fontFamily: "'Press Start 2P', monospace", color: COLORS.textDim, width: "36px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      <div style={{ flex: 1, height: "8px", background: COLORS.barBg, borderRadius: "2px", overflow: "hidden", border: `1px solid ${COLORS.screenBorder}` }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, transition: "width 0.5s ease", boxShadow: value > 20 ? `0 0 4px ${color}40` : undefined }} />
      </div>
      <span style={{ fontSize: "8px", fontFamily: "'Press Start 2P', monospace", color: value < 30 ? "#ff6b6b" : COLORS.text, width: "28px", textAlign: "right" }}>{Math.round(value)}</span>
    </div>
  );
}

function ActionButton({ label, icon, color, onClick, disabled }: { label: string; icon: string; color: string; onClick: () => void; disabled?: boolean }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={() => { if (!disabled) { setPressed(true); onClick(); setTimeout(() => setPressed(false), 150); } }}
      disabled={disabled}
      style={{
        background: disabled ? COLORS.barBg : color,
        border: "none",
        borderRadius: "6px",
        padding: "8px 4px",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        flex: 1,
        opacity: disabled ? 0.4 : 1,
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "transform 0.1s, opacity 0.2s",
        boxShadow: disabled ? "none" : `0 2px 8px ${color}40`,
      }}
    >
      <span style={{ fontSize: "16px" }}>{icon}</span>
      <span style={{ fontSize: "7px", fontFamily: "'Press Start 2P', monospace", color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
    </button>
  );
}

function ColorPicker({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {CAT_PALETTES.map((p, i) => (
        <button
          key={p.label}
          title={p.label}
          onClick={() => onSelect(i)}
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: p.swatch,
            border: selected === i ? "2px solid #ffd43b" : "2px solid transparent",
            cursor: "pointer",
            padding: 0,
            boxShadow: selected === i ? "0 0 6px #ffd43b80" : "none",
            transition: "border 0.15s, box-shadow 0.15s",
            outline: "none",
          }}
        />
      ))}
    </div>
  );
}

function PickACat() {
  const [stats, setStats] = useState<Stats>({ hunger: 70, happiness: 60, energy: 80 });
  const [mood, setMood] = useState<Mood>("neutral");
  const [frame, setFrame] = useState(0);
  const [action, setAction] = useState<string | null>(null);
  const [age, setAge] = useState(0);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [isNight, setIsNight] = useState(false);
  const [name] = useState("Pixel");
  const actionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doActionRef = useRef<(type: "feed" | "play" | "sleep") => void>(() => {});
  const colors = getColors(CAT_PALETTES[paletteIdx], isNight);

  useEffect(() => {
    const interval = setInterval(() => setFrame((f) => f + 1), 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const decay = setInterval(() => {
      setStats((s) => ({
        hunger: Math.max(0, s.hunger - 0.4),
        happiness: Math.max(0, s.happiness - 0.25),
        energy: Math.max(0, s.energy - 0.15),
      }));
      setAge((a) => a + 1);
    }, 3000);
    return () => clearInterval(decay);
  }, []);

  useEffect(() => {
    if (action) return;
    if (stats.energy < 15) setMood("sleeping");
    else if (stats.hunger < 25 || stats.happiness < 25) setMood("sad");
    else if (stats.happiness > 70 && stats.hunger > 50) setMood("happy");
    else setMood("neutral");
  }, [stats, action]);

  const doAction = useCallback((type: "feed" | "play" | "sleep") => {
    if (actionTimeout.current) clearTimeout(actionTimeout.current);

    if (type === "feed") {
      setMood("eating");
      setAction("Feeding...");
      setStats((s) => ({ ...s, hunger: Math.min(100, s.hunger + 25) }));
    } else if (type === "play") {
      setMood("playing");
      setAction("Playing!");
      setStats((s) => ({
        ...s,
        happiness: Math.min(100, s.happiness + 20),
        energy: Math.max(0, s.energy - 10),
      }));
    } else {
      setMood("sleeping");
      setAction("Sleeping...");
      setStats((s) => ({ ...s, energy: Math.min(100, s.energy + 30) }));
    }

    actionTimeout.current = setTimeout(() => {
      setAction(null);
    }, 2000);
  }, []);

  doActionRef.current = doAction;

  useEffect(() => {
    const unsub = on<{ type: string }>("cat:action", (data) => {
      const t = data?.type;
      if (t === "feed" || t === "play" || t === "sleep") {
        doActionRef.current(t);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = on<{ night: boolean }>("cat:theme", (data) => {
      setIsNight(!!data?.night);
    });
    return unsub;
  }, []);

  const overallHealth = Math.round((stats.hunger + stats.happiness + stats.energy) / 3);

  return (
    <div style={{
      background: colors.bg,
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Press Start 2P', monospace, system-ui",
      padding: "16px",
      transition: "background 0.8s ease",
      position: "relative",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
@keyframes sky-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes twinkle { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
`}</style>

      {/* Sky indicator */}
      <div style={{
        position: "absolute", top: "12px", right: "16px",
        fontSize: "24px",
        animation: "sky-float 3s ease-in-out infinite",
        filter: isNight ? "drop-shadow(0 0 8px #e8e0ff80)" : "drop-shadow(0 0 10px #ffd43b80)",
        transition: "filter 0.8s ease",
      }}>
        {isNight ? "🌙" : "☀️"}
      </div>

      {isNight && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} style={{
              position: "absolute",
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 23 + 7) % 80}%`,
              fontSize: `${3 + (i % 3) * 2}px`,
              color: "#ffd43b",
              animation: `twinkle ${1.5 + (i % 3) * 0.7}s ease-in-out ${(i % 5) * 0.3}s infinite`,
            }}>✦</span>
          ))}
        </div>
      )}

      <div style={{
        width: "320px",
        background: colors.screen,
        borderRadius: "16px",
        border: `3px solid ${colors.screenBorder}`,
        overflow: "hidden",
        boxShadow: `0 0 30px ${colors.screenBorder}30, 0 8px 32px rgba(0,0,0,0.4)`,
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.screenBorder}, ${colors.screen})`,
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${colors.screenBorder}`,
        }}>
          <div>
            <div style={{ fontSize: "10px", color: colors.text, letterSpacing: "1px" }}>
              ◆ {name}
            </div>
            <div style={{ fontSize: "7px", color: colors.textDim, marginTop: "3px" }}>
              Age: {Math.floor(age / 20)}d · HP: {overallHealth}%
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ColorPicker selected={paletteIdx} onSelect={setPaletteIdx} />
            <div style={{
              fontSize: "7px",
              color: overallHealth > 60 ? colors.barEnergy : overallHealth > 30 ? colors.barHappy : colors.barHunger,
              background: colors.barBg,
              padding: "3px 8px",
              borderRadius: "4px",
              border: `1px solid ${colors.screenBorder}`,
            }}>
              {overallHealth > 60 ? "◉ GOOD" : overallHealth > 30 ? "◎ OK" : "◌ LOW"}
            </div>
          </div>
        </div>

        {/* Cat viewport */}
        <div style={{
          height: "140px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(ellipse at center, ${colors.screenBorder}15 0%, transparent 70%)`,
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Scanline effect */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)",
            pointerEvents: "none",
          }} />

          {/* Ground */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "20px",
            background: `linear-gradient(0deg, ${colors.screenBorder}30, transparent)`,
          }} />

          <PixelCat mood={mood} frame={frame} colors={colors} />

          {/* Action text */}
          {action && (
            <div style={{
              position: "absolute",
              top: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "8px",
              color: colors.stars,
              background: `${colors.barBg}cc`,
              padding: "4px 10px",
              borderRadius: "4px",
              border: `1px solid ${colors.screenBorder}`,
              letterSpacing: "0.5px",
            }}>
              {action}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          borderTop: `1px solid ${colors.screenBorder}`,
          borderBottom: `1px solid ${colors.screenBorder}`,
        }}>
          <StatBar label="Food" value={stats.hunger} color={colors.barHunger} icon="🍖" />
          <StatBar label="Joy" value={stats.happiness} color={colors.barHappy} icon="⭐" />
          <StatBar label="Nap" value={stats.energy} color={colors.barEnergy} icon="⚡" />
        </div>

        {/* Action buttons */}
        <div style={{
          padding: "12px 14px",
          display: "flex",
          gap: "8px",
        }}>
          <ActionButton
            label="Feed"
            icon="🐟"
            color={colors.button1}
            onClick={() => doAction("feed")}
            disabled={action !== null || stats.hunger >= 100}
          />
          <ActionButton
            label="Play"
            icon="🧶"
            color={colors.button2}
            onClick={() => doAction("play")}
            disabled={action !== null || stats.energy < 10}
          />
          <ActionButton
            label="Sleep"
            icon="🌙"
            color={colors.button3}
            onClick={() => doAction("sleep")}
            disabled={action !== null || stats.energy >= 100}
          />
        </div>
      </div>
    </div>
  );
}

export default PickACat;
