import React from 'react';
import { Upload, Settings, Zap, FileCode, Layout } from 'lucide-react';
import { AppSettings, DataRow } from '../types';
import { parseCSV } from '../services/dataProcessing';

interface UploadSectionProps {
  onDataLoaded: (data: DataRow[], fileName: string) => void;
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({ onDataLoaded, settings, setSettings }) => {
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const data = await parseCSV(file);
        onDataLoaded(data, file.name);
      } catch (err) {
        alert("Error parsing CSV");
      }
    }
  };

  return (
    <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-5xl mx-auto">
      {/* Landing Page Header & Value Prop */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">TidyPilot</h1>
        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
          Upload raw CSV. We find the mess so you don't have to.
        </p>

        {/* Benefit/Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 text-left">
          <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-100 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm">
                <Zap size={16} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-slate-700 text-sm">Detect issues fast</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed pl-1">
              Missing values, duplicates, type problems, messy categories.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-100 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm">
                <FileCode size={16} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-slate-700 text-sm">Get a cleaning plan</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed pl-1">
              Power Query + Excel formulas you can copy-paste.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-100 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm">
                <Layout size={16} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-slate-700 text-sm">Be BI-ready</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed pl-1">
              Star schema + KPI suggestions for Power BI.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div className="group border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:bg-slate-50 hover:border-indigo-400 transition-all duration-300 relative cursor-pointer mb-10">
        <input 
            type="file" 
            accept=".csv"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center pointer-events-none transition-transform group-hover:scale-105 duration-300">
            <div className="bg-indigo-50 p-4 rounded-full mb-5 group-hover:bg-indigo-100 transition-colors shadow-sm">
                <Upload className="w-10 h-10 text-indigo-600" />
            </div>
            <p className="text-xl font-bold text-slate-800">Drop your CSV file here</p>
            <p className="text-slate-400 mt-2 font-medium">or click to browse</p>
        </div>
      </div>

      {/* Settings Footer */}
      <div className="border-t border-slate-100 pt-8">
        <div className="flex items-center gap-2 mb-6">
            <Settings className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Analysis Settings</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors">
                <span className="text-sm font-semibold text-slate-700">Auto-clean data</span>
                <button 
                    onClick={() => setSettings({...settings, autoClean: !settings.autoClean})}
                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${settings.autoClean ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${settings.autoClean ? 'translate-x-5' : ''}`} />
                </button>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors">
                <span className="text-sm font-semibold text-slate-700">Strict Mode</span>
                <button 
                    onClick={() => setSettings({...settings, strictMode: !settings.strictMode})}
                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${settings.strictMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                     <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${settings.strictMode ? 'translate-x-5' : ''}`} />
                </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors">
                <div className="flex justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700">Outlier Sensitivity</span>
                    <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">{settings.outlierSensitivity}</span>
                </div>
                <input 
                    type="range" 
                    min="0" max="2" 
                    value={settings.outlierSensitivity === 'Low' ? 0 : settings.outlierSensitivity === 'Medium' ? 1 : 2}
                    onChange={(e) => {
                        const val = Number(e.target.value);
                        const levels: ('Low'|'Medium'|'High')[] = ['Low', 'Medium', 'High'];
                        setSettings({...settings, outlierSensitivity: levels[val]});
                    }}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
            </div>
        </div>
      </div>
    </div>
  );
};