import React from 'react';
import type { PrismaCounts } from '@types';

interface Props {
  counts: PrismaCounts;
}

/** Renders an inline PRISMA 2020-style flow diagram as SVG. */
export const PrismaFlow: React.FC<Props> = ({ counts }) => {
  const screened = counts.total - counts.pending;
  const assessed = counts.included + counts.maybe;

  // Box dimensions
  const bw = 220;
  const bh = 64;
  const cx = 380; // center x
  const lx = cx - bw / 2;
  const rx = cx + bw / 2;
  const excW = 170;
  const excX = rx + 48;
  const svgW = excX + excW + 24;
  const svgH = 480;

  // Row y positions (top of each main box)
  const y0 = 20;
  const y1 = 148;
  const y2 = 276;
  const y3 = 404;

  const box = (x: number, y: number, label: string, value: number, accent = false) => (
    <g key={label}>
      <rect
        x={x} y={y} width={bw} height={bh} rx={8}
        fill={accent ? '#eef2ff' : '#f8fafc'}
        stroke={accent ? '#6366f1' : '#94a3b8'}
        strokeWidth={accent ? 2 : 1.5}
      />
      <text x={x + bw / 2} y={y + 20} textAnchor="middle" fontSize={11} fill="#64748b" fontFamily="Arial,sans-serif">{label}</text>
      <text x={x + bw / 2} y={y + 48} textAnchor="middle" fontSize={22} fontWeight="700" fill={accent ? '#4f46e5' : '#1e293b'} fontFamily="Arial,sans-serif">
        n = {value}
      </text>
    </g>
  );

  const excBox = (y: number, label: string, value: number) => (
    <g key={`exc-${y}`}>
      <rect
        x={excX} y={y + (bh - 52) / 2} width={excW} height={52} rx={8}
        fill="#fff7ed" stroke="#f97316" strokeWidth={1.5}
      />
      <text x={excX + excW / 2} y={y + (bh - 52) / 2 + 18} textAnchor="middle" fontSize={11} fill="#92400e" fontFamily="Arial,sans-serif">{label}</text>
      <text x={excX + excW / 2} y={y + (bh - 52) / 2 + 42} textAnchor="middle" fontSize={18} fontWeight="700" fill="#ea580c" fontFamily="Arial,sans-serif">
        n = {value}
      </text>
    </g>
  );

  // Arrow helper
  const arrow = (x1: number, y1a: number, x2: number, y2a: number) => {
    const mx = (x1 + x2) / 2;
    const my = (y1a + y2a) / 2;
    return (
      <g key={`${x1}-${y1a}-${x2}-${y2a}`}>
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="2" orient="auto">
            <path d="M0,0 L0,4 L6,2 z" fill="#94a3b8" />
          </marker>
        </defs>
        <line x1={x1} y1={y1a} x2={x2} y2={y2a} stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#arr)" />
      </g>
    );
  };

  // Horizontal arrow to exclusion box
  const excArrow = (fromY: number) => {
    const midY = fromY + bh / 2;
    return (
      <g key={`exc-arr-${fromY}`}>
        <line x1={rx} y1={midY} x2={excX} y2={midY} stroke="#f97316" strokeWidth={1.5} markerEnd="url(#arr-orange)" />
        <defs>
          <marker id="arr-orange" markerWidth="8" markerHeight="8" refX="4" refY="2" orient="auto">
            <path d="M0,0 L0,4 L6,2 z" fill="#f97316" />
          </marker>
        </defs>
      </g>
    );
  };

  return (
    <div className="neo-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black text-gray-900 dark:text-white">PRISMA Flow</h3>
        <div className="flex gap-4 text-xs text-gray-500">
          <span><span className="inline-block w-3 h-3 rounded bg-indigo-100 border border-indigo-400 mr-1 align-middle" />Main flow</span>
          <span><span className="inline-block w-3 h-3 rounded bg-orange-50 border border-orange-400 mr-1 align-middle" />Excluded</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          width="100%"
          className="block max-h-[500px]"
          aria-label="PRISMA flow diagram"
        >
          {/* Phase labels */}
          <text x={8} y={y0 + 22} fontSize={9} fill="#94a3b8" fontFamily="Arial,sans-serif" fontWeight="600" textAnchor="start">IDENTIFICATION</text>
          <text x={8} y={y1 + 22} fontSize={9} fill="#94a3b8" fontFamily="Arial,sans-serif" fontWeight="600" textAnchor="start">SCREENING</text>
          <text x={8} y={y2 + 22} fontSize={9} fill="#94a3b8" fontFamily="Arial,sans-serif" fontWeight="600" textAnchor="start">ELIGIBILITY</text>
          <text x={8} y={y3 + 22} fontSize={9} fill="#94a3b8" fontFamily="Arial,sans-serif" fontWeight="600" textAnchor="start">INCLUDED</text>

          {/* Phase dividers */}
          {[y0, y1, y2, y3].map((y) => (
            <line key={`div-${y}`} x1={80} y1={y - 8} x2={svgW - 8} y2={y - 8} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4,4" />
          ))}

          {/* Main flow boxes */}
          {box(lx, y0, 'Records identified', counts.total, true)}
          {box(lx, y1, 'Records screened', screened, false)}
          {box(lx, y2, 'Assessed for eligibility', assessed, false)}
          {box(lx, y3, 'Studies included', counts.included, true)}

          {/* Exclusion boxes */}
          {excBox(y1, 'Excluded at screening', counts.excluded)}
          {excBox(y2, 'Pending / under review', counts.maybe)}

          {/* Down arrows */}
          {arrow(cx, y0 + bh, cx, y1)}
          {arrow(cx, y1 + bh, cx, y2)}
          {arrow(cx, y2 + bh, cx, y3)}

          {/* Horizontal arrows to exclusion boxes */}
          {excArrow(y1)}
          {excArrow(y2)}

          {/* Pending count note */}
          {counts.pending > 0 && (
            <text x={cx} y={y1 - 10} textAnchor="middle" fontSize={10} fill="#f97316" fontFamily="Arial,sans-serif">
              {counts.pending} record{counts.pending !== 1 ? 's' : ''} awaiting screening
            </text>
          )}
        </svg>
      </div>

      {/* Summary row */}
      <div className="mt-3 grid grid-cols-5 gap-2 text-center">
        {[
          { label: 'Total', value: counts.total, color: 'text-indigo-600' },
          { label: 'Pending', value: counts.pending, color: 'text-amber-500' },
          { label: 'Included', value: counts.included, color: 'text-emerald-600' },
          { label: 'Excluded', value: counts.excluded, color: 'text-red-500' },
          { label: 'Maybe', value: counts.maybe, color: 'text-orange-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-gray-50 dark:bg-slate-800 p-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
            <p className={`text-xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
