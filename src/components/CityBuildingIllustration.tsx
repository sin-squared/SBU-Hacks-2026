import type { BuildingKind } from '@/game/city-config';

type BuildingIllustrationProps = {
  kind: BuildingKind;
  level: number;
};

function Window({ x, y, advanced = false }: { x: number; y: number; advanced?: boolean }) {
  return <rect x={x} y={y} width="8" height="10" rx="1" className={advanced ? 'fill-amber' : 'fill-brass'} stroke="currentColor" strokeWidth="1" />;
}

function Chimney({ x, y, height = 22 }: { x: number; y: number; height?: number }) {
  return <>
    <path d={`M${x} ${y + height}V${y}h12v${height}z`} className="fill-copper stroke-iron-deep" strokeWidth="1.5" />
    <path d={`M${x - 2} ${y}h16v5h-16z`} className="fill-brass stroke-iron-deep" strokeWidth="1.5" />
  </>;
}

function Gear({ x, y, radius = 8 }: { x: number; y: number; radius?: number }) {
  return <>
    <circle cx={x} cy={y} r={radius} className="fill-copper stroke-brass" strokeWidth="2" />
    <circle cx={x} cy={y} r={radius / 2.6} className="fill-iron-deep stroke-brass" strokeWidth="1.5" />
    <path d={`M${x} ${y - radius + 2}v${radius - 4}m${-radius + 2} 2h${radius - 4}m${radius - 2} 2h${radius - 4}`} className="stroke-brass" strokeWidth="1" />
  </>;
}

function Base() {
  return <path d="M8 86h104l-7 7H15z" className="fill-iron-deep stroke-copper" strokeWidth="2" />;
}

function OilRig({ tier }: { tier: number }) {
  return <>
    <path d="m25 81 21-55h20l22 55M36 57h44M30 72h56" fill="none" className="stroke-copper" strokeWidth="4" />
    <path d="M41 39h30M36 55h40" className="stroke-brass" strokeWidth="2" />
    <rect x="45" y="65" width="28" height="16" rx="3" className="fill-iron-deep stroke-brass" strokeWidth="2" />
    <path d="M49 65v-5h20v5M59 60V48m-8 0h16" fill="none" className="stroke-copper" strokeWidth="3" />
    <Window x={55} y={69} />
    {tier >= 2 && <>
      <rect x="79" y="70" width="16" height="11" rx="2" className="fill-secondary stroke-brass" strokeWidth="2" />
      <path d="M87 70V47l12 9M87 55h8" fill="none" className="stroke-copper" strokeWidth="3" />
    </>}
    {tier >= 3 && <>
      <path d="M20 80 34 43h8M20 79l22-9M34 43h8" fill="none" className="stroke-brass" strokeWidth="3" />
      <circle cx="34" cy="43" r="4" className="fill-amber stroke-brass" />
      <Gear x={97} y={41} radius={7} />
    </>}
  </>;
}

function SteamRig({ tier }: { tier: number }) {
  return <>
    <rect x="38" y="46" width="42" height="37" rx="10" className="fill-secondary stroke-copper" strokeWidth="3" />
    <path d="M38 55q21-14 42 0M45 46v-6h28v6M51 83v4m16-4v4" fill="none" className="stroke-brass" strokeWidth="3" />
    <circle cx="59" cy="58" r="9" className="fill-iron-deep stroke-brass" strokeWidth="2" />
    <path d="m59 58 5-5" className="stroke-amber" strokeWidth="2" />
    <path d="M80 62h11V39h10" fill="none" className="stroke-copper" strokeWidth="4" />
    {tier >= 2 && <>
      <rect x="20" y="61" width="16" height="22" rx="6" className="fill-secondary stroke-brass" strokeWidth="2" />
      <path d="M28 61V51h10" fill="none" className="stroke-copper" strokeWidth="3" />
      <circle cx="28" cy="70" r="3" className="fill-amber" />
    </>}
    {tier >= 3 && <>
      <rect x="84" y="66" width="16" height="17" rx="6" className="fill-secondary stroke-brass" strokeWidth="2" />
      <path d="M92 66V56h10" fill="none" className="stroke-copper" strokeWidth="3" />
      <circle cx="92" cy="73" r="3" className="fill-amber" />
    </>}
  </>;
}

function Refinery({ tier }: { tier: number }) {
  return <>
    <path d="M18 82V57l18-14 17 14v25z" className="fill-secondary stroke-copper" strokeWidth="3" />
    <rect x="53" y="61" width="47" height="21" className="fill-iron-deep stroke-brass" strokeWidth="2" />
    <rect x="63" y="35" width="15" height="26" className="fill-copper stroke-brass" strokeWidth="2" />
    <path d="M66 35v-8h9v8M78 69h15" fill="none" className="stroke-brass" strokeWidth="2" />
    <Window x={27} y={62} />
    <Window x={82} y={68} />
    {tier >= 2 && <>
      <rect x="84" y="43" width="12" height="18" className="fill-secondary stroke-copper" strokeWidth="2" />
      <path d="M86 43v-9h8v9M54 57h37" fill="none" className="stroke-brass" strokeWidth="2" />
      <circle cx="58" cy="56" r="4" className="fill-amber stroke-iron-deep" />
    </>}
    {tier >= 3 && <>
      <Chimney x={39} y={23} height={20} />
      <path d="M20 52h80M100 54v-18" fill="none" className="stroke-brass" strokeWidth="3" />
      <circle cx="101" cy="33" r="5" className="fill-amber stroke-brass" />
    </>}
  </>;
}

