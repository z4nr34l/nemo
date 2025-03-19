import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Hero() {
  return (
    <div className="relative w-full">
      <Guides />
      <Globe />
      <Content />
    </div>
  );
}

function Content() {
  return (
    <div className="md:absolute p-8 md:p-0 inset-0 flex flex-col items-start justify-center md:grid grid-cols-12 grid-rows-4 md:grid-rows-6">
      <div className="row-span-1 md:row-span-3 col-span-12" />

      <div className="col-span-1 md:col-span-2" />
      <div className="col-span-8 flex flex-col items-start justify-between h-full">
        <div className="flex items-center gap-x-1">
          <Link href="https://www.rescale.build/" target="_blank">
            <img
              src="https://www.rescale.build/logo.svg"
              className="h-10"
              alt="Rescale logo"
            />
          </Link>
          <svg
            className="text-border h-10 w-10"
            fill="none"
            height="24"
            shapeRendering="geometricPrecision"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            width="24"
          >
            <path d="M16.88 3.549L7.12 20.451"></path>
          </svg>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">NEMO</h1>
        </div>
        <p className="text-muted-foreground">
          Untangle your requests and simplify middleware mess
        </p>
      </div>
      <div className="col-span-1 md:col-span-2" />

      <div className="hidden md:block md:col-span-2" />
      <div className="col-span-12 md:col-span-8 flex flex-col items-start justify-end mt-6 md:mt-0 md:w-full h-full gap-4 lg:flex-row lg:items-end lg:justify-start lg:gap-8">
        <div className="supports-[backdrop-filter]:bg-background/50 backdrop-blur-xl bg-background pr-4 pl-6 py-2 border rounded-full flex items-center justify-center gap-x-4 w-full md:w-auto">
          <code>
            <pre>bun add @rescale/nemo</pre>
          </code>
          <CopyButton
            value="bun add @rescale/nemo"
            className="relative top-0 right-0"
          />
        </div>
        <Link href="/docs">
          <Button className="rounded-full h-12 px-8">Get started</Button>
        </Link>
      </div>
      <div className="hidden md:block" />
    </div>
  );
}

function Guides() {
  return (
    <div className="hidden md:grid absolute inset-0 grid-cols-12 grid-rows-6 gap-px bg-border">
      {Array(72)
        .fill("")
        .map((_, id) => (
          <div key={id} className="bg-background" />
        ))}
    </div>
  );
}

