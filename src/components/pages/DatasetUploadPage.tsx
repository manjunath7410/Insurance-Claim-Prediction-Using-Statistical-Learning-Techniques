import React, { useState, useRef, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import {
  UploadCloud, FileText, AlertCircle, CheckCircle2, Database,
  ArrowRight, Download, Loader2, X, BarChart3, Settings,
  Table as TableIcon, ChevronLeft, ChevronRight, Activity, PieChart
} from 'lucide-react';

type UploadState = 'select' | 'mapping' | 'importing' | 'summary';

const MAPPING_GROUPS = [
  {
    title: 'Target Variable',
    type: 'target',
    fields: [
      { id: 'target', label: 'Claim Status / Amount (Target)' }
    ]
  },
  {
    title: 'Numerical Features',
    type: 'numerical',
    fields: [
      { id: 'age', label: 'Age' },
      { id: 'drivingExperienceYears', label: 'Driving Experience (Years)' },
      { id: 'creditScore', label: 'Credit Score' },
      { id: 'annualMileage', label: 'Annual Mileage' },
      { id: 'vehicleAge', label: 'Vehicle Age' },
      { id: 'vehicleValue', label: 'Vehicle Value' },
      { id: 'deductible', label: 'Deductible' },
      { id: 'priorClaimsLast5Years', label: 'Prior Claims (5 Years)' },
      { id: 'trafficViolationsCount', label: 'Traffic Violations' },
      { id: 'policyTenureYears', label: 'Policy Tenure (Years)' },
      { id: 'annualExposure', label: 'Annual Exposure' }
    ]
  },
  {
    title: 'Categorical Features',
    type: 'categorical',
    fields: [
      { id: 'vehicleCategory', label: 'Vehicle Category' },
      { id: 'regionalZone', label: 'Regional Zone' },
      { id: 'coverageTier', label: 'Coverage Tier' },
      { id: 'antiTheftDevice', label: 'Anti-Theft Device' },
      { id: 'driverGender', label: 'Driver Gender' },
      { id: 'maritalStatus', label: 'Marital Status' }
    ]
  }
];

function autoMapColumns(csvColumns: string[]) {
  const mapping: Record<string, string> = {};
  
  const rules: Record<string, string[]> = {
    target: ['target', 'claim', 'status', 'is_claim', 'claim_status'],
    age: ['age', 'driver_age'],
    drivingExperienceYears: ['experience', 'driving_exp', 'tenure'],
    creditScore: ['credit', 'score', 'fico'],
    annualMileage: ['mileage', 'miles', 'annual_miles'],
    vehicleAge: ['vehicle_age', 'car_age'],
    vehicleValue: ['vehicle_value', 'car_value', 'price'],
    deductible: ['deductible', 'excess'],
    priorClaimsLast5Years: ['prior_claims', 'claims_history', 'past_claims'],
    trafficViolationsCount: ['violations', 'tickets'],
    policyTenureYears: ['policy_tenure', 'years_with_company'],
    annualExposure: ['exposure', 'annual_exposure'],
    vehicleCategory: ['vehicle_category', 'car_type', 'vehicle_type', 'category'],
    regionalZone: ['region', 'zone', 'territory'],
    coverageTier: ['coverage', 'tier', 'plan'],
    antiTheftDevice: ['anti_theft', 'alarm', 'security'],
    driverGender: ['gender', 'sex'],
    maritalStatus: ['marital', 'married', 'status']
  };

  Object.entries(rules).forEach(([id, aliases]) => {
    const match = csvColumns.find(col => {
      const normalizedCol = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      return aliases.some(alias => {
         const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
         return normalizedCol.includes(normalizedAlias);
      });
    });
    if (match) mapping[id] = match;
  });

  return mapping;
}

export const DatasetUploadPage: React.FC = () => {
  const [state, setState] = useState<UploadState>('select');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Mapping State
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  
  // Import State
  const [progress, setProgress] = useState({ processed: 0, total: 0, percent: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const parserRef = useRef<any>(null);

  // Summary State
  const [validation, setValidation] = useState({
    missing: 0,
    duplicate: 0,
    totalRows: 0,
    totalCols: 0,
    numerical: 0,
    categorical: 0,
    status: 'Passed' as 'Passed' | 'Warning' | 'Failed'
  });
  
  const [stats, setStats] = useState<Record<string, { min: number, max: number, sum: number, sumSq: number, count: number, mean?: number, std?: number }>>({});

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true,
      preview: 50, // Get a chunk for preview
      skipEmptyLines: true,
      complete: (results) => {
        setPreviewData(results.data);
        if (results.meta.fields) {
          setColumns(results.meta.fields);
          setMapping(autoMapColumns(results.meta.fields));
        }
        setState('mapping');
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        processFileSelection(selectedFile);
      } else {
        alert('Please upload a valid CSV file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        processFileSelection(selectedFile);
      } else {
        alert('Please upload a valid CSV file.');
      }
    }
  };

  const startImport = () => {
    setState('importing');
    
    // Rough estimate based on file size, assuming average row length of 100 bytes
    const estimatedTotal = Math.max(1, Math.floor(file!.size / 100));
    setProgress({ processed: 0, total: estimatedTotal, percent: 0 });
    
    abortControllerRef.current = new AbortController();
    
    let processedCount = 0;
    let missingCount = 0;
    let duplicateCount = 0;
    const seenHashes = new Set<string>();
    
    // Stats tracking
    const runningStats: Record<string, any> = {};
    const numericalFields = MAPPING_GROUPS.find(g => g.type === 'numerical')?.fields.map(f => f.id) || [];
    numericalFields.forEach(f => {
      runningStats[f] = { min: Infinity, max: -Infinity, sum: 0, sumSq: 0, count: 0 };
    });

    Papa.parse(file!, {
      header: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 256, // 256KB chunks (approx 2000-3000 rows)
      chunk: async (results, parser) => {
        parser.pause();
        parserRef.current = parser;

        if (abortControllerRef.current?.signal.aborted) {
          parser.abort();
          return;
        }

        const mappedRecords: any[] = [];
        
        results.data.forEach((row: any) => {
          const mappedRow: any = {};
          let hasMissing = false;
          
          MAPPING_GROUPS.forEach(group => {
            group.fields.forEach(field => {
              const csvCol = mapping[field.id];
              let val = csvCol ? row[csvCol] : undefined;
              
              if (val === undefined || val === null || val === '') {
                hasMissing = true;
              }
              mappedRow[field.id] = val;
              
              // Track stats for numerical
              if (group.type === 'numerical' && val !== undefined && val !== '') {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                  runningStats[field.id].min = Math.min(runningStats[field.id].min, num);
                  runningStats[field.id].max = Math.max(runningStats[field.id].max, num);
                  runningStats[field.id].sum += num;
                  runningStats[field.id].sumSq += (num * num);
                  runningStats[field.id].count++;
                }
              }
            });
          });

          if (hasMissing) missingCount++;
          
          // Using a fast lightweight string hash for duplicates on large sets
          const hash = Object.values(mappedRow).join('|');
          if (seenHashes.has(hash)) {
            duplicateCount++;
          } else {
            seenHashes.add(hash);
          }
          
          mappedRecords.push(mappedRow);
        });

        try {
          // Upload mapped chunk to backend
          await fetch('/api/dataset/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: mappedRecords }),
            signal: abortControllerRef.current?.signal
          });
          
          processedCount += mappedRecords.length;
          
          // Refine total rows estimate based on bytes processed so far vs file size
          let computedPercent = Math.round((processedCount / estimatedTotal) * 100);
          if (computedPercent > 99) computedPercent = 99; // Cap at 99 until truly done
          
          setProgress({
            processed: processedCount,
            total: estimatedTotal, 
            percent: computedPercent
          });
          
          parser.resume();
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error('Upload chunk failed', err);
            parser.abort();
            setState('select');
            alert('Upload failed: ' + err.message);
          }
        }
      },
      complete: () => {
        if (abortControllerRef.current?.signal.aborted) return;
        
        // Finalize stats
        Object.keys(runningStats).forEach(key => {
          const s = runningStats[key];
          if (s.count > 0) {
            s.mean = s.sum / s.count;
            const variance = (s.sumSq - (s.sum * s.sum) / s.count) / s.count;
            s.std = Math.sqrt(Math.max(0, variance));
          }
        });
        
        setStats(runningStats);
        
        setProgress(p => ({ ...p, processed: processedCount, total: processedCount, percent: 100 }));
        
        const numCols = MAPPING_GROUPS.find(g => g.type === 'numerical')?.fields.length || 0;
        const catCols = MAPPING_GROUPS.find(g => g.type === 'categorical')?.fields.length || 0;
        
        let valStatus: 'Passed' | 'Warning' | 'Failed' = 'Passed';
        if (missingCount > processedCount * 0.1 || duplicateCount > processedCount * 0.05) {
          valStatus = 'Warning';
        }

        setValidation({
          missing: missingCount,
          duplicate: duplicateCount,
          totalRows: processedCount,
          totalCols: Object.keys(mapping).length,
          numerical: numCols,
          categorical: catCols,
          status: valStatus
        });
        
        setTimeout(() => {
          setState('summary');
        }, 500);
      },
      error: (error) => {
        console.error('Papa Parse Error', error);
        setState('select');
        alert('File parsing failed: ' + error.message);
      }
    });
  };

  const cancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (parserRef.current) {
      parserRef.current.abort();
    }
    setState('select');
    setFile(null);
  };

  // UI Renders based on State
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Dataset Import &amp; Validation
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Import historical policy datasets to drive portfolio analytics and benchmark regression models.
            </p>
          </div>
        </div>
      </div>

      {state === 'select' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm text-center">
           <div
              className={`border-2 border-dashed rounded-xl p-12 transition-colors max-w-2xl mx-auto ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Upload your dataset
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Supports real insurance datasets (.csv) up to 100,000+ rows.
                File will be processed efficiently in chunks.
              </p>
              
              <input
                type="file"
                accept=".csv"
                className="hidden"
                id="file-upload"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                Browse Files
              </label>
            </div>
            
            <div className="mt-8 max-w-2xl mx-auto text-left bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
               <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                 <AlertCircle className="w-4 h-4 text-blue-500" />
                 Large Dataset Support
               </h4>
               <p className="text-xs text-slate-600 dark:text-slate-400">
                 This environment processes data via streaming to prevent browser freezing. 
                 You can safely upload a real 100,000 row dataset. We automatically map standard insurance column headers.
               </p>
            </div>
        </div>
      )}

      {state === 'mapping' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div>
               <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                 <FileText className="w-5 h-5 text-blue-500" />
                 {file?.name}
               </h3>
               <p className="text-sm text-slate-500 dark:text-slate-400">
                 File size: {file ? (file.size / (1024 * 1024)).toFixed(2) : '0'} MB
               </p>
             </div>
             <div className="flex items-center gap-3">
               <button onClick={() => setState('select')} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                 Cancel
               </button>
               <button onClick={startImport} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
                 Validate &amp; Import <ArrowRight className="w-4 h-4" />
               </button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                   <Settings className="w-4 h-4 text-slate-500" />
                   Column Mapping
                 </h3>
                 <p className="text-xs text-slate-500 mb-4">
                   We've auto-detected columns. Please review and map the remaining fields from your CSV.
                 </p>
                 
                 <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                   {MAPPING_GROUPS.map(group => (
                     <div key={group.title} className="space-y-3">
                       <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1">
                         {group.title}
                       </h4>
                       {group.fields.map(field => (
                         <div key={field.id} className="flex flex-col gap-1">
                           <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                             {field.label}
                           </label>
                           <select
                             value={mapping[field.id] || ''}
                             onChange={(e) => setMapping(prev => ({ ...prev, [field.id]: e.target.value }))}
                             className="text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                           >
                             <option value="">-- Ignore / Not present --</option>
                             {columns.map(col => (
                               <option key={col} value={col}>{col}</option>
                             ))}
                           </select>
                         </div>
                       ))}
                     </div>
                   ))}
                 </div>
               </div>
            </div>

            <div className="lg:col-span-2">
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
                 <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                   <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                     <TableIcon className="w-4 h-4 text-slate-500" />
                     Dataset Preview
                   </h3>
                   <span className="text-xs text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                     Showing first {previewData.length} rows
                   </span>
                 </div>
                 
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-xs whitespace-nowrap">
                     <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                       <tr>
                         {columns.slice(0, 10).map(col => (
                           <th key={col} className="p-3 font-bold">{col}</th>
                         ))}
                         {columns.length > 10 && <th className="p-3 italic">...</th>}
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {previewData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row, idx) => (
                         <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                           {columns.slice(0, 10).map(col => (
                             <td key={col} className="p-3 text-slate-700 dark:text-slate-300">{row[col]}</td>
                           ))}
                           {columns.length > 10 && <td className="p-3 text-slate-400">...</td>}
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
                 
                 <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 mt-auto">
                   <span className="text-xs text-slate-500">
                     Page {page + 1} of {Math.ceil(previewData.length / rowsPerPage)}
                   </span>
                   <div className="flex items-center gap-1">
                     <button 
                       disabled={page === 0} 
                       onClick={() => setPage(p => p - 1)}
                       className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                     >
                       <ChevronLeft className="w-4 h-4" />
                     </button>
                     <button 
                       disabled={page >= Math.ceil(previewData.length / rowsPerPage) - 1} 
                       onClick={() => setPage(p => p + 1)}
                       className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                     >
                       <ChevronRight className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {state === 'importing' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 shadow-sm text-center max-w-2xl mx-auto">
           <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-6" />
           <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
             Importing Dataset...
           </h2>
           <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
             Processing records and updating statistical regression models.
             Large files may take a moment.
           </p>

           <div className="space-y-2 mb-8">
             <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
               <span>Progress: {progress.percent}%</span>
               <span>{progress.processed.toLocaleString()} / {progress.total > progress.processed ? progress.total.toLocaleString() : progress.processed.toLocaleString()} rows processed</span>
             </div>
             <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-700">
               <div
                 className="bg-blue-600 h-full rounded-full transition-all duration-300 relative"
                 style={{ width: `${progress.percent}%` }}
               >
                 <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)' }}></div>
               </div>
             </div>
           </div>

           <button
             onClick={cancelImport}
             className="px-6 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors"
           >
             Cancel Import
           </button>
        </div>
      )}

      {state === 'summary' && (
        <div className="space-y-6">
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm text-center">
             <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
               <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
               Import Complete
             </h2>
             <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
               Your dataset has been successfully parsed, validated, and processed into the regression engine.
             </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Validation Summary */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                   <AlertCircle className="w-4 h-4 text-slate-500" />
                   Dataset Validation
                 </h3>
                 
                 <div className="space-y-3 text-sm">
                   <div className="flex justify-between">
                     <span className="text-slate-500">Validation Status</span>
                     <span className={`font-bold ${validation.status === 'Passed' ? 'text-emerald-600' : validation.status === 'Warning' ? 'text-amber-500' : 'text-rose-600'}`}>
                       {validation.status}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-500">Total Rows</span>
                     <span className="font-semibold text-slate-900 dark:text-white">{validation.totalRows.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-500">Missing Values</span>
                     <span className={`font-semibold ${validation.missing > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                       {validation.missing.toLocaleString()}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-500">Duplicate Rows</span>
                     <span className={`font-semibold ${validation.duplicate > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                       {validation.duplicate.toLocaleString()}
                     </span>
                   </div>
                 </div>
              </div>

              {/* Data Overview */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                   <PieChart className="w-4 h-4 text-slate-500" />
                   Feature Overview
                 </h3>
                 
                 <div className="space-y-3 text-sm">
                   <div className="flex justify-between">
                     <span className="text-slate-500">Mapped Columns</span>
                     <span className="font-semibold text-slate-900 dark:text-white">{validation.numerical + validation.categorical}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-500">Numerical Features</span>
                     <span className="font-semibold text-slate-900 dark:text-white">{validation.numerical}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-500">Categorical Features</span>
                     <span className="font-semibold text-slate-900 dark:text-white">{validation.categorical}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-500">Target Variable Detected</span>
                     <span className="font-semibold text-emerald-600">Yes</span>
                   </div>
                 </div>
              </div>

              {/* Stats Summary */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                   <BarChart3 className="w-4 h-4 text-slate-500" />
                   Statistical Summary
                 </h3>
                 
                 <div className="space-y-3 text-sm">
                   <div className="flex justify-between">
                     <span className="text-slate-500">Avg Driver Age</span>
                     <span className="font-semibold text-slate-900 dark:text-white">
                       {stats.age?.mean ? stats.age.mean.toFixed(1) : 'N/A'} yrs
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-500">Avg Credit Score</span>
                     <span className="font-semibold text-slate-900 dark:text-white">
                       {stats.creditScore?.mean ? stats.creditScore.mean.toFixed(0) : 'N/A'}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-500">Avg Annual Mileage</span>
                     <span className="font-semibold text-slate-900 dark:text-white">
                       {stats.annualMileage?.mean ? stats.annualMileage.mean.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'N/A'} mi
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-500">Avg Vehicle Value</span>
                     <span className="font-semibold text-slate-900 dark:text-white">
                       {stats.vehicleValue?.mean ? '$' + stats.vehicleValue.mean.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'N/A'}
                     </span>
                   </div>
                 </div>
              </div>
           </div>
           
           <div className="flex justify-center mt-8 gap-4">
             <button
               onClick={() => {
                 setState('select');
                 setFile(null);
               }}
               className="px-6 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors"
             >
               Upload Another Dataset
             </button>
           </div>
        </div>
      )}
    </div>
  );
};