function Workshop({ tier }: { tier: number }) {
  return <>
    <path d="M22 81V51l18-13 17 13v30z" className="fill-secondary stroke-copper" strokeWidth="3" />
    <path d="M57 81V58l18-13 23 13v23z" className="fill-iron-deep stroke-brass" strokeWidth="2" />
    <rect x="65" y="61" width="9" height="20" className="fill-copper" />
    <Window x={31} y={58} />
    <Chimney x={78} y={25} height={20} />
    <Gear x={47} y={67} radius={8} />
    {tier >= 2 && <>
      <path d="M27 50V37h29v14M33 37v-9h18v9" fill="none" className="stroke-brass" strokeWidth="3" />
      <Window x={37} y={31} />
      <path d="M19 81h82" className="stroke-copper" strokeWidth="3" />
    </>}
    {tier >= 3 && <>
      <Gear x={89} y={68} radius={10} />
      <Chimney x={57} y={18} height={20} />
      <path d="M24 45h35M58 55h42" className="stroke-brass" strokeWidth="2" />
    </>}
  </>;
}

function Boiler({ tier }: { tier: number }) {
  return <>
    <path d="M20 82V59l12-10h56l12 10v23z" className="fill-secondary stroke-copper" strokeWidth="3" />
    <rect x="34" y="56" width="44" height="27" rx="13" className="fill-iron-deep stroke-brass" strokeWidth="3" />
    <path d="M40 56v-5h32v5M43 83v4m26-4v4" fill="none" className="stroke-copper" strokeWidth="3" />
    <circle cx="56" cy="68" r="7" className="fill-amber stroke-brass" strokeWidth="2" />
    <circle cx="85" cy="54" r="8" className="fill-iron-deep stroke-brass" strokeWidth="2" />
    <path d="m85 54 4-4" className="stroke-amber" strokeWidth="2" />
    {tier >= 2 && <>
      <path d="M27 52V34h11v15M78 48V33h10v17M24 65h10m44 0h14" fill="none" className="stroke-copper" strokeWidth="4" />
      <circle cx="32" cy="31" r="4" className="fill-steam" />
      <circle cx="83" cy="29" r="4" className="fill-steam" />
    </>}
    {tier >= 3 && <>
      <rect x="44" y="29" width="25" height="15" rx="7" className="fill-copper stroke-brass" strokeWidth="2" />
      <path d="M56 29V21h25v13M30 49V27h7M79 27h10" fill="none" className="stroke-brass" strokeWidth="3" />
      <circle cx="56" cy="36" r="4" className="fill-amber" />
    </>}
  </>;
}

function FactoryBuilding({ tier }: { tier: number }) {
  return <>
    <path d="M15 82V51l23 14V50l23 15V48l26 15v19z" className="fill-secondary stroke-copper" strokeWidth="3" />
    <rect x="72" y="34" width="11" height="22" className="fill-copper stroke-brass" strokeWidth="2" />
    <Window x={23} y={69} />
    <Window x={47} y={69} />
    <Window x={72} y={69} />
    <Gear x={96} y={70} radius={8} />
    {tier >= 2 && <>
      <Chimney x={32} y={26} height={25} />
      <Chimney x={78} y={20} height={14} />
      <path d="M15 49h72M40 42v-9h27v20" fill="none" className="stroke-brass" strokeWidth="3" />
    </>}
    {tier >= 3 && <>
      <Chimney x={58} y={14} height={19} />
      <path d="M13 61h92M24 48V37h18v20M86 54h16" fill="none" className="stroke-brass" strokeWidth="3" />
      <Gear x={96} y={43} radius={9} />
    </>}
  </>;
}

function Laboratory({ tier }: { tier: number }) {
  return <>
    <path d="M25 82V52l31-20 31 20v30z" className="fill-secondary stroke-copper" strokeWidth="3" />
    <path d="M44 82V62h25v20M51 32V22h10v10" className="fill-iron-deep stroke-brass" strokeWidth="2" />
    <path d="M56 22V14m-5 0h10" className="stroke-copper" strokeWidth="3" />
    <path d="M70 50V39l8-7 8 7v12" className="fill-iron-deep stroke-brass" strokeWidth="2" />
    <path d="M75 40h7l-1 7h-5z" className="fill-amber stroke-copper" />
    <Window x={32} y={59} />
    {tier >= 2 && <>
      <path d="M15 82V60h10M87 57h17v25M19 57h17" fill="none" className="stroke-brass" strokeWidth="3" />
      <path d="M91 57V45h9v12" className="fill-copper stroke-brass" strokeWidth="2" />
      <circle cx="97" cy="40" r="5" className="fill-amber stroke-brass" />
    </>}
    {tier >= 3 && <>
      <path d="M43 32V22q13-14 26 0v14M45 23h22" fill="none" className="stroke-brass" strokeWidth="3" />
      <path d="M48 82V56h17v26" className="fill-iron-deep stroke-copper" strokeWidth="2" />
      <circle cx="56" cy="65" r="5" className="fill-amber" />
    </>}
  </>;
}

