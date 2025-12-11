import React from 'react';
import { CleaningPlan, DataRow } from '../types';
import { Download, RefreshCw, CheckCircle, Database, FileSpreadsheet, AlertTriangle, LayoutTemplate, Activity, Code } from 'lucide-react';
import Papa from 'papaparse';

interface CleaningPlanDisplayProps {
  plan: CleaningPlan | null;
  loading: boolean;
  cleanedData?: DataRow[];
  fileName: string;
}

export const CleaningPlanDisplay: React.FC<CleaningPlanDisplayProps> = ({ plan, loading, cleanedData, fileName }) => {
  if (loading) {
    return (
      <div className="bg-white p-16 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center animate-pulse">
        <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
        <h3 className="text-xl font-bold text-slate-800">Generating Portfolio-Grade Plan...</h3>
        <p className="text-slate-500 mt-2 max-w-md">Our AI is analyzing {fileName} to build your step-by-step cleaning strategy and BI model.</p>
      </div>
    );
  }

  if (!plan) return null;

  const downloadCSV = () => {
    if (!cleanedData) return;
    const csv = Papa.unparse(cleanedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `cleaned_${fileName}`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Download Section */}
      {cleanedData && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 mt-1">
                    <CheckCircle size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-emerald-900">Auto-Clean Applied</h3>
                    <p className="text-emerald-700/80 text-sm mt-1 max-w-xl">
                        We automatically normalized text, trimmed whitespace, removed exact duplicates, and fixed basic type issues based on your settings.
                    </p>
                </div>
            </div>
            <button 
                onClick={downloadCSV}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5"
            >
                <Download size={18} /> Download CSV
            </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Timeline */}
        <div className="lg:col-span-2 space-y-10">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6">
                    <span className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-md shadow-indigo-200">1</span>
                    Cleaning Steps
                </h3>
                
                <div className="space-y-8 relative before:absolute before:left-4 before:top-4 before:h-[calc(100%-2rem)] before:w-0.5 before:bg-slate-200">
                    {plan.steps.map((step, idx) => (
                        <div key={idx} className="relative pl-14">
                            {/* Number Badge */}
                            <div className="absolute left-0 top-0 bg-white text-indigo-600 border-[3px] border-indigo-100 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm z-10">
                                {step.stepNumber}
                            </div>
                            
                            {/* Step Card */}
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                                <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                    <h4 className="font-bold text-slate-800 text-lg">{step.title}</h4>
                                    <span className="text-xs font-semibold text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">
                                        Step {step.stepNumber}
                                    </span>
                                </div>
                                
                                <div className="p-6 space-y-5">
                                    {/* Action & Why */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Action</span>
                                            <p className="text-sm text-slate-800 font-medium leading-relaxed">{step.action}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Rationale</span>
                                            <p className="text-sm text-slate-600 leading-relaxed">{step.reason}</p>
                                        </div>
                                    </div>

                                    {/* Technical Specs */}
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                                        <div className="flex gap-3 items-start">
                                            <Database className="w-4 h-4 text-indigo-500 mt-1 shrink-0" />
                                            <div className="w-full">
                                                <span className="text-[10px] font-bold text-indigo-700 block uppercase mb-1">Power Query</span>
                                                <code className="text-xs text-indigo-900 font-mono block bg-indigo-50/50 p-1.5 rounded border border-indigo-100/50">{step.powerQuery}</code>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                                            <div className="w-full">
                                                <span className="text-[10px] font-bold text-emerald-700 block uppercase mb-1">Excel</span>
                                                <code className="text-xs text-emerald-900 font-mono block bg-emerald-50/50 p-1.5 rounded border border-emerald-100/50">{step.excel}</code>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Risk Badge */}
                                    <div className="flex gap-2 items-start text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-100/50">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span><span className="font-bold">Risk Note:</span> {step.risk}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* BI Modeling Section */}
            <div className="pt-8">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6">
                    <span className="bg-purple-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-md shadow-purple-200">2</span>
                    BI Modeling Suggestions
                </h3>
                
                {plan.biModeling ? (
                <div className="space-y-6">
                    {/* Schema Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <LayoutTemplate size={16} /> Dimensional Model
                                </h4>
                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <span className="block text-xs font-bold text-indigo-600 mb-2 uppercase">Fact Table Measures</span>
                                        <div className="flex flex-wrap gap-2">
                                            {plan.biModeling.factMeasures.length > 0 ? (
                                                plan.biModeling.factMeasures.map((m, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-bold shadow-sm">{m}</span>
                                                ))
                                            ) : <span className="text-xs text-slate-400">None detected</span>}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <span className="block text-xs font-bold text-purple-600 mb-2 uppercase">Dimensions</span>
                                        <div className="flex flex-wrap gap-2">
                                            {plan.biModeling.dimensions.length > 0 ? (
                                                plan.biModeling.dimensions.map((d, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-bold shadow-sm">{d}</span>
                                                ))
                                            ) : <span className="text-xs text-slate-400">None detected</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-900 rounded-xl p-5 font-mono text-xs text-slate-300 overflow-x-auto shadow-inner border border-slate-800 relative group">
                                <div className="absolute top-2 right-2 text-slate-600 group-hover:text-slate-500 transition-colors">
                                    <Code size={16} />
                                </div>
                                <h5 className="text-slate-500 font-bold mb-3 border-b border-slate-800 pb-2">Star Schema Logic</h5>
                                <pre className="whitespace-pre-wrap leading-relaxed">{plan.biModeling.starSchema}</pre>
                            </div>
                         </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plan.biModeling.kpis.map((kpi, idx) => (
                            <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col hover:border-purple-300 transition-colors group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="bg-purple-50 p-2 rounded-lg text-purple-600 group-hover:scale-110 transition-transform">
                                        <Activity size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded">KPI {idx + 1}</span>
                                </div>
                                <h5 className="font-bold text-slate-800 mb-2">{kpi.name}</h5>
                                <p className="text-xs text-slate-500 mb-4 flex-grow leading-relaxed">{kpi.description}</p>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                    <code className="text-[10px] text-slate-600 font-mono block break-all">{kpi.dax}</code>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                ) : (
                    <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-slate-100">Modeling suggestions unavailable.</div>
                )}
            </div>
        </div>

        {/* Right Column: Scripts */}
        <div className="space-y-10">
            {/* M-Code */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6">
                    <span className="bg-amber-500 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-md shadow-amber-200">3</span>
                    Power Query (M) Script
                </h3>
                <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg shadow-slate-200">
                    <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-mono font-medium">Advanced Editor</span>
                        <div className="flex gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                        </div>
                    </div>
                    <div className="p-5 overflow-x-auto custom-scrollbar max-h-[500px]">
                        <pre className="text-slate-300 text-xs font-mono leading-relaxed">
{plan.powerQuerySteps.join('\n')}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Excel Formulas */}
            <div>
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6">
                    <span className="bg-emerald-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-md shadow-emerald-200">4</span>
                    Excel Formula Cheat Sheet
                </h3>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        {plan.excelFormulas.map((item, idx) => (
                            <div key={idx} className="p-5 hover:bg-slate-50 transition-colors">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{item.issue}</div>
                                <div className="bg-emerald-50 text-emerald-800 text-xs font-mono px-4 py-3 rounded-lg border border-emerald-100 select-all font-medium">
                                    {item.formula}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};