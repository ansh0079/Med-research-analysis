import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen aurora-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-map-signs text-3xl text-indigo-400" />
        </div>
        <h1 className="text-6xl font-black text-slate-200 dark:text-slate-700 mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">Page not found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors"
          >
            <i className="fas fa-home mr-2" /> Go home
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-sm transition-colors"
          >
            <i className="fas fa-arrow-left mr-2" /> Go back
          </button>
        </div>
      </div>
    </div>
  );
};
