
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Search, Loader2, BookOpen, Layers, Info, History, AlertCircle, FileSearch, Link, CheckCircle2, XCircle, StopCircle, Terminal, Cpu, Database, ChevronDown, List, FileText, Zap, AtSign, User } from 'lucide-react';
import { analyzeTopic } from './services/geminiService';
import { AppState, OutputFormat } from './types';
import AnalysisView from './components/AnalysisView';

const YT_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
const YT_HANDLE_REGEX = /^@[\w.-]+$/;

const LOADING_STAGES = [
  { message: "Initiating research protocol...", icon: Terminal },
  { message: "Accessing YouTube transcript database...", icon: Database },
  { message: "Normalizing text and removing artifacts...", icon: Layers },
  { message: "Identifying cross-creator patterns...", icon: Cpu },
  { message: "Synthesizing analytical findings...", icon: Info },
];

interface ValidatedInput {
  type: 'none' | 'url' | 'username' | 'topic';
  items: Array<{ text: string; isValid: boolean }>;
  allValid: boolean;
}

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState<OutputFormat>('detailed');
  const [loadingStage, setLoadingStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef<boolean>(false);
  
  const [state, setState] = useState<AppState>({
    isSearching: false,
    result: null,
    error: null,
    searchHistory: []
  });

  const parsedAnalysisInput = useMemo((): ValidatedInput => {
    if (!query.trim()) return { type: 'none', items: [], allValid: true };
    
    const rawParts = query.split(',').map(p => p.trim()).filter(p => p.length > 0);
    
    // Check if any part looks like a URL
    const isUrlMode = rawParts.some(p => YT_URL_REGEX.test(p) || p.includes('youtube.com') || p.includes('youtu.be'));
    
    if (isUrlMode) {
      const validated = rawParts.map(p => ({
        text: p,
        isValid: YT_URL_REGEX.test(p)
      }));
      return { 
        type: 'url', 
        items: validated, 
        allValid: validated.every(v => v.isValid)
      };
    }

    // Check if single part is a handle
    if (rawParts.length === 1 && YT_HANDLE_REGEX.test(rawParts[0])) {
      return { 
        type: 'username', 
        items: [{ text: rawParts[0], isValid: true }], 
        allValid: true 
      };
    }
    
    // Default to topic
    return { 
      type: 'topic', 
      items: [{ text: query, isValid: true }], 
      allValid: true 
    };
  }, [query]);

  // Simulated progress during long-running LLM call
  useEffect(() => {
    let interval: number;
    if (state.isSearching) {
      setProgress(0);
      setLoadingStage(0);
      interval = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          const increment = Math.random() * 5;
          return Math.min(prev + increment, 95);
        });
        setLoadingStage(prev => (prev + 1) % LOADING_STAGES.length);
      }, 3000);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [state.isSearching]);

  const handleStop = useCallback(() => {
    cancelRef.current = true;
    setState(prev => ({ ...prev, isSearching: false }));
  }, []);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    if (!parsedAnalysisInput.allValid) return;

    cancelRef.current = false;
    setState(prev => ({ 
      ...prev, 
      isSearching: true, 
      error: null,
      searchHistory: [query, ...prev.searchHistory.filter(h => h !== query).slice(0, 9)]
    }));

    try {
      const result = await analyzeTopic(query, format);
      
      if (cancelRef.current) {
        console.log("Analysis cancelled by user.");
        return;
      }

      setState(prev => ({ ...prev, isSearching: false, result }));
    } catch (err) {
      if (cancelRef.current) return;
      console.error(err);
      setState(prev => ({ 
        ...prev, 
        isSearching: false, 
        error: "Failed to perform analysis. Ensure valid YouTube links, a valid handle (@username), or a specific enough topic query." 
      }));
    }
  }, [query, parsedAnalysisInput, format]);

  const useHistoryItem = (item: string) => {
    setQuery(item);
    setTimeout(() => {
       const btn = document.getElementById('search-button');
       btn?.click();
    }, 50);
  };

  const CurrentStageIcon = LOADING_STAGES[loadingStage].icon;

  const formatOptions: { value: OutputFormat; label: string; icon: any }[] = [
    { value: 'detailed', label: 'Detailed JSON', icon: FileText },
    { value: 'bulleted', label: 'Bulleted Themes', icon: List },
    { value: 'summary', label: 'Executive Summary', icon: Zap },
  ];

  const getSearchIcon = () => {
    switch (parsedAnalysisInput.type) {
      case 'url': return <Link className="w-5 h-5" />;
      case 'username': return <AtSign className="w-5 h-5 text-indigo-500" />;
      default: return <Search className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <nav className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg">
              <FileSearch className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Transcript Agent</h1>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] leading-none">Research Compiler Protocol v3.1</p>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-2 hover:text-slate-600 transition-colors cursor-help group relative">
              <Layers className="w-4 h-4" />
              <span>Cross-Video Synthesis</span>
            </div>
            <div className="flex items-center gap-2 hover:text-slate-600 transition-colors cursor-help group relative">
              <Info className="w-4 h-4" />
              <span>Signal Extraction</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto w-full flex-1 p-6 lg:p-12 flex flex-col gap-10">
        <div className="flex flex-col gap-8 max-w-4xl">
          <div className="space-y-2">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Dataset Aggregator</h2>
            <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-2xl">
              Enter a topic, a YouTube handle (e.g., <span className="text-indigo-600 font-bold">@creator</span>), or comma-separated URLs.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
                  {getSearchIcon()}
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Topic, @username, or video URLs (comma-separated)..."
                  className={`w-full bg-white border-2 rounded-xl py-5 pl-12 pr-4 shadow-sm outline-none transition-all text-slate-900 placeholder:text-slate-400 font-bold ${
                    !parsedAnalysisInput.allValid 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-slate-200 focus:border-slate-900'
                  }`}
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <div className="relative flex items-center bg-white border-2 border-slate-200 rounded-xl px-4 py-3 sm:py-0 shadow-sm hover:border-slate-900 transition-all cursor-pointer group">
                  {(() => {
                    const SelectedIcon = formatOptions.find(o => o.value === format)?.icon || FileText;
                    return <SelectedIcon className="w-4 h-4 text-slate-400 mr-2 group-hover:text-indigo-600" />;
                  })()}
                  <select 
                    value={format} 
                    onChange={(e) => setFormat(e.target.value as OutputFormat)}
                    className="appearance-none bg-transparent pr-6 text-xs font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer"
                  >
                    {formatOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  id="search-button"
                  type="submit"
                  disabled={state.isSearching || !parsedAnalysisInput.allValid || query.trim().length === 0}
                  className="bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white px-8 py-5 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0"
                >
                  {state.isSearching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analyzing</span>
                    </>
                  ) : (
                    <>
                      <span>Compile Research</span>
                    </>
                  )}
                </button>

                {state.isSearching && (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-6 py-5 rounded-xl font-black uppercase tracking-widest border-2 border-red-200 transition-all flex items-center justify-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300 shadow-lg shadow-red-100/50"
                  >
                    <StopCircle className="w-5 h-5" />
                    <span>Stop</span>
                  </button>
                )}
              </div>
            </form>

            {/* Enhanced Validation Feedback */}
            <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-200 min-h-[36px]">
              {parsedAnalysisInput.type === 'url' && parsedAnalysisInput.items.map((item, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all animate-in zoom-in duration-200 ${
                    item.isValid 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-red-50 text-red-700 border-red-200 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                  }`}
                >
                  {item.isValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span className="truncate max-w-[200px]">{item.text}</span>
                </div>
              ))}
              
              {parsedAnalysisInput.type === 'username' && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border bg-indigo-50 text-indigo-700 border-indigo-200 animate-in zoom-in duration-200">
                  <User className="w-3.5 h-3.5" />
                  <span>Target Creator Profile: {parsedAnalysisInput.items[0].text}</span>
                </div>
              )}

              {parsedAnalysisInput.type === 'topic' && query.trim().length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-200 animate-in zoom-in duration-200">
                  <Search className="w-3.5 h-3.5" />
                  <span>Topic Search Discovery Mode</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-10 flex-1">
          <div className="w-full xl:w-80 shrink-0 flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Logs</h3>
              </div>
              {state.searchHistory.length > 0 ? (
                <div className="space-y-1">
                  {state.searchHistory.map((h, i) => (
                    <button 
                      key={i} 
                      onClick={() => useHistoryItem(h)}
                      className="w-full text-left p-3 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 truncate"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic font-medium">No previous research sessions.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Agent Constraints</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-indigo-600 uppercase">Fidelity</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">System prioritizes official transcripts to maintain source accuracy.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-indigo-600 uppercase">Input Validation</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">All URLs in comma-separated list must be valid for protocol initiation.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-indigo-600 uppercase">Aggregation</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">Primary goal is detecting patterns across multiple creators or deep-diving one.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[700px] flex flex-col">
            {state.isSearching ? (
              <div className="flex-1 bg-white rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col items-center justify-center p-8 lg:p-12 text-center overflow-hidden relative">
                <div className="w-full max-w-lg space-y-10 animate-in fade-in zoom-in duration-500">
                  <div className="relative mx-auto w-32 h-32">
                    <div className="absolute inset-0 bg-slate-900 rounded-3xl rotate-6 animate-pulse"></div>
                    <div className="absolute inset-0 bg-indigo-600 rounded-3xl -rotate-3 opacity-20 animate-pulse delay-75"></div>
                    <div className="relative w-full h-full bg-slate-900 rounded-3xl flex items-center justify-center border border-slate-700 shadow-2xl">
                      <CurrentStageIcon className="w-12 h-12 text-white animate-bounce" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Research in Progress</h3>
                    <p className="text-slate-500 font-medium h-6">{LOADING_STAGES[loadingStage].message}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className="h-full bg-slate-900 transition-all duration-500 ease-out relative"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Analyzing Datasets</span>
                      <span>{Math.round(progress)}% Complete</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleStop}
                    className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all font-black uppercase tracking-widest text-xs"
                  >
                    <StopCircle className="w-4 h-4" />
                    Stop Research Session
                  </button>
                </div>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 opacity-30 grayscale pointer-events-none">
                  <Terminal className="w-5 h-5" />
                  <Database className="w-5 h-5" />
                  <Layers className="w-5 h-5" />
                  <Cpu className="w-5 h-5" />
                </div>
              </div>
            ) : state.error ? (
              <div className="flex-1 bg-white rounded-2xl border-2 border-red-100 shadow-sm flex flex-col items-center justify-center p-12 text-center">
                <div className="bg-red-50 p-6 rounded-full mb-6">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Protocol Interrupted</h3>
                <p className="text-slate-500 max-w-md font-medium">{state.error}</p>
                <button 
                  onClick={() => handleSearch()}
                  className="mt-8 px-10 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  Retry Session
                </button>
              </div>
            ) : state.result ? (
              <AnalysisView result={state.result} />
            ) : (
              <div className="flex-1 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm flex flex-col items-center justify-center p-12 text-center group cursor-pointer hover:border-indigo-300 transition-all">
                <div className="bg-slate-50 p-8 rounded-full mb-8 group-hover:bg-indigo-50 transition-all">
                  <BookOpen className="w-16 h-16 text-slate-300 group-hover:text-indigo-400 transition-all" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Ready for Input</h3>
                <p className="text-slate-500 max-w-sm font-medium">
                  Provide a topic, creator handle, or list of video URLs to initiate the transcript analytical protocol.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-10 px-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Source Fidelity Optimized</span>
            <span className="text-slate-200">|</span>
            <span>Zero Hallucination Protocol</span>
            <span className="text-slate-200">|</span>
            <span>Research Compiler 2024</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;