function Globe() {
  return (
    <svg
      aria-hidden="true"
      height="100%"
      style={{
        transform: "translateY(0px) scale(1.002)",
      }}
      viewBox="-1 0 802 400"
      width="100%"
    >
      <g data-testid="globe-wireframe">
        <circle
          cx="400"
          cy="400"
          fill="hsl(var(--background))"
          r="400"
        ></circle>
        <path
          d="M 400 800 A -400 400 0 0 0 400 0"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M 400 800 A -266.667 400 0 0 0 400 0"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M 400 800 A -133.333 400 0 0 0 400 0"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M 400 800 A 0 400 0 0 0 400 0"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M 400 0 A 133.333 400 0 0 0 400 800"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M 400 0 A 266.667 400 0 0 0 400 800"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M 400 0 A 400 400 0 0 0 400 800"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M178.892,66.667 h442.217"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M101.858,133.333 h596.285"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M53.59,200 h692.82"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M22.876,266.667 h754.247"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M5.595,333.333 h788.811"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M0,400 h800"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M5.595,466.667 h788.811"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M22.876,533.333 h754.247"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M53.59,600 h692.82"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M101.858,666.667 h596.285"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
        <path
          d="M178.892,733.333 h442.217"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        ></path>
      </g>
      <g id="lllldll31" opacity="1">
        <path
          d="M794.405,333.333 h-131.468M662.937,333.333 h-131.468M531.468,333.333 h-131.468M400,333.333 h-131.468M 268.532 333.333 A -133.333 400 0 0 0 266.667 400M266.667,400 h-133.333M133.333,400 h-133.333"
          fill="none"
          stroke="url(#lllldll31-gradient)"
          strokeLinecap="round"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            dur="5.5s"
            id="opacity-lllldll31"
            keyTimes="0;0.091;0.182;0.273;0.364;0.455;0.545;0.636;0.727;0.818;1"
            repeatCount="indefinite"
            values="0;1;1;1;1;1;1;1;1;0;0"
          ></animate>
        </path>
        <defs>
          <radialGradient
            className="path_gradient__z0qlN"
            cx="100"
            cy="100"
            gradientUnits="userSpaceOnUse"
            id="lllldll31-gradient"
            r="0"
          >
            <stop offset="0" stopColor="#f59e0b"></stop>
            <stop offset="0.4" stopColor="#f59e0b"></stop>
            <stop offset="1" stopColor="#f59e0b" stopOpacity="0"></stop>
            <animate
              attributeName="cx"
              dur="5.5s"
              id="cx-lllldll31"
              keyTimes="0;0.091;0.182;0.273;0.364;0.455;0.545;0.636;0.727;0.818;1"
              repeatCount="indefinite"
              values="794.405;794.405;662.937;531.468;400;268.532;266.667;133.333;0;0;0"
            ></animate>
            <animate
              attributeName="cy"
              dur="5.5s"
              id="cy-lllldll31"
              keyTimes="0;0.091;0.182;0.273;0.364;0.455;0.545;0.636;0.727;0.818;1"
              repeatCount="indefinite"
              values="333.333;333.333;333.333;333.333;333.333;333.333;400;400;400;400;0"
            ></animate>
            <animate
              attributeName="r"
              dur="5.5s"
              id="r-lllldll31"
              keyTimes="0;0.091;0.182;0.273;0.364;0.455;0.545;0.636;0.727;0.818;1"
              repeatCount="indefinite"
              values="0;100;100;100;100;100;100;100;100;0;0"
            ></animate>
          </radialGradient>
        </defs>
      </g>
      <g id="llullldl34" opacity="1">
        <path
          d="M698.142,133.333 h-99.381M598.762,133.333 h-99.381M 499.381 133.333 A 133.333 400 0 0 0 473.703 66.667M473.703,66.667 h-73.703M400,66.667 h-73.703M326.297,66.667 h-73.703M 252.594 66.667 A -266.667 400 0 0 0 201.238 133.333M201.238,133.333 h-99.381"
          fill="none"
          stroke="url(#llullldl34-gradient)"
          strokeLinecap="round"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            dur="5.5s"
            id="opacity-llullldl34"
            keyTimes="0;0.082;0.164;0.245;0.327;0.409;0.491;0.573;0.655;0.736;0.818;1"
            repeatCount="indefinite"
            values="0;1;1;1;1;1;1;1;1;1;0;0"
            begin="4s"
          ></animate>
        </path>
        <defs>
          <radialGradient
            className="path_gradient__z0qlN"
            cx="100"
            cy="100"
            gradientUnits="userSpaceOnUse"
            id="llullldl34-gradient"
            r="0"
          >
            <stop offset="0" stopColor="hsl(var(--foreground))"></stop>
            <stop offset="0.4" stopColor="hsl(var(--foreground))"></stop>
            <stop
              offset="1"
              stopColor="hsl(var(--foreground))"
              stopOpacity="0"
            ></stop>
            <animate
              attributeName="cx"
              dur="5.5s"
              id="cx-llullldl34"
              keyTimes="0;0.082;0.164;0.245;0.327;0.409;0.491;0.573;0.655;0.736;0.818;1"
              repeatCount="indefinite"
              values="698.142;698.142;598.762;499.381;473.703;400;326.297;252.594;201.238;101.858;101.858;0"
              begin="4s"
            ></animate>
            <animate
              attributeName="cy"
              dur="5.5s"
              id="cy-llullldl34"
              keyTimes="0;0.082;0.164;0.245;0.327;0.409;0.491;0.573;0.655;0.736;0.818;1"
              repeatCount="indefinite"
              values="133.333;133.333;133.333;133.333;66.667;66.667;66.667;66.667;133.333;133.333;133.333;0"
              begin="4s"
            ></animate>
            <animate
              attributeName="r"
              dur="5.5s"
              id="r-llullldl34"
              keyTimes="0;0.082;0.164;0.245;0.327;0.409;0.491;0.573;0.655;0.736;0.818;1"
              repeatCount="indefinite"
              values="0;50;50;50;50;50;50;50;50;50;0;0"
              begin="4s"
            ></animate>
          </radialGradient>
        </defs>
      </g>
      <g id="llldlll35" opacity="1">
        <path
          d="M621.108,66.667 h-73.703M547.406,66.667 h-73.703M473.703,66.667 h-73.703M 400 133.333 A 0 400 0 0 0 400 66.667M400,133.333 h-99.381M300.619,133.333 h-99.381M201.238,133.333 h-99.381"
          fill="none"
          stroke="url(#llldlll35-gradient)"
          strokeLinecap="round"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            dur="5.5s"
            id="opacity-llldlll35"
            keyTimes="0;0.091;0.182;0.273;0.364;0.455;0.545;0.636;0.727;0.818;1"
            repeatCount="indefinite"
            values="0;1;1;1;1;1;1;1;1;0;0"
            begin="8s"
          ></animate>
        </path>
        <defs>
          <radialGradient
            className="path_gradient__z0qlN"
            cx="100"
            cy="100"
            gradientUnits="userSpaceOnUse"
            id="llldlll35-gradient"
            r="0"
          >
            <stop offset="0" stopColor="#ef4444"></stop>
            <stop offset="0.4" stopColor="#ef4444"></stop>
            <stop offset="1" stopColor="#ef4444" stopOpacity="0"></stop>
            <animate
              attributeName="cx"
              dur="5.5s"
              id="cx-llldlll35"
              keyTimes="0;0.091;0.182;0.273;0.364;0.455;0.545;0.636;0.727;0.818;1"
              repeatCount="indefinite"
              values="621.108;621.108;547.406;473.703;400;400;300.619;201.238;101.858;101.858;0"
              begin="8s"
            ></animate>
            <animate
              attributeName="cy"
              dur="5.5s"
              id="cy-llldlll35"
              keyTimes="0;0.091;0.182;0.273;0.364;0.455;0.545;0.636;0.727;0.818;1"
              repeatCount="indefinite"
              values="66.667;66.667;66.667;66.667;66.667;133.333;133.333;133.333;133.333;133.333;0"
              begin="8s"
            ></animate>
            <animate
              attributeName="r"
              dur="5.5s"
              id="r-llldlll35"
              keyTimes="0;0.091;0.182;0.273;0.364;0.455;0.545;0.636;0.727;0.818;1"
              repeatCount="indefinite"
              values="0;66.667;66.667;66.667;66.667;66.667;66.667;66.667;66.667;0;0"
              begin="8s"
            ></animate>
          </radialGradient>
        </defs>
      </g>
      <g id="llddllll33" opacity="1">
        <path
          d="M746.41,200 h-115.47M630.94,200 h-115.47M 525.708 266.667 A 133.333 400 0 0 0 515.47 200M 531.468 333.333 A 133.333 400 0 0 0 525.708 266.667M531.468,333.333 h-131.468M400,333.333 h-131.468M268.532,333.333 h-131.468M137.063,333.333 h-131.468"
          fill="none"
          stroke="url(#llddllll33-gradient)"
          strokeLinecap="round"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            dur="5.5s"
            id="opacity-llddllll33"
            keyTimes="0;0.082;0.164;0.245;0.327;0.409;0.491;0.573;0.655;0.736;0.818;1"
            repeatCount="indefinite"
            values="0;1;1;1;1;1;1;1;1;1;0;0"
            begin="12s"
          ></animate>
        </path>
        <defs>
          <radialGradient
            className="path_gradient__z0qlN"
            cx="100"
            cy="100"
            gradientUnits="userSpaceOnUse"
            id="llddllll33-gradient"
            r="0"
          >
            <stop offset="0" stopColor="hsl(var(--foreground))"></stop>
            <stop offset="0.4" stopColor="hsl(var(--foreground))"></stop>
            <stop
              offset="1"
              stopColor="hsl(var(--foreground))"
              stopOpacity="0"
            ></stop>
            <animate
              attributeName="cx"
              dur="5.5s"
              id="cx-llddllll33"
              keyTimes="0;0.082;0.164;0.245;0.327;0.409;0.491;0.573;0.655;0.736;0.818;1"
              repeatCount="indefinite"
              values="746.41;746.41;630.94;515.47;525.708;531.468;400;268.532;137.063;5.595;5.595;0"
              begin="12s"
            ></animate>
            <animate
              attributeName="cy"
              dur="5.5s"
              id="cy-llddllll33"
              keyTimes="0;0.082;0.164;0.245;0.327;0.409;0.491;0.573;0.655;0.736;0.818;1"
              repeatCount="indefinite"
              values="200;200;200;200;266.667;333.333;333.333;333.333;333.333;333.333;333.333;0"
              begin="12s"
            ></animate>
            <animate
              attributeName="r"
              dur="5.5s"
              id="r-llddllll33"
              keyTimes="0;0.082;0.164;0.245;0.327;0.409;0.491;0.573;0.655;0.736;0.818;1"
              repeatCount="indefinite"
              values="0;100;100;100;100;100;100;100;100;100;0;0"
              begin="12s"
            ></animate>
          </radialGradient>
        </defs>
      </g>
      <g id="lllddlll34" opacity="1">
        <path
          d="M698.142,133.333 h-99.381M598.762,133.333 h-99.381M499.381,133.333 h-99.381M 400 200 A 0 400 0 0 0 400 133.333M 400 266.667 A 0 400 0 0 0 400 200M400,266.667 h-125.708M274.292,266.667 h-125.708M148.584,266.667 h-125.708"
          fill="none"
          stroke="url(#lllddlll34-gradient)"
          strokeLinecap="round"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            dur="5.5s"
            id="opacity-lllddlll34"
            keyTimes="0;0.082;0.164;0.245;0.327;0.409;0.491;0.573;0.655;0.736;0.818;1"
            repeatCount="indefinite"
            values="0;1;1;1;1;1;1;1;1;1;0;0"
            begin="16s"
          ></animate>
        </path>
        <defs>
          <radialGradient
            className="path_gradient__z0qlN"
            cx="100"
            cy="100"
            gradientUnits="userSpaceOnUse"
            id="lllddlll34-gradient"
            r="0"
          >
            <stop offset="0" stopColor="#f59e0b"></stop>
            <stop offset="0.4" stopColor="#f59e0b"></stop>
            <stop offset="1" stopColor="#f59e0b" stopOpacity="0"></stop>
            <animate
              attributeName="cx"
              dur="5.5s"
              id="cx-lllddlll34"
              keyTimes="0;0.082;0.164;0.245;0.327;0.409;0.491;0.573;0.655;0.736;0.818;1"
              repeatCount="indefinite"
              values="698.142;698.142;598.762;499.381;400;400;400;274.292;148.584;22.876;22.876;0"
              begin="16s"
            ></animate>
            <animate
              attributeName="cy"
              dur="5.5s"
              id="cy-lllddlll34"
              keyTimes="0;0.082;0.164;0.245;0.327;0.409;0.491;0.573;0.655;0.736;0.818;1"
              repeatCount="indefinite"
              values="133.333;133.333;133.333;133.333;133.333;200;266.667;266.667;266.667;266.667;266.667;0"
              begin="16s"
            ></animate>
            <animate
              attributeName="r"
              dur="5.5s"
              id="r-lllddlll34"
              keyTimes="0;0.082;0.164;0.245;0.327;0.409;0.491;0.573;0.655;0.736;0.818;1"
              repeatCount="indefinite"
              values="0;66.667;66.667;66.667;66.667;66.667;66.667;66.667;66.667;66.667;0;0"
              begin="16s"
            ></animate>
          </radialGradient>
        </defs>
      </g>
      <g id="llullll32" opacity="1">
        <path
          d="M777.124,266.667 h-125.708M651.416,266.667 h-125.708M 525.708 266.667 A 133.333 400 0 0 0 515.47 200M515.47,200 h-115.47M400,200 h-115.47M284.53,200 h-115.47M169.06,200 h-115.47"
          fill="none"
          stroke="url(#llullll32-gradient)"
          strokeLinecap="round"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            dur="5.5s"
            id="opacity-llullll32"
            keyTimes="0;0.091;0.182;0.273;0.364;0.455;0.545;0.636;0.727;0.818;1"
            repeatCount="indefinite"
            values="0;1;1;1;1;1;1;1;1;0;0"
            begin="20s"
          ></animate>
        </path>
        <defs>
          <radialGradient
            className="path_gradient__z0qlN"
            cx="100"
            cy="100"
            gradientUnits="userSpaceOnUse"
            id="llullll32-gradient"
            r="0"
          >
            <stop offset="0" stopColor="hsl(var(--foreground))"></stop>
            <stop offset="0.4" stopColor="hsl(var(--foreground))"></stop>
            <stop
              offset="1"
              stopColor="hsl(var(--foreground))"
              stopOpacity="0"
            ></stop>
            <animate
              attributeName="cx"
              dur="5.5s"
              id="cx-llullll32"
              keyTimes="0;0.091;0.182;0.273;0.364;0.455;0.545;0.636;0.727;0.818;1"
              repeatCount="indefinite"
              values="777.124;777.124;651.416;525.708;515.47;400;284.53;169.06;53.59;53.59;0"
              begin="20s"
            ></animate>
            <animate
              attributeName="cy"
              dur="5.5s"
              id="cy-llullll32"
              keyTimes="0;0.091;0.182;0.273;0.364;0.455;0.545;0.636;0.727;0.818;1"
              repeatCount="indefinite"
              values="266.667;266.667;266.667;266.667;200;200;200;200;200;200;0"
              begin="20s"
            ></animate>
            <animate
              attributeName="r"
              dur="5.5s"
              id="r-llullll32"
              keyTimes="0;0.091;0.182;0.273;0.364;0.455;0.545;0.636;0.727;0.818;1"
              repeatCount="indefinite"
              values="0;50;50;50;50;50;50;50;50;0;0"
              begin="20s"
            ></animate>
          </radialGradient>
        </defs>
      </g>
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="globe-gradient"
          x1="0"
          x2="0"
          y1="0"
          y2="400"
        >
          <stop offset="0%" stopColor="hsl(var(--border))"></stop>
          <stop offset="100%" stopColor="hsl(var(--border))"></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
