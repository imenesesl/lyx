import React, { useState, useEffect } from "react";
import { emit } from "@lyx/sdk";

function InteractiveItem({ icon, label, color, animClass, onClick }: {
  icon: string; label: string; color: string; animClass: string; onClick: () => void;
}) {
  const [active, setActive] = useState(false);

  function handleClick() {
    setActive(true);
    onClick();
    setTimeout(() => setActive(false), 600);
  }

  return (
    <button
      onClick={handleClick}
      title={label}
      style={{
        background: active ? color : `${color}30`,
        border: `2px solid ${active ? color : `${color}60`}`,
        borderRadius: "8px",
        width: "40px",
        height: "40px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        transition: "all 0.15s",
        transform: active ? "scale(1.2)" : "scale(1)",
        boxShadow: active ? `0 0 16px ${color}80` : "none",
        position: "relative",
        overflow: "hidden",
        padding: 0,
      }}
    >
      <span className={active ? animClass : ""} style={{ display: "inline-block", lineHeight: 1 }}>
        {icon}
      </span>
      {active && (
        <span style={{
          position: "absolute",
          top: "-2px",
          right: "-2px",
          fontSize: "8px",
          color: "#fff",
          fontFamily: "'Press Start 2P', monospace",
          textShadow: `0 0 4px ${color}`,
        }}>
          +
        </span>
      )}
    </button>
  );
}

