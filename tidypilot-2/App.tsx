import React, { useState } from 'react';
import { UploadSection } from './components/UploadSection';
import { Dashboard } from './components/Dashboard';
import { CleaningPlanDisplay } from './components/CleaningPlanDisplay';
import { AskTidyPilot } from './components/AskTidyPilot';
import { analyzeDataset, performAutoClean } from './services/dataProcessing';
import { generateCleaningPlan } from './services/geminiService';
import { DataRow, AppSettings, DatasetStats, CleaningPlan } from './types';
import { Play, Sparkles } from 'lucide-react';



const App: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [rawData, setRawData] = useState<DataRow[]>([]);
  const [cleanedData, setCleanedData] = useState<DataRow[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [settings, setSettings] = useState<AppSettings>({
    autoClean: false,
    strictMode: false,
    outlierSensitivity: 'Medium'
  });
  
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [cleaningPlan, setCleaningPlan] = useState<CleaningPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleDataLoaded = (data: DataRow[], name: string) => {
    setRawData(data);
    setFileName(name);
  };

  const runAnalysis = async () => {
    if (rawData.length === 0) return;

    // 1. Analyze Raw
    const rawStats = analyzeDataset(rawData, settings);
    setStats(rawStats);
    setStep(2);

    // 2. Auto-Clean (if enabled)
    let processedData = rawData;
    if (settings.autoClean) {
        processedData = performAutoClean(rawData, rawStats);
        setCleanedData(processedData);
    } else {
        setCleanedData(null);
    }

    // 3. Generate Plan via Gemini
    setLoadingPlan(true);
    try {
        const plan = await generateCleaningPlan(rawStats);
        setCleaningPlan(plan);
    } catch (e) {
        console.error("Plan generation failed", e);
    } finally {
        setLoadingPlan(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
                src="https://i.postimg.cc/1Xj5f9RC/Gemini-Generated-Image-cegydwcegydwcegy-2.png" 
                alt="TidyPilot Logo" 
                className="h-12 w-auto object-contain"
            />
            <span className="text-xl font-bold text-slate-800 tracking-tight">TidyPilot</span>
          </div>
          
          <div className="flex items-center gap-4">
            {step > 1 && (
              <>
                 <button 
                    onClick={() => setIsChatOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors border border-indigo-100"
                 >
                    <Sparkles size={16} />
                    <span className="hidden md:inline">Ask TidyPilot</span>
                 </button>
                 <div className="h-6 w-px bg-slate-200 mx-1"></div>
                 <button 
                    onClick={() => { setStep(1); setRawData([]); setStats(null); setCleaningPlan(null); }}
                    className="text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                 >
                    Start Over
                 </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-10 animate-fade-in-up">
            <UploadSection 
                onDataLoaded={handleDataLoaded} 
                settings={settings}
                setSettings={setSettings}
            />
            {rawData.length > 0 && (
                <div className="flex flex-col items-center animate-fade-in">
                    <div className="bg-indigo-50 text-indigo-700 px-5 py-2 rounded-full text-sm font-semibold mb-6 border border-indigo-100 shadow-sm">
                        {rawData.length.toLocaleString()} rows loaded from <span className="text-indigo-900">{fileName}</span>
                    </div>
                    <button 
                        onClick={runAnalysis}
                        className="group relative inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-white transition-all duration-300 bg-indigo-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-600/20 hover:bg-indigo-700 shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transform hover:-translate-y-1"
                    >
                        Analyze Data
                        <Play className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    {/* Preview Table */}
                    <div className="mt-12 w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 shadow-lg bg-white">
                        <div className="bg-slate-50/80 px-6 py-3 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider backdrop-blur">
                            Data Preview (First 5 Rows)
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {rawData.slice(0, 5).map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            {Object.values(row).map((val, j) => (
                                                <td key={j} className="px-6 py-3 whitespace-nowrap text-sm text-slate-600 font-medium">
                                                    {String(val).substring(0, 50)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}

        {/* Step 2: Dashboard & Plan */}
        {step === 2 && stats && (
          <div className="space-y-12">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                 <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Data Quality Report</h2>
                    <p className="text-slate-500 mt-1 text-lg">Analysis complete for {fileName}</p>
                 </div>
             </div>

             <Dashboard stats={stats} fileName={fileName} />

             <div className="border-t border-slate-200 pt-12">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Cleaning Plan</h2>
                    <p className="text-slate-500 mt-1">AI-generated strategy to clean and model your data</p>
                </div>
                <CleaningPlanDisplay 
                    plan={cleaningPlan} 
                    loading={loadingPlan} 
                    cleanedData={cleanedData || undefined}
                    fileName={fileName}
                />
             </div>
          </div>
        )}
      </main>

      {/* Persistent Chat Drawer */}
      <AskTidyPilot 
        stats={stats} 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </div>
  );
};

export default App;