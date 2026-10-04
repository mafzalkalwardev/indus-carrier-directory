function Wheel({ x }: { x: number }) {
  return (
    <g className="wheel">
      <circle cx={x} cy="72" r="13" fill="#0b1220" />
      <circle cx={x} cy="72" r="6.5" fill="#cbd5e1" />
      <circle cx={x} cy="72" r="2.4" fill="#1b365d" />
      <path d={`M${x} 61.5 v21 M${x - 9} 72 h18`} stroke="#0b1220" strokeWidth="1.4" />
    </g>
  );
}

function Truck({ dir, later }: { dir: "down" | "up"; later?: boolean }) {
  return (
    <svg className={`rig rig-${dir}${later ? " rig-later" : ""}`} viewBox="0 0 260 92" aria-hidden="true">
      <rect x="8" y="16" width="152" height="52" rx="6" fill="#f8fafc" />
      <rect x="8" y="34" width="152" height="10" fill="#3b82f6" />
      <path d="M20 22h16l5 8H20z" fill="#1b365d" />
      <path d="M56 20v44M104 20v44" stroke="#e2e8f0" strokeWidth="2" />
      <path d="M160 30h34c8 0 14 4 20 12l18 4v18H160V30z" fill="#1b365d" />
      <path d="M196 34h16l14 10H196V34z" fill="#bfdbfe" />
      <rect x="172" y="52" width="22" height="7" rx="2" fill="#3b82f6" />
      <circle className="beacon" cx="48" cy="12" r="3.2" fill="#f87171" />
      <circle className="headlight" cx="230" cy="58" r="3.4" fill="#fff4b8" />
      <ellipse className="beam" cx="242" cy="58" rx="10" ry="3.2" fill="#fde68a" />
      <Wheel x={34} />
      <Wheel x={74} />
      <Wheel x={118} />
      <Wheel x={196} />
    </svg>
  );
}

function Van({ dir }: { dir: "down" | "up" }) {
  return (
    <svg className={`van van-${dir}`} viewBox="0 0 120 70" aria-hidden="true">
      <rect x="8" y="16" width="70" height="36" rx="6" fill="#3b82f6" />
      <rect x="16" y="22" width="22" height="14" rx="2" fill="#dbeafe" />
      <path d="M78 26h18l12 12v14H78V26z" fill="#1b365d" />
      <path d="M90 30h10l8 8H90V30z" fill="#bfdbfe" />
      <g className="wheel">
        <circle cx="28" cy="54" r="9" fill="#0b1220" />
        <circle cx="28" cy="54" r="4" fill="#e2e8f0" />
      </g>
      <g className="wheel">
        <circle cx="86" cy="54" r="9" fill="#0b1220" />
        <circle cx="86" cy="54" r="4" fill="#e2e8f0" />
      </g>
    </svg>
  );
}

function Rail({ side }: { side: "left" | "right" }) {
  const truckDir = side === "left" ? "down" : "up";
  const vanDir = side === "left" ? "up" : "down";
  return (
    <div className={`side-rail side-rail-${side}`}>
      <span className="road road-main" />
      <span className="road road-side" />
      <span className={`studs${side === "right" ? " studs-up" : ""}`} />
      <span className={`studs studs-side${side === "right" ? " studs-up" : ""}`} />
      <span className={`lane-mark lane-mark-main${side === "right" ? " lane-mark-up" : ""}`} />
      <span className={`lane-mark lane-mark-side${side === "right" ? " lane-mark-up" : ""}`} />
      <Truck dir={truckDir} />
      <Truck dir={truckDir} later />
      <Van dir={vanDir} />
    </div>
  );
}

export function SideRails() {
  return (
    <div className="side-rails" aria-hidden="true">
      <Rail side="left" />
      <Rail side="right" />
    </div>
  );
}
