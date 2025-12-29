
import React, { useState, useMemo } from 'react';
import { AnalysisResult, AnalysisTag, TranscriptExcerpt } from '../types';
// Added missing 'Layers' import from lucide-react to fix compilation error.
import { Clipboard, Share2, Search, Filter, X, ChevronDown, ChevronUp, Play, User, Database, Download, FileSpreadsheet, FileText, Info, Layers } from 'lucide-react';

interface AnalysisViewProps {
  result: AnalysisResult;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ result }) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'confusion' | 'disagreements' | 'questions' | 'videos'>('themes');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<AnalysisTag[]>([]);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const getTagColor = (tag: string) => {
    switch (tag) {
      case AnalysisTag.BEGINNER_CONFUSION: return 'bg-amber-100 text-amber-800 border-amber-200';
      case AnalysisTag.COMMON_MISTAKE: return 'bg-red-100 text-red-800 border-red-200';
      case AnalysisTag.WARNING_CAVEAT: return 'bg-orange-100 text-orange-800 border-orange-200';
      case AnalysisTag.REPEATED_CLAIM: return 'bg-blue-100 text-blue-800 border-blue-200';
      case AnalysisTag.OPINION_JUDGMENT: return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const copyToClipboard = () => {
    const text = JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(text);
    alert('Research data copied to clipboard as JSON');
  };

  const exportCSV = () => {
    const rows = [
      ['Type', 'Category', 'Description/Attempt', 'Excerpt', 'Creator', 'Tag']
    ];

    result.aggregatedThemes.forEach(t => {
      t.supportingExcerpts.forEach(e => {
        rows.push(['Theme', t.theme, t.description, e.text.replace(/"/g, '""'), e.creatorName, e.tag]);
      });
    });

    result.commonConfusionPoints.forEach(c => {
      c.supportingExcerpts.forEach(e => {
        rows.push(['Confusion', c.point, c.explanationAttempt, e.text.replace(/"/g, '""'), e.creatorName, e.tag]);
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `research_report_${result.topic.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const exportPDF = () => {
    setIsExportMenuOpen(false);
    window.print();
  };

  const toggleTag = (tag: AnalysisTag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleCreator = (creator: string) => {
    setSelectedCreators(prev => 
      prev.includes(creator) ? prev.filter(c => c !== creator) : [...prev, creator]
    );
  };

  const matchesSearch = (text: string) => {
    if (!searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  const allCreators = useMemo(() => {
    return Array.from(new Set(result.processedVideos.map(v => v.creator))).sort();
  }, [result.processedVideos]);

  const filteredThemes = useMemo(() => {
    return result.aggregatedThemes.map(theme => {
      const themeMetadataMatch = matchesSearch(theme.theme) || matchesSearch(theme.description);
      
      const filteredExcerpts = theme.supportingExcerpts.filter(ex => {
        const tagMatch = selectedTags.length === 0 || selectedTags.includes(ex.tag);
        const creatorMatch = selectedCreators.length === 0 || selectedCreators.includes(ex.creatorName);
        const excerptSearchMatch = matchesSearch(ex.text) || matchesSearch(ex.creatorName);
        return tagMatch && creatorMatch && (themeMetadataMatch || excerptSearchMatch);
      });

      if (filteredExcerpts.length > 0 || (themeMetadataMatch && selectedTags.length === 0 && selectedCreators.length === 0)) {
        return { ...theme, supportingExcerpts: filteredExcerpts };
      }
      return null;
    }).filter((t): t is NonNullable<typeof t> => t !== null);
  }, [result.aggregatedThemes, searchTerm, selectedTags, selectedCreators]);

  const filteredConfusion = useMemo(() => {
    return result.commonConfusionPoints.map(cp => {
      const pointMetadataMatch = matchesSearch(cp.point) || matchesSearch(cp.explanationAttempt);
      
      const filteredExcerpts = cp.supportingExcerpts.filter(ex => {
        const tagMatch = selectedTags.length === 0 || selectedTags.includes(ex.tag);
        const creatorMatch = selectedCreators.length === 0 || selectedCreators.includes(ex.creatorName);
        const excerptSearchMatch = matchesSearch(ex.text) || matchesSearch(ex.creatorName);
        return tagMatch && creatorMatch && (pointMetadataMatch || excerptSearchMatch);
      });

      if (filteredExcerpts.length > 0 || (pointMetadataMatch && selectedTags.length === 0 && selectedCreators.length === 0)) {
        return { ...cp, supportingExcerpts: filteredExcerpts };
      }
      return null;
    }).filter((cp): cp is NonNullable<typeof cp> => cp !== null);
  }, [result.commonConfusionPoints, searchTerm, selectedTags, selectedCreators]);

  const filteredVideos = useMemo(() => {
    return result.processedVideos.filter(v => 
      matchesSearch(v.title) || matchesSearch(v.creator) || matchesSearch(v.url)
    );
  }, [result.processedVideos, searchTerm]);

  const isAnyFilterActive = searchTerm !== '' || selectedTags.length > 0 || selectedCreators.length > 0;

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setSelectedCreators([]);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden font-sans print:shadow-none print:border-none">
      {/* Research Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white print:px-0">
        <div className="flex justify-between items-start mb-6 print:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black tracking-widest uppercase">Research Memo</span>
              {isAnyFilterActive && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px] font-black tracking-widest uppercase flex items-center gap-1 print:hidden">
                  <Filter className="w-2.5 h-2.5" />
                  Active Filters Applied
                </span>
              )}
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{result.topic}</h2>
          </div>
          <div className="flex gap-2 print:hidden relative">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button onClick={exportCSV} className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 border-b border-slate-100">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  Export as CSV
                </button>
                <button onClick={exportPDF} className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-red-500" />
                  Export as PDF
                </button>
                <button onClick={copyToClipboard} className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-600 hover:bg-slate-50">
                  <Clipboard className="w-4 h-4 text-indigo-500" />
                  Copy JSON
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
          <button 
            onClick={() => setActiveTab('videos')}
            className={`p-4 rounded-xl border transition-all text-left group print:border-slate-100 ${activeTab === 'videos' ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
          >
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400">Dataset Sample</p>
            <p className={`text-2xl font-black ${activeTab === 'videos' ? 'text-indigo-700' : 'text-slate-800'}`}>{result.datasetOverview.count} <span className="text-sm font-medium text-slate-500">Videos</span></p>
          </button>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 print:border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Source Fidelity</p>
            <p className="text-sm font-bold text-slate-800 truncate" title={result.datasetOverview.transcriptSources.join(', ')}>
              {result.datasetOverview.transcriptSources.join(', ') || 'Mixed Transcripts'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 print:border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Creators Analyzed</p>
            <div className="flex -space-x-2 mt-1">
               {result.processedVideos.slice(0, 5).map((v, i) => (
                 <div key={i} className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600" title={v.creator}>
                   {v.creator[0]}
                 </div>
               ))}
               {result.processedVideos.length > 5 && (
                 <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                   +{result.processedVideos.length - 5}
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Analytical Tabs & Filter Bar */}
      <div className="bg-slate-50/50 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm print:hidden">
        <div className="flex px-8 overflow-x-auto whitespace-nowrap scrollbar-hide border-b border-slate-100 bg-white/80">
          <button onClick={() => setActiveTab('themes')} className={`py-4 px-5 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'themes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Aggregated Themes</button>
          <button onClick={() => setActiveTab('confusion')} className={`py-4 px-5 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'confusion' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Confusion Points</button>
          <button onClick={() => setActiveTab('disagreements')} className={`py-4 px-5 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'disagreements' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Disagreements</button>
          <button onClick={() => setActiveTab('questions')} className={`py-4 px-5 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'questions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Implied Questions</button>
          <button onClick={() => setActiveTab('videos')} className={`py-4 px-5 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'videos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Source Videos</button>
        </div>

        <div className="px-8 py-3 bg-white flex flex-col gap-3 transition-all border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Filter by keyword or creator...`}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-black uppercase tracking-widest transition-all shadow-sm ${isFilterExpanded || selectedTags.length > 0 || selectedCreators.length > 0 ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters {(selectedTags.length + selectedCreators.length) > 0 && `(${(selectedTags.length + selectedCreators.length)})`}</span>
                {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              
              {isAnyFilterActive && (
                <button 
                  onClick={resetFilters}
                  className="px-4 py-2.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {isFilterExpanded && (
            <div className="flex flex-col gap-4 py-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200 bg-slate-50/50 -mx-8 px-8">
              {(activeTab === 'themes' || activeTab === 'confusion') && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Layers className="w-3 h-3" />
                    Classification Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(AnalysisTag).map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                          selectedTags.includes(tag)
                          ? getTagColor(tag) + ' shadow-md scale-105 border-transparent'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {tag.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3 h-3" />
                  Creator Consensus Filter
                </p>
                <div className="flex flex-wrap gap-2">
                  {allCreators.map(creator => (
                    <button
                      key={creator}
                      onClick={() => toggleCreator(creator)}
                      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                        selectedCreators.includes(creator)
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-105'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {creator}
                    </button>
                  ))}
                </div>
              </div>

              {isAnyFilterActive && (
                <div className="flex items-center gap-4 text-[10px] font-black uppercase pt-2 border-t border-slate-100">
                  <span className="text-slate-400 italic">Filters active: {selectedTags.length} tags, {selectedCreators.length} creators</span>
                  <button onClick={resetFilters} className="text-indigo-600 hover:underline">Clear all</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Result Container */}
      <div className="flex-1 overflow-y-auto p-8 bg-white print:overflow-visible print:p-0">
        <div className="print:block hidden mb-10">
           <h2 className="text-2xl font-black uppercase tracking-widest text-slate-900 border-b-4 border-slate-900 pb-2 mb-8">Full Analytical Report</h2>
        </div>

        {activeTab === 'themes' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Section: Aggregated Themes</h3>
              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Showing {filteredThemes.length} matches</span>
            </div>
            {filteredThemes.length > 0 ? filteredThemes.map((theme, idx) => (
              <div key={idx} className="relative pl-8 border-l-2 border-slate-100 animate-in fade-in slide-in-from-left-2 duration-300 print:break-inside-avoid print:pl-6 print:border-slate-200" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white print:hidden"></div>
                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight print:text-lg">{theme.theme}</h3>
                <p className="text-slate-600 mb-6 leading-relaxed max-w-3xl whitespace-pre-wrap print:text-sm print:mb-4">{theme.description}</p>
                
                <div className="grid grid-cols-1 gap-4">
                  {theme.supportingExcerpts.map((excerpt, eIdx) => (
                    <div key={eIdx} className="p-5 bg-slate-50/50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-all print:bg-white print:p-4 shadow-sm hover:shadow-md">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                           <User className="w-3 h-3 text-indigo-400" />
                           <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{excerpt.creatorName}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${getTagColor(excerpt.tag)} print:bg-transparent print:border-slate-200`}>{excerpt.tag.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm text-slate-700 italic font-medium leading-relaxed whitespace-pre-wrap">"{excerpt.text}"</p>
                    </div>
                  ))}
                  {theme.supportingExcerpts.length === 0 && isAnyFilterActive && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center gap-3">
                      <Info className="w-4 h-4 text-slate-400" />
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Theme metadata matches search, but excerpts do not meet current tag/creator criteria.</p>
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div className="py-32 text-center flex flex-col items-center gap-6 animate-in fade-in slide-in-from-top-4">
                <div className="bg-slate-50 p-8 rounded-full">
                  <Search className="w-16 h-16 text-slate-200" />
                </div>
                <div className="space-y-2">
                  <p className="text-slate-400 font-black uppercase tracking-widest text-lg">No matches found</p>
                  <p className="text-slate-400 max-w-xs mx-auto text-sm font-medium">Refine your keyword search or adjust creator/tag filters to broaden results.</p>
                </div>
                <button onClick={resetFilters} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 active:scale-95 transition-all">Clear All Filters</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'confusion' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Section: Confusion Points</h3>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Showing {filteredConfusion.length} matches</span>
            </div>
            {filteredConfusion.length > 0 ? filteredConfusion.map((cp, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-amber-50/30 border border-amber-100 animate-in fade-in slide-in-from-bottom-2 duration-300 print:break-inside-avoid print:bg-white print:border-slate-200" style={{ animationDelay: `${idx * 50}ms` }}>
                <h3 className="text-lg font-black text-amber-900 mb-3 uppercase tracking-tight flex items-center gap-3 print:text-slate-900">
                  <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-sm print:hidden shadow-sm">!</span>
                  {cp.point}
                </h3>
                <div className="mb-6 p-4 bg-white rounded-xl border border-amber-100 text-sm text-slate-700 leading-relaxed shadow-sm print:shadow-none print:border-slate-100 whitespace-pre-wrap">
                  <span className="font-black text-[10px] uppercase text-amber-600 block mb-1 print:text-slate-400">Explanation Strategy:</span>
                  {cp.explanationAttempt}
                </div>
                <div className="space-y-3">
                  {cp.supportingExcerpts.map((ex, ei) => (
                    <div key={ei} className="text-xs text-slate-500 italic pl-4 border-l-2 border-amber-200 py-1 print:border-slate-100 whitespace-pre-wrap">
                      "{ex.text}" — <span className="font-bold uppercase text-[9px]">{ex.creatorName}</span>
                    </div>
                  ))}
                  {cp.supportingExcerpts.length === 0 && isAnyFilterActive && (
                    <p className="text-[9px] text-amber-500/50 font-black uppercase italic pl-4">Metadata match / No excerpts matching creator/tag filters.</p>
                  )}
                </div>
              </div>
            )) : (
              <div className="py-32 text-center flex flex-col items-center gap-6 animate-in fade-in slide-in-from-top-4">
                 <div className="bg-amber-50/50 p-8 rounded-full">
                  <Filter className="w-16 h-16 text-amber-200" />
                </div>
                <div className="space-y-2">
                  <p className="text-amber-600/50 font-black uppercase tracking-widest text-lg">No confusion signals found</p>
                  <button onClick={resetFilters} className="text-indigo-600 font-black text-xs uppercase hover:underline">Reset Filters</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'disagreements' && (
          <div className="space-y-8">
             <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Section: Disagreements</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.disagreements.map((dis, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 transition-all animate-in fade-in zoom-in duration-300 print:break-inside-avoid shadow-sm" style={{ animationDelay: `${idx * 50}ms` }}>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">{dis.topic}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{dis.variations}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Section: Implied Questions</h3>
            </div>
            <div className="space-y-6">
              {result.impliedQuestions.map((q, idx) => (
                <div key={idx} className="group p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl transition-all animate-in slide-in-from-right-2 duration-300 print:break-inside-avoid print:bg-white print:border-slate-200" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-600 shrink-0 font-black print:hidden">?</div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 mb-2 leading-tight">{q.question}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed italic border-l-2 border-slate-200 pl-4 mt-4 print:border-slate-100 whitespace-pre-wrap">
                        <span className="font-black text-[10px] uppercase block mb-1 text-slate-400 not-italic">Synthesis Evidence:</span>
                        {q.evidence}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Section: Evidence Base</h3>
               <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Total: {filteredVideos.length} Videos</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {filteredVideos.map((video, idx) => (
                <div 
                  key={idx} 
                  className="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-600 hover:shadow-md transition-all group flex items-center gap-4 print:break-inside-avoid print:py-2"
                >
                  <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-all print:hidden">
                    <Play className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-700">{video.title}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="flex items-center gap-1 font-bold text-indigo-600/80"><User className="w-3 h-3" /> {video.creator}</span>
                      <span className="opacity-30">|</span>
                      <span className="opacity-50 text-[10px] truncate">{video.url}</span>
                    </p>
                  </div>
                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 transition-all print:hidden">
                    <Share2 className="w-4 h-4" />
                  </a>
                </div>
              ))}
              {filteredVideos.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-slate-400 font-bold italic">No videos match your current search.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Memo Footer Sources */}
      <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-4 items-center print:hidden">
        <div className="flex items-center gap-2">
          <Database className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grounding Web Sources:</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {result.sources.length > 0 ? result.sources.map((s, i) => (
            <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-indigo-200"></span>
              {s.title}
            </a>
          )) : <span className="text-[10px] font-medium text-slate-400 italic">No external grounding required.</span>}
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            margin: 20mm;
            size: A4;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #root > div > nav,
          #root > div > main > div:nth-child(1),
          #root > div > main > div:nth-child(2),
          #root > div > footer,
          .xl\\:w-80 {
            display: none !important;
          }
          #root > div > main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
          #root > div > main > div:last-child {
            display: block !important;
          }
          .flex-1 {
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AnalysisView;
