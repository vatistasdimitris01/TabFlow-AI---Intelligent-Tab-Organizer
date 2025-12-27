
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tab, TabGroup } from './types';
import { COLORS } from './constants';
import { categorizeTabs, StreamUpdate } from './services/geminiService';

const App: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [groundingSources, setGroundingSources] = useState<any[]>([]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.source !== 'tabflow-extension') return;
      const { action, data } = event.data;
      if (action === 'TABS_UPDATE') {
        setTabs(data);
        setConnectionStatus('connected');
      } else if (action === 'PONG') {
        setConnectionStatus('connected');
        window.postMessage({ source: 'tabflow-page', action: 'GET_TABS' }, '*');
      }
    };
    window.addEventListener('message', handleMessage);
    const ping = setInterval(() => {
      window.postMessage({ source: 'tabflow-page', action: 'PING' }, '*');
    }, 1500);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(ping);
    };
  }, []);

  const handleOrganize = async () => {
    if (tabs.length === 0) return;
    setIsOrganizing(true);
    setStatusMessage('Connecting...');
    setGroundingSources([]);

    try {
      await categorizeTabs(tabs, (update: StreamUpdate) => {
        if (update.status === 'error') {
          setStatusMessage(`Failed: ${update.message}`);
          setIsOrganizing(false);
        } else if (update.status === 'success' && update.data) {
          const newGroups: TabGroup[] = update.data.groups.map((g, idx) => ({
            id: `group-${idx}-${Date.now()}`,
            name: g.name,
            description: g.description,
            color: g.color || COLORS[idx % COLORS.length],
            tabIds: g.tabIndices.map(index => tabs[index].id)
          }));
          setGroups(newGroups);
          if (update.sources) setGroundingSources(update.sources);
          
          window.postMessage({ 
            source: 'tabflow-page', 
            action: 'APPLY_GROUPS', 
            data: newGroups 
          }, '*');
          setIsOrganizing(false);
          setStatusMessage('');
        } else {
          setStatusMessage(update.message || 'Organizing...');
        }
      });
    } catch (err) {
      console.error("AI Error:", err);
      setIsOrganizing(false);
      setStatusMessage('Request error');
    }
  };

  const performTabAction = (action: 'CLOSE' | 'FOCUS', tabId: string) => {
    window.postMessage({ 
      source: 'tabflow-page', 
      action: 'TAB_ACTION', 
      data: { action, tabId: parseInt(tabId) } 
    }, '*');
  };

  const filteredTabs = useMemo(() => {
    return tabs.filter(t => 
      t.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.url?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tabs, searchTerm]);

  const groupedTabIds = useMemo(() => {
    return new Set(groups.flatMap(g => g.tabIds));
  }, [groups]);

  const ungroupedTabs = useMemo(() => {
    return filteredTabs.filter(t => !groupedTabIds.has(t.id));
  }, [filteredTabs, groupedTabIds]);

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto selection:bg-blue-500/30">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 glass-panel p-6 rounded-3xl sticky top-4 z-50 ring-1 ring-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/20">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">TabFlow <span className="text-blue-400">AI</span></h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {connectionStatus === 'connected' ? 'Bridge Active' : 'Extension Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-80">
            <input 
              type="text" 
              placeholder="Search active tabs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/50 rounded-2xl py-3 px-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-slate-600 shadow-inner"
            />
            <svg className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button 
            onClick={connectionStatus === 'connected' ? handleOrganize : () => window.postMessage({ source: 'tabflow-page', action: 'GET_TABS' }, '*')}
            disabled={isOrganizing}
            className={`flex items-center gap-2 px-7 py-3 rounded-2xl font-bold transition-all shadow-xl active:scale-95 disabled:opacity-50 whitespace-nowrap
              ${connectionStatus === 'connected' 
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 ring-2 ring-blue-400/20' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 ring-1 ring-white/10'}`}
          >
            {isOrganizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="ml-2">Sorting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {connectionStatus === 'connected' ? 'Group with AI' : 'Sync Tabs'}
              </>
            )}
          </button>
        </div>
      </header>

      {statusMessage && (
        <div className={`glass-panel p-4 rounded-2xl flex items-center gap-3 animate-fade-in border ${statusMessage.startsWith('Failed') ? 'border-red-500/30 bg-red-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
          <div className={`w-2 h-2 rounded-full ${statusMessage.startsWith('Failed') ? 'bg-red-500' : 'bg-blue-400 animate-ping'}`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${statusMessage.startsWith('Failed') ? 'text-red-400' : 'text-blue-400'}`}>
            {statusMessage}
          </span>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groups.map((group) => (
                <div key={group.id} className="glass-panel rounded-3xl overflow-hidden flex flex-col border-white/5 shadow-xl transition-transform hover:scale-[1.01]">
                  <div 
                    className="p-5 flex items-center justify-between border-b border-white/5 bg-white/[0.02]"
                    style={{ borderTop: `6px solid ${group.color}` }}
                  >
                    <div>
                      <h3 className="font-bold text-white text-lg tracking-tight">{group.name}</h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic font-medium">{group.description}</p>
                    </div>
                    <span className="bg-white/5 text-slate-300 text-[10px] px-3 py-1.5 rounded-xl border border-white/10 font-bold uppercase tracking-wider">
                      {group.tabIds.length} Tabs
                    </span>
                  </div>
                  <div className="p-3 flex flex-col gap-1.5 max-h-[420px] overflow-y-auto custom-scrollbar">
                    {group.tabIds.map(tabId => {
                      const tab = tabs.find(t => t.id === tabId);
                      if (!tab) return null;
                      return <TabListItem key={tab.id} tab={tab} onFocus={() => performTabAction('FOCUS', tab.id)} onRemove={() => performTabAction('CLOSE', tab.id)} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 glass-panel rounded-[40px] border-dashed border-2 border-slate-800/80 bg-slate-900/20">
              <div className="w-24 h-24 bg-slate-800/30 rounded-[32px] flex items-center justify-center mb-8 text-slate-600 shadow-inner ring-1 ring-white/5">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 text-center px-4">Workspace Organizer</h2>
              <p className="text-slate-500 text-center max-w-sm px-6 text-sm leading-relaxed">
                Unlock higher productivity with Gemini 2.0. Categorize your messy tabs into AI-powered workspaces instantly.
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel rounded-[32px] p-7 flex flex-col border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-bold text-white text-xl flex items-center gap-3 tracking-tight">
                {ungroupedTabs.length === filteredTabs.length ? 'Tabs Stream' : 'Ungrouped'}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                  <span className="w-1 h-1 bg-blue-400 rounded-full animate-ping" />
                  <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Live</span>
                </div>
              </h2>
              <span className="text-[11px] bg-slate-800/80 text-slate-400 px-3 py-1.5 rounded-xl font-bold font-mono ring-1 ring-white/5">
                {ungroupedTabs.length}
              </span>
            </div>
            
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
              {ungroupedTabs.length > 0 ? (
                ungroupedTabs.map(tab => (
                  <TabListItem key={tab.id} tab={tab} onFocus={() => performTabAction('FOCUS', tab.id)} onRemove={() => performTabAction('CLOSE', tab.id)} />
                ))
              ) : (
                <div className="py-20 text-center text-slate-600 text-sm italic">
                  {searchTerm ? 'No results found' : 'All tabs are categorized!'}
                </div>
              )}
            </div>
          </div>

          {groundingSources.length > 0 && (
            <div className="glass-panel rounded-[32px] p-7 flex flex-col border-white/5 shadow-2xl animate-fade-in">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                 </svg>
                 AI Search Grounding
               </h3>
               <div className="flex flex-col gap-2">
                 {groundingSources.map((chunk, idx) => (
                   chunk.web && (
                     <a 
                       key={idx} 
                       href={chunk.web.uri} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-[10px] text-blue-400 hover:text-blue-300 underline truncate block font-medium"
                     >
                       {chunk.web.title || chunk.web.uri}
                     </a>
                   )
                 ))}
               </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-12 py-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-slate-500 text-[11px] gap-6">
        <div className="flex items-center gap-3">
          <span className="uppercase tracking-[0.2em] font-black text-slate-600">Model</span>
          <span className="text-blue-400 font-bold px-3 py-1 bg-blue-400/10 rounded-lg border border-blue-400/20 shadow-lg">Gemini 2.0 Flash Lite</span>
        </div>
        <div className="flex items-center gap-8 font-bold uppercase tracking-widest text-slate-400">
           <span>{tabs.length} Tabs Loaded</span>
           <span>{groups.length} Groups Created</span>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

interface TabListItemProps {
  tab: Tab;
  onRemove: () => void;
  onFocus: () => void;
}

const TabListItem: React.FC<TabListItemProps> = ({ tab, onRemove, onFocus }) => {
  return (
    <div className="group relative flex items-center gap-4 p-2.5 rounded-2xl hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/5 cursor-pointer" onClick={onFocus}>
      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
        {tab.favIconUrl ? (
          <img src={tab.favIconUrl} alt="" className="w-4 h-4 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-grow">
        <span className="text-[13px] font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{tab.title || 'Untitled'}</span>
        <span className="text-[9px] text-slate-500 truncate opacity-80">{tab.url ? new URL(tab.url).hostname : ''}</span>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default App;