function DayNightToggle({ isNight, onToggle }: { isNight: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={isNight ? "Switch to Day" : "Switch to Night"}
      style={{
        background: isNight
          ? "linear-gradient(135deg, #1a1a3e, #2d1f6e)"
          : "linear-gradient(135deg, #ff9f43, #ffd43b)",
        border: `2px solid ${isNight ? "#4a3f8b" : "#ff9f43"}`,
        borderRadius: "20px",
        width: "56px",
        height: "28px",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.4s ease",
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* Stars (night) */}
      {isNight && (
        <>
          <span style={{ position: "absolute", top: "4px", left: "6px", fontSize: "5px", color: "#ffd43b", opacity: 0.8 }}>✦</span>
          <span style={{ position: "absolute", top: "14px", left: "12px", fontSize: "4px", color: "#ffd43b", opacity: 0.5 }}>✧</span>
          <span style={{ position: "absolute", bottom: "4px", left: "4px", fontSize: "3px", color: "#fff", opacity: 0.4 }}>·</span>
        </>
      )}
      {/* Clouds (day) */}
      {!isNight && (
        <>
          <span style={{ position: "absolute", top: "5px", right: "6px", fontSize: "6px", color: "#fff", opacity: 0.7 }}>☁</span>
          <span style={{ position: "absolute", bottom: "3px", right: "12px", fontSize: "4px", color: "#fff", opacity: 0.5 }}>☁</span>
        </>
      )}
      {/* Knob */}
      <div style={{
        position: "absolute",
        top: "2px",
        left: isNight ? "2px" : "28px",
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: isNight ? "#e8e0ff" : "#ffd43b",
        transition: "left 0.4s ease, background 0.4s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        boxShadow: isNight
          ? "0 0 8px #e8e0ff60, inset -3px -2px 0 #c4b0e8"
          : "0 0 12px #ffd43b80",
      }}>
        {isNight ? "🌙" : "☀️"}
      </div>
    </button>
  );
}

function MichisHeader() {
  const [time, setTime] = useState(new Date());
  const [catFace, setCatFace] = useState(0);
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCatFace((f) => (f + 1) % 4), 800);
    return () => clearInterval(t);
  }, []);

  function handleFeed() {
    emit("cat:action", { type: "feed" });
  }

  function handlePlay() {
    emit("cat:action", { type: "play" });
  }

  function handleSleep() {
    emit("cat:action", { type: "sleep" });
  }

  function handleToggleNight() {
    const next = !isNight;
    setIsNight(next);
    emit("cat:theme", { night: next });
  }

  const faces = ["=^.^=", "=^ω^=", "=^·^=", "=^◡^="];
  const hours = time.getHours().toString().padStart(2, "0");
  const mins = time.getMinutes().toString().padStart(2, "0");
  const secs = time.getSeconds().toString().padStart(2, "0");

  return (
    <div style={{
      background: "linear-gradient(135deg, #1a1625 0%, #2d1f4e 50%, #1a1625 100%)",
      padding: "0",
      fontFamily: "'Press Start 2P', monospace, system-ui",
      borderBottom: "3px solid #4a3f6b",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
@keyframes marquee-stars { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes pulse-glow { 0%,100% { text-shadow: 0 0 4px #ffd43b40; } 50% { text-shadow: 0 0 12px #ffd43b80; } }
@keyframes fish-jump { 0% { transform: translateY(0) rotate(0deg); } 30% { transform: translateY(-8px) rotate(-15deg); } 60% { transform: translateY(-4px) rotate(10deg); } 100% { transform: translateY(0) rotate(0deg); } }
@keyframes ball-bounce { 0% { transform: translateY(0) scale(1); } 40% { transform: translateY(-10px) scale(0.9); } 70% { transform: translateY(-3px) scale(1.1); } 100% { transform: translateY(0) scale(1); } }
@keyframes moon-spin { 0% { transform: rotate(0deg) scale(1.1); } 50% { transform: rotate(180deg) scale(0.9); } 100% { transform: rotate(360deg) scale(1.1); } }
.fish-anim { animation: fish-jump 0.6s ease-out; }
.ball-anim { animation: ball-bounce 0.6s ease-out; }
.moon-anim { animation: moon-spin 0.6s ease-out; }
`}</style>

      {/* Star field */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          display: "flex", whiteSpace: "nowrap",
          animation: "marquee-stars 20s linear infinite",
          fontSize: "6px", color: "#ffffff15", lineHeight: "70px", letterSpacing: "12px",
        }}>
          {"· ✦ · ★ · ✧ · ☆ · ✦ · ★ · ✧ · ☆ · ✦ · ★ · ✧ · ☆ · ✦ · ★ · ✧ · ☆ · ✦ · ★ · ✧ · ☆ · ✦ · ★ · ✧ · ☆ "}
          {"· ✦ · ★ · ✧ · ☆ · ✦ · ★ · ✧ · ☆ · ✦ · ★ · ✧ · ☆ · ✦ · ★ · ✧ · ☆ · ✦ · ★ · ✧ · ☆ · ✦ · ★ · ✧ · ☆ "}
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", position: "relative", zIndex: 1, gap: "12px", flexWrap: "wrap",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <span style={{ fontSize: "16px", color: "#ffd43b", animation: "pulse-glow 2s ease-in-out infinite" }}>
            {faces[catFace]}
          </span>
          <div>
            <div style={{ fontSize: "10px", color: "#e0d5f5", letterSpacing: "2px" }}>MICHIS HOUSE</div>
            <div style={{ fontSize: "6px", color: "#8a7fad", marginTop: "2px", letterSpacing: "1px" }}>VIRTUAL PET ARCADE</div>
          </div>
        </div>

        {/* Interactive items */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <InteractiveItem icon="🐟" label="Feed" color="#ff6b9d" animClass="fish-anim" onClick={handleFeed} />
          <InteractiveItem icon="🏀" label="Play" color="#51cf66" animClass="ball-anim" onClick={handlePlay} />
          <InteractiveItem icon="🌙" label="Sleep" color="#748ffc" animClass="moon-anim" onClick={handleSleep} />

          <div style={{ width: "1px", height: "28px", background: "#4a3f6b", margin: "0 4px" }} />

          <DayNightToggle isNight={isNight} onToggle={handleToggleNight} />
        </div>

        {/* Clock */}
        <div style={{
          fontSize: "9px", color: "#51cf66", fontFamily: "'Press Start 2P', monospace",
          background: "#1a162580", padding: "5px 8px", borderRadius: "4px",
          border: "1px solid #4a3f6b", letterSpacing: "2px", flexShrink: 0,
        }}>
          {hours}:{mins}<span style={{ opacity: time.getSeconds() % 2 === 0 ? 1 : 0.3 }}>:</span>{secs}
        </div>
      </div>
    </div>
  );
}

export default MichisHeader;
