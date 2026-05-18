import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="neo-card overflow-hidden">
    <div className="absolute left-0 top-0 bottom-0 w-[3px] skeleton opacity-60 rounded-none" />
    <div className="pl-5 pr-5 pt-5 pb-4 space-y-3">
      {/* Badge row */}
      <div className="flex items-center gap-2">
        <div className="h-[18px] w-14 rounded-full skeleton" />
        <div className="h-[18px] w-20 rounded-full skeleton" />
        <div className="h-[18px] w-16 rounded-full skeleton" />
        <div className="ml-auto h-7 w-7 rounded-full skeleton" />
      </div>
      {/* Title */}
      <div className="space-y-2 pt-0.5">
        <div className="h-[15px] w-full skeleton" />
        <div className="h-[15px] w-[78%] skeleton" />
      </div>
      {/* Authors */}
      <div className="h-3 w-[55%] skeleton" />
      {/* Meta row */}
      <div className="flex gap-3 items-center">
        <div className="h-3 w-28 skeleton" />
        <div className="h-3 w-10 skeleton" />
        <div className="h-3 w-14 skeleton" />
      </div>
      {/* Impact bar */}
      <div className="h-[3px] w-full skeleton rounded-full" />
      {/* CTA */}
      <div className="h-9 w-full rounded-xl skeleton" />
      {/* Action buttons */}
      <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="h-7 w-24 rounded-full skeleton" />
        <div className="h-7 w-16 rounded-full skeleton" />
        <div className="ml-auto h-7 w-8 rounded-lg skeleton" />
      </div>
    </div>
  </div>
);
