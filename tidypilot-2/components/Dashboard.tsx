import React from 'react';
import { DatasetStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { AlertTriangle, CheckCircle, Database, FileX, BarChart3, Activity } from 'lucide-react';

interface DashboardProps {
  stats: DatasetStats;
  fileName: string;
}

const truncateLabel = (value: string, maxLength: number = 15) => {
  if (value.length <= maxLength) return value;
  return `${value.substring(0, maxLength)}...`;
};

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-8} y={4} textAnchor="end" fill="#64748b" fontSize={11} fontWeight={500}>
        <title>{payload.value}</title>
        {truncateLabel(payload.value)}
      </text>
    </g>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ stats, fileName }) => {
  const missingData = stats.columns
    .filter(c => c.missingCount > 0)
    .map(c => ({ name: c.name, missing: c.missingCount }))
    .sort((a, b) => b.missing - a.missing);

  const totalCells = stats.rowCount * stats.columnCount;
  const qualityScore = Math.max(0, 100 - ((stats.totalMissingCells + (stats.duplicateRows * stats.columnCount)) / totalCells) * 100).toFixed(1);

  // State for toggles
  const [showLowConfidence, setShowLowConfidence] = React.useState(false);
  const [showAnomalies, setShowAnomalies] = React.useState(false);

  return (
    <div className="space-y-8 w-full animate-fade-in">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Database size={20} /></div>
                <span className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Dimension</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">{stats.rowCount.toLocaleString()} <span className="text-slate-400 text-lg font-normal">rows</span></div>
            <div className="text-sm text-slate-400 mt-1 font-medium">{stats.columnCount} columns</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(239,68,68,0.1)] border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><FileX size={20} /></div>
                <span className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Missing Data</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">{stats.totalMissingCells.toLocaleString()}</div>
            <div className="text-sm text-rose-500 mt-1 font-medium">
                {((stats.totalMissingCells / totalCells) * 100).toFixed(2)}% of cells empty
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(234,179,8,0.1)] border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle size={20} /></div>
                <span className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Duplicates</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">{stats.duplicateRows}</div>
             <div className="text-sm text-amber-500 mt-1 font-medium">
                {stats.duplicateRows > 0 ? "Exact row matches" : "No duplicates"}
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(34,197,94,0.1)] border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl"><Activity size={20} /></div>
                <span className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Health Score</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">{qualityScore}%</div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div className={`h-2 rounded-full transition-all duration-1000 ${
                    Number(qualityScore) > 90 ? 'bg-emerald-500' : Number(qualityScore) > 70 ? 'bg-amber-400' : 'bg-rose-500'
                }`} style={{ width: `${qualityScore}%` }}></div>
            </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-wrap gap-6 items-center justify-end text-sm text-slate-600 px-2">
        <label className="flex items-center gap-2 cursor-pointer select-none hover:text-indigo-600 transition-colors">
            <input 
                type="checkbox" 
                checked={showLowConfidence} 
                onChange={e => setShowLowConfidence(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            Show low-confidence typos
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none hover:text-indigo-600 transition-colors">
            <input 
                type="checkbox" 
                checked={showAnomalies} 
                onChange={e => setShowAnomalies(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            Show statistical anomalies
        </label>
      </div>

      {/* Detailed Analysis Table */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <BarChart3 className="text-slate-400" size={18} />
            <h3 className="font-bold text-slate-700">Detailed Column Analysis</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
                    <tr>
                        <th className="px-6 py-4 w-1/4">Column</th>
                        <th className="px-6 py-4 w-32">Type</th>
                        <th className="px-6 py-4">Issues Found</th>
                        <th className="px-6 py-4 w-32 text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {stats.columns.map((col, i) => {
                        const visibleIssues = col.issues.filter(issue => {
                            if (issue.isLowConfidence && !showLowConfidence) return false;
                            if (issue.isAnomaly && !showAnomalies) return false;
                            return true;
                        });

                        return (
                        <tr key={col.name} className={`hover:bg-indigo-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="px-6 py-4 align-top">
                                <div className="font-bold text-slate-800 text-base">{col.name}</div>
                                {col.numericStats && (
                                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 font-medium">
                                        <span>Min: {col.numericStats.min.toLocaleString()}</span>
                                        <span>Avg: {col.numericStats.mean.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                                        <span>Max: {col.numericStats.max.toLocaleString()}</span>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 align-top">
                                <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider mb-1.5 ${
                                    col.inferredType === 'number' ? 'bg-blue-50 text-blue-700' : 
                                    col.inferredType === 'date' ? 'bg-purple-50 text-purple-700' :
                                    col.inferredType === 'boolean' ? 'bg-orange-50 text-orange-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {col.inferredType}
                                </span>
                                <div className="text-xs text-slate-400 font-medium ml-1">{col.uniqueCount} unique</div>
                            </td>
                            <td className="px-6 py-4 align-top">
                                {visibleIssues.length > 0 ? (
                                    <div className="space-y-3">
                                        {visibleIssues.map((issue, idx) => (
                                            <div key={idx} className="flex gap-2.5 items-start">
                                                <div className={`mt-0.5 shrink-0 ${
                                                    issue.severity === 'High' ? 'text-rose-500' : 
                                                    issue.isAnomaly ? 'text-blue-500' : 'text-amber-500'
                                                }`}>
                                                    <AlertTriangle size={15} />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className={`block text-sm font-medium leading-tight ${
                                                        issue.isAnomaly ? 'text-blue-700' : 'text-slate-700'
                                                    }`}>
                                                        {issue.description}
                                                    </span>
                                                    {issue.examples.length > 0 && (
                                                        <span className="text-xs text-slate-400 block truncate max-w-xs mt-0.5">
                                                            Ex: {issue.examples.join(", ")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium py-1">
                                        <CheckCircle size={16} />
                                        <span>Clean</span>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 align-top text-center">
                                {visibleIssues.length > 0 ? (
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                        visibleIssues.some(i => i.severity === 'High') ? 'bg-rose-100 text-rose-700' : 
                                        visibleIssues.some(i => i.isAnomaly) ? 'bg-blue-50 text-blue-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                        {visibleIssues.some(i => i.severity === 'High') ? 'Critical' : 
                                         visibleIssues.some(i => i.isAnomaly) ? 'Review' : 'Warning'}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                                        OK
                                    </span>
                                )}
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>
      </div>

      {/* Chart Section */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden">
        <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
            <div className="bg-rose-50 p-1.5 rounded-lg text-rose-500"><FileX size={18} /></div>
            Missing Values Analysis
        </h3>
        
        {missingData.length > 0 ? (
            <div className="w-full h-[320px] md:h-[400px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={missingData} 
                        layout="vertical" 
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickCount={6} axisLine={false} tickLine={false} />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={140} 
                            tick={<CustomYAxisTick />} 
                            interval={0}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}} 
                            contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)',
                                padding: '12px',
                                fontSize: '13px'
                            }} 
                        />
                        <Bar dataKey="missing" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={20}>
                            {missingData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#f43f5e' : '#fb7185'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle size={32} className="mb-3 text-emerald-500" />
                <p className="font-medium">No missing data found</p>
            </div>
        )}
      </div>
    </div>
  );
};