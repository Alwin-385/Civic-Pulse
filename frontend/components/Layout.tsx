
import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onBack, actions }) => (
  <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 pt-12 pb-4 border-b border-slate-100 flex items-center justify-between">
    <div className="flex items-center gap-3">
      {onBack && (
        <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 text-primary">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
      )}
      <div>
        <h1 className="text-xl font-bold text-slate-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {actions}
    </div>
  </header>
);

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{ id: string; label: string; icon: string }>;
  centerAction?: React.ReactNode;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, tabs, centerAction }) => (
  <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 pt-2 pb-8 flex items-center justify-between z-40">
    {tabs.slice(0, 2).map(tab => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`flex flex-col items-center gap-1 ${activeTab === tab.id ? 'text-primary' : 'text-slate-400'}`}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
        <span className="text-[10px] font-bold">{tab.label}</span>
      </button>
    ))}
    
    {centerAction && <div className="relative -top-6">{centerAction}</div>}
    
    {tabs.slice(2).map(tab => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`flex flex-col items-center gap-1 ${activeTab === tab.id ? 'text-primary' : 'text-slate-400'}`}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
        <span className="text-[10px] font-bold">{tab.label}</span>
      </button>
    ))}
  </nav>
);