function Bakery({ tier }: { tier: number }) {
  return <>
    <path d="M20 82V52l30-20 30 20v30z" className="fill-destructive/70 stroke-copper" strokeWidth="3" />
    <path d="M36 82V62q14-17 28 0v20z" className="fill-iron-deep stroke-brass" strokeWidth="2" />
    <path d="M42 76q8-12 16 0" fill="none" className="stroke-amber" strokeWidth="3" />
    <Window x={25} y={58} />
    <Chimney x={73} y={20} height={21} />
    <circle cx="49" cy="70" r="5" className="fill-amber" />
    {tier >= 2 && <>
      <path d="M22 51h57M30 44V34h16v12M82 62h13v20" fill="none" className="stroke-brass" strokeWidth="3" />
      <rect x="83" y="68" width="10" height="10" className="fill-copper stroke-brass" />
      <Window x={51} y={45} />
    </>}
    {tier >= 3 && <>
      <path d="M38 33V21q12-13 24 0v15" fill="none" className="stroke-brass" strokeWidth="3" />
      <Chimney x={83} y={14} height={17} />
      <path d="M35 82V58h28v24" className="fill-copper/60 stroke-brass" strokeWidth="2" />
      <circle cx="49" cy="69" r="8" className="fill-amber/80 stroke-brass" strokeWidth="2" />
    </>}
  </>;
}

function Dock({ tier }: { tier: number }) {
  return <>
    <path d="M12 78h96l-12 10H24z" className="fill-iron-deep stroke-copper" strokeWidth="3" />
    <path d="M15 91q12-6 24 0t24 0 24 0 24 0" fill="none" className="stroke-steam/70" strokeWidth="2" />
    <path d="M24 74V54h29v20z" className="fill-secondary stroke-brass" strokeWidth="2" />
    <path d="M34 54V25h7v29M37 28h38M69 28v9" fill="none" className="stroke-copper" strokeWidth="4" />
    <path d="m68 37 8 8-8 3z" className="fill-brass" />
    <rect x="74" y="62" width="15" height="12" className="fill-copper stroke-brass" />
    <Window x={31} y={60} />
    {tier >= 2 && <>
      <path d="M91 74V43h7v31M94 46h14M105 46v9" fill="none" className="stroke-brass" strokeWidth="3" />
      <rect x="77" y="49" width="13" height="12" className="fill-secondary stroke-copper" strokeWidth="2" />
      <path d="M24 51h30" className="stroke-brass" strokeWidth="2" />
    </>}
    {tier >= 3 && <>
      <path d="M17 70V36h7v34M20 39h24M41 39v8" fill="none" className="stroke-copper" strokeWidth="4" />
      <path d="M45 47 55 57 44 60z" className="fill-brass" />
      <rect x="59" y="50" width="15" height="12" className="fill-copper stroke-brass" strokeWidth="2" />
      <circle cx="97" cy="63" r="7" className="fill-iron-deep stroke-amber" strokeWidth="2" />
    </>}
  </>;
}

function BuildingShape({ kind, tier }: { kind: BuildingKind; tier: number }) {
  switch (kind) {
    case 'oilrig': return <OilRig tier={tier} />;
    case 'steamrig': return <SteamRig tier={tier} />;
    case 'refinery': return <Refinery tier={tier} />;
    case 'workshop': return <Workshop tier={tier} />;
    case 'boiler': return <Boiler tier={tier} />;
    case 'factory': return <FactoryBuilding tier={tier} />;
    case 'laboratory': return <Laboratory tier={tier} />;
    case 'bakery': return <Bakery tier={tier} />;
    case 'dock': return <Dock tier={tier} />;
    default: {
      const unsupportedKind: never = kind;
      return unsupportedKind;
    }
  }
}

export function CityBuildingIllustration({ kind, level }: BuildingIllustrationProps) {
  const tier = Math.max(1, Math.min(3, Math.floor(level)));
  return (
    <svg
      viewBox="0 0 120 100"
      className={`city-building-illustration city-building-${kind} ${tier > 1 ? 'animate-pop' : ''}`}
      data-building-kind={kind}
      data-building-tier={tier}
      aria-hidden="true"
    >
      <Base />
      <BuildingShape kind={kind} tier={tier} />
    </svg>
  );
}
