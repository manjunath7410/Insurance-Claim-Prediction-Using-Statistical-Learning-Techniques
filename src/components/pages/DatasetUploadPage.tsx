import React, { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import {
  UploadCloud, FileText, AlertCircle, CheckCircle2, Database,
  ArrowRight, Loader2, BarChart3, Settings,
  Table as TableIcon, ChevronLeft, ChevronRight, PieChart,
  ShieldAlert, RefreshCw, Layers, Check, AlertTriangle,
  Info, TrendingUp, Sparkles, ArrowUpDown, ArrowLeftRight
} from 'lucide-react';
import {
  INSURANCE_FIELDS,
  detectInsuranceColumns,
  validateDatasetFile,
  formatBytes,
  StreamingDatasetAnalyzer,
  parseExcelDataset,
  DatasetImportSummary,
  ColumnDetectionResult,
  NumericalColumnStats,
  CategoricalColumnStats
} from '../../services/datasetImportService';
import { setActiveDatasetAnalytics } from '../../services/datasetAnalyticsService';
import { DatasetAnalyticsDashboard } from '../analytics/DatasetAnalyticsDashboard';

type UploadStep = 'select' | 'mapping' | 'importing' | 'summary';

interface DatasetUploadPageProps {
  onNavigateToAnalytics?: () => void;
  onNavigateToDrift?: () => void;
}

export const DatasetUploadPage: React.FC<DatasetUploadPageProps> = ({ onNavigateToAnalytics, onNavigateToDrift }) => {
  const [pageMode, setPageMode] = useState<'upload' | 'analytics'>('upload');
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [fileValidationInfo, setFileValidationInfo] = useState<{
    fileType: 'csv' | 'xlsx';
    warning?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Column Mapping State
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [detectionResult, setDetectionResult] = useState<ColumnDetectionResult | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [selectedNumerical, setSelectedNumerical] = useState<Set<string>>(new Set());
  const [selectedCategorical, setSelectedCategorical] = useState<Set<string>>(new Set());
  const [selectedOptional, setSelectedOptional] = useState<Set<string>>(new Set());
  const [canonicalFieldMapping, setCanonicalFieldMapping] = useState<Record<string, string>>({});

  // Preview State (Pre-import & Post-import)
  const [previewRows, setPreviewRows] = useState<Array<Record<string, any>>>([]);
  const [previewPage, setPreviewPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [previewSearch, setPreviewSearch] = useState('');

  // Streaming / Import State
  const [importProgress, setImportProgress] = useState<{
    processed: number;
    total: number;
    percent: number;
    statusText: string;
  }>({
    processed: 0,
    total: 0,
    percent: 0,
    statusText: 'Initializing import pipeline...'
  });
  const [syncToBackend, setSyncToBackend] = useState<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const papaParserRef = useRef<any>(null);

  // Summary State
  const [importSummary, setImportSummary] = useState<DatasetImportSummary | null>(null);
  const [activeSummaryTab, setActiveSummaryTab] = useState<'health' | 'numerical' | 'categorical' | 'preview' | 'analytics'>('health');

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  // Process Selected File
  const handleFileSelected = (selectedFile: File) => {
    setErrorMessage(null);

    const validation = validateDatasetFile(selectedFile);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file.');
      return;
    }

    setFile(selectedFile);
    setFileValidationInfo({
      fileType: validation.fileType,
      warning: validation.warning
    });

    if (validation.fileType === 'csv') {
      // Parse initial chunk for schema detection and preview (bounded to 250 rows)
      Papa.parse(selectedFile, {
        header: true,
        preview: 250,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.meta.fields || results.meta.fields.length === 0) {
            setErrorMessage('Unable to detect column headers in the uploaded CSV file. Please check for a valid header row.');
            return;
          }

          if (results.data.length === 0) {
            setErrorMessage('The CSV file contains column headers but no data records.');
            return;
          }

          const headers = results.meta.fields;
          const detected = detectInsuranceColumns(headers);

          setDetectedHeaders(headers);
          setDetectionResult(detected);
          setTargetColumn(detected.target || '');
          setSelectedNumerical(new Set(detected.numerical));
          setSelectedCategorical(new Set(detected.categorical));
          setSelectedOptional(new Set(detected.optional));
          setCanonicalFieldMapping(detected.mapping);
          setPreviewRows(results.data as Array<Record<string, any>>);
          setPreviewPage(0);
          setStep('mapping');
        },
        error: (err) => {
          setErrorMessage(`CSV parsing error: ${err.message}. Please verify the file is not corrupted.`);
        }
      });
    } else {
      // Excel (.xlsx / .xls) parsing initial sample
      parseExcelDataset(selectedFile, () => {})
        .then(({ headers, rows }) => {
          if (headers.length === 0 || rows.length === 0) {
            setErrorMessage('The Excel workbook sheet contains no readable columns or data rows.');
            return;
          }

          const detected = detectInsuranceColumns(headers);
          setDetectedHeaders(headers);
          setDetectionResult(detected);
          setTargetColumn(detected.target || '');
          setSelectedNumerical(new Set(detected.numerical));
          setSelectedCategorical(new Set(detected.categorical));
          setSelectedOptional(new Set(detected.optional));
          setCanonicalFieldMapping(detected.mapping);
          setPreviewRows(rows.slice(0, 250));
          setPreviewPage(0);
          setStep('mapping');
        })
        .catch((err) => {
          setErrorMessage(`Excel parsing error: ${err.message}. Please verify the workbook is valid.`);
        });
    }
  };

  // Reset Mapping to Auto-Detected Defaults
  const handleResetMapping = () => {
    if (!detectedHeaders.length) return;
    const detected = detectInsuranceColumns(detectedHeaders);
    setDetectionResult(detected);
    setTargetColumn(detected.target || '');
    setSelectedNumerical(new Set(detected.numerical));
    setSelectedCategorical(new Set(detected.categorical));
    setSelectedOptional(new Set(detected.optional));
    setCanonicalFieldMapping(detected.mapping);
  };

  // Toggle Numerical Selection
  const toggleNumericalColumn = (col: string) => {
    setSelectedNumerical(prev => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
        // Remove from categorical if present
        setSelectedCategorical(c => {
          const cNext = new Set(c);
          cNext.delete(col);
          return cNext;
        });
      }
      return next;
    });
  };

  // Toggle Categorical Selection
  const toggleCategoricalColumn = (col: string) => {
    setSelectedCategorical(prev => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
        // Remove from numerical if present
        setSelectedNumerical(n => {
          const nNext = new Set(n);
          nNext.delete(col);
          return nNext;
        });
      }
      return next;
    });
  };

  // Toggle Optional Selection
  const toggleOptionalColumn = (col: string) => {
    setSelectedOptional(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  // Start Streaming Import with Chunk-based Non-Blocking Processing
  const startStreamingImport = () => {
    if (!file || !fileValidationInfo) return;

    setStep('importing');
    setErrorMessage(null);

    const startTime = performance.now();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const numCols: string[] = Array.from(selectedNumerical);
    const catCols: string[] = Array.from(selectedCategorical);
    const analyzer = new StreamingDatasetAnalyzer(detectedHeaders, numCols, catCols);

    if (fileValidationInfo.fileType === 'csv') {
      // Estimate total rows based on file size (~100 bytes per row)
      const estimatedTotal = Math.max(10, Math.floor(file.size / 100));
      setImportProgress({
        processed: 0,
        total: estimatedTotal,
        percent: 0,
        statusText: 'Streaming and parsing records in memory-bounded chunks...'
      });

      let processedCount = 0;
      let syncQueue: any[] = [];

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        chunkSize: 1024 * 256, // 256 KB chunk size for smooth event loop
        chunk: async (results, parser) => {
          parser.pause();
          papaParserRef.current = parser;

          if (abortController.signal.aborted) {
            parser.abort();
            return;
          }

          const rows = results.data as Array<Record<string, any>>;
          for (let i = 0; i < rows.length; i++) {
            analyzer.processRow(rows[i]);
          }

          processedCount += rows.length;

          // Prepare mapped records for model backend sync if enabled
          if (syncToBackend) {
            for (let i = 0; i < rows.length; i++) {
              const r = rows[i];
              const mappedRow: Record<string, any> = {};
              for (const [canonicalId, csvCol] of Object.entries(canonicalFieldMapping)) {
                mappedRow[canonicalId] = (r as Record<string, any>)[csvCol as string];
              }
              syncQueue.push(mappedRow);
            }

            // Flush sync queue in batches of 250
            if (syncQueue.length >= 250) {
              const chunkToSync = syncQueue.slice(0, 250);
              syncQueue = syncQueue.slice(250);

              try {
                await fetch('/api/dataset/upload', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ records: chunkToSync }),
                  signal: abortController.signal
                });
              } catch (err: any) {
                if (err.name !== 'AbortError') {
                  console.warn('Background model synchronization chunk skipped:', err.message);
                }
              }
            }
          }

          const currentTotal = Math.max(processedCount, estimatedTotal);
          let percent = Math.min(99, Math.round((processedCount / currentTotal) * 100));

          setImportProgress({
            processed: processedCount,
            total: currentTotal,
            percent,
            statusText: `Streaming & analyzing records (${processedCount.toLocaleString()} processed)...`
          });

          // Allow the UI thread to paint and handle interactions
          setTimeout(() => {
            if (!abortController.signal.aborted) {
              parser.resume();
            }
          }, 0);
        },
        complete: async () => {
          if (abortController.signal.aborted) return;

          // Flush any remaining records for backend sync
          if (syncToBackend && syncQueue.length > 0) {
            try {
              setImportProgress(p => ({ ...p, statusText: 'Finalizing statistical regression sync...' }));
              await fetch('/api/dataset/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ records: syncQueue }),
                signal: abortController.signal
              });
            } catch (err: any) {
              console.warn('Final sync batch notice:', err.message);
            }
          }

          const durationMs = Math.round(performance.now() - startTime);
          const summary = analyzer.finalize(
            file.name,
            file.size,
            'csv',
            durationMs,
            canonicalFieldMapping
          );

          setImportSummary(summary);
          setActiveDatasetAnalytics(summary, summary.previewRows);
          setImportProgress({
            processed: processedCount,
            total: processedCount,
            percent: 100,
            statusText: 'Import and statistical profiling complete!'
          });

          setTimeout(() => {
            setStep('summary');
          }, 350);
        },
        error: (err) => {
          setErrorMessage(`Streaming error: ${err.message}`);
          setStep('select');
        }
      });
    } else {
      // Excel Streaming
      setImportProgress({
        processed: 0,
        total: 100,
        percent: 0,
        statusText: 'Parsing Excel workbook sheets...'
      });

      parseExcelDataset(
        file,
        (processed, total, percent) => {
          setImportProgress({
            processed,
            total,
            percent,
            statusText: `Streaming Excel records (${processed.toLocaleString()} of ${total.toLocaleString()})...`
          });
        },
        abortController.signal
      )
        .then(async ({ rows }) => {
          for (let i = 0; i < rows.length; i++) {
            analyzer.processRow(rows[i]);
          }

          if (syncToBackend) {
            const mappedRecords = rows.slice(0, 1000).map(r => {
              const mappedRow: Record<string, any> = {};
              for (const [canonicalId, csvCol] of Object.entries(canonicalFieldMapping)) {
                mappedRow[canonicalId] = (r as Record<string, any>)[csvCol as string];
              }
              return mappedRow;
            });

            await fetch('/api/dataset/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ records: mappedRecords }),
              signal: abortController.signal
            }).catch(() => {});
          }

          const durationMs = Math.round(performance.now() - startTime);
          const summary = analyzer.finalize(
            file.name,
            file.size,
            'xlsx',
            durationMs,
            canonicalFieldMapping
          );

          setImportSummary(summary);
          setActiveDatasetAnalytics(summary, summary.previewRows);
          setImportProgress({
            processed: rows.length,
            total: rows.length,
            percent: 100,
            statusText: 'Import complete!'
          });

          setTimeout(() => {
            setStep('summary');
          }, 350);
        })
        .catch(err => {
          if (err.message !== 'Parsing aborted by user') {
            setErrorMessage(`Excel import failed: ${err.message}`);
            setStep('select');
          }
        });
    }
  };

  // Cancel Import
  const cancelImport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (papaParserRef.current) {
      papaParserRef.current.abort();
    }
    setStep('select');
    setFile(null);
    setImportSummary(null);
  };

  // Filtered Preview Rows
  const filteredPreview = useMemo(() => {
    const data = importSummary?.previewRows || previewRows;
    if (!previewSearch.trim()) return data;

    const term = previewSearch.toLowerCase();
    return data.filter(r =>
      Object.values(r).some(val => String(val ?? '').toLowerCase().includes(term))
    );
  }, [importSummary, previewRows, previewSearch]);

  const paginatedRows = useMemo(() => {
    const start = previewPage * rowsPerPage;
    return filteredPreview.slice(start, start + rowsPerPage);
  }, [filteredPreview, previewPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredPreview.length / rowsPerPage);

  return (
    <div id="dataset-import-container" className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Module Header Banner */}
      <div id="dataset-header-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Dataset Import &amp; Validation
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  100k+ Streaming Engine
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                High-performance chunk ingestion, automated insurance schema detection, and statistical data health validation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                id="tab-mode-upload"
                onClick={() => setPageMode('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  pageMode === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Ingestion &amp; Mapping
              </button>
              <button
                id="tab-mode-analytics"
                onClick={() => setPageMode('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  pageMode === 'analytics'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Dataset Analytics Dashboard
              </button>
            </div>

            {step !== 'select' && pageMode === 'upload' && (
              <button
                id="btn-upload-new"
                onClick={() => {
                  cancelImport();
                  setStep('select');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Upload Another Dataset
              </button>
            )}
          </div>
        </div>
      </div>

      {pageMode === 'analytics' ? (
        <DatasetAnalyticsDashboard
          importSummary={importSummary}
          onNavigateToUpload={() => setPageMode('upload')}
        />
      ) : (
        <>
          {/* Global Error Banner */}
      {errorMessage && (
        <div id="dataset-error-banner" className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">Import Validation Notice</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 dark:text-rose-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =========================================================================
          STEP 1: SELECT & UPLOAD FILE
         ========================================================================= */}
      {step === 'select' && (
        <div id="step-select-container" className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 shadow-sm text-center">
            <div
              id="file-dropzone"
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-14 transition-all max-w-2xl mx-auto cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('dataset-file-input')?.click()}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Drop your insurance dataset here
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                Supports CSV (<span className="font-mono text-xs">.csv</span>) and Excel (<span className="font-mono text-xs">.xlsx, .xls</span>) files with up to 100,000+ policy records.
              </p>

              <input
                type="file"
                id="dataset-file-input"
                accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
                onChange={handleFileInputChange}
              />

              <button
                type="button"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('dataset-file-input')?.click();
                }}
              >
                Browse Files
              </button>
            </div>

            {/* Performance & Safeguards Badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-10 text-left">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Streaming Chunk Parser
                </div>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Streams files in 256KB chunks using non-blocking microtasks. The UI stays 100% responsive even on 100,000-row files.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Flexible Insurance Detection
                </div>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Auto-detects Age, Gender, BMI, Children, Smoking Status, Region, Income, Premium, Coverage Amount, Claim Status, and more.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Data Integrity Guardrails
                </div>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Never silently modifies or truncates original values. Computes exact duplicate and missingness metrics cleanly.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2: COLUMN DETECTION & MAPPING
         ========================================================================= */}
      {step === 'mapping' && file && (
        <div id="step-mapping-container" className="space-y-6">
          {/* File Meta Header Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {file.name}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {fileValidationInfo?.fileType.toUpperCase()} • {formatBytes(file.size)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Detected {detectedHeaders.length} total columns. Auto-detection confidence:{' '}
                <span className={`font-bold ${
                  (detectionResult?.confidenceScore ?? 0) >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                }`}>
                  {detectionResult?.confidenceScore}%
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('select')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-start-import"
                onClick={startStreamingImport}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                Import &amp; Validate Dataset
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column Mapping Controls (Left 5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Settings className="w-4 h-4 text-blue-500" />
                      Column Mapping
                    </h3>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      Confirm target variable and feature assignments.
                    </p>
                  </div>
                  <button
                    onClick={handleResetMapping}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                {/* 1. Target Variable Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Target Variable</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Required
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Primary claim occurrence flag (0/1) or claim severity amount.
                  </p>
                  <select
                    id="select-target-variable"
                    value={targetColumn}
                    onChange={(e) => {
                      const newTarget = e.target.value;
                      setTargetColumn(newTarget);
                      // Update canonical mapping
                      setCanonicalFieldMapping(prev => ({ ...prev, target: newTarget }));
                    }}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Target Variable --</option>
                    {detectedHeaders.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Numerical Features Multi-Select / Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Numerical Features ({selectedNumerical.size})
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Age, Mileage, Vehicle Value, FICO...
                    </span>
                  </div>
                  <div className="max-h-44 overflow-y-auto pr-1 space-y-1 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/30">
                    {detectedHeaders.map(col => {
                      if (col === targetColumn) return null;
                      const isSelected = selectedNumerical.has(col);
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => toggleNumericalColumn(col)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 font-semibold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="truncate">{col}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Categorical Features Multi-Select / Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Categorical Features ({selectedCategorical.size})
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Vehicle Category, Region, Gender...
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto pr-1 space-y-1 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/30">
                    {detectedHeaders.map(col => {
                      if (col === targetColumn) return null;
                      const isSelected = selectedCategorical.has(col);
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => toggleCategoricalColumn(col)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 font-semibold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="truncate">{col}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Optional Features Multi-Select / Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Optional / Metadata Columns ({selectedOptional.size})
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Policy ID, Notes, Dates
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto pr-1 space-y-1 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/30">
                    {detectedHeaders.map(col => {
                      if (col === targetColumn || selectedNumerical.has(col) || selectedCategorical.has(col)) {
                        return null;
                      }
                      const isSelected = selectedOptional.has(col);
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => toggleOptionalColumn(col)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="truncate">{col}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Backend Synchronization Toggle */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncToBackend}
                      onChange={(e) => setSyncToBackend(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Synchronize with Model Engine Database
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Stores mapped records into the database in non-blocking batches for portfolio analytics and model retraining.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Data Preview (Right 7 Cols) */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Dataset Preview
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      Sample ({previewRows.length} rows)
                    </span>
                  </div>

                  {/* Rows per page selector */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Rows:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setPreviewPage(0);
                      }}
                      className="text-xs py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    >
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={250}>250</option>
                    </select>
                  </div>
                </div>

                {/* Table View */}
                <div className="overflow-x-auto max-h-[520px]">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 font-bold">
                      <tr>
                        <th className="p-2.5 text-center text-slate-400 w-12">#</th>
                        {detectedHeaders.slice(0, 10).map(col => {
                          const isTarget = col === targetColumn;
                          const isNum = selectedNumerical.has(col);
                          const isCat = selectedCategorical.has(col);
                          return (
                            <th key={col} className="p-2.5">
                              <div className="flex items-center gap-1.5">
                                <span>{col}</span>
                                {isTarget && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500 text-white">Target</span>
                                )}
                                {isNum && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500 text-white">Num</span>
                                )}
                                {isCat && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500 text-white">Cat</span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                        {detectedHeaders.length > 10 && (
                          <th className="p-2.5 text-slate-400 italic">+{detectedHeaders.length - 10} more</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                      {paginatedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-2 text-center text-slate-400 select-none">
                            {previewPage * rowsPerPage + idx + 1}
                          </td>
                          {detectedHeaders.slice(0, 10).map(col => (
                            <td key={col} className="p-2 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                              {row[col] ?? <span className="text-slate-400 italic">null</span>}
                            </td>
                          ))}
                          {detectedHeaders.length > 10 && <td className="p-2 text-slate-400">...</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 mt-auto">
                  <span className="text-xs text-slate-500">
                    Page {previewPage + 1} of {Math.max(1, totalPages)} ({filteredPreview.length} preview rows)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={previewPage === 0}
                      onClick={() => setPreviewPage(p => Math.max(0, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={previewPage >= totalPages - 1}
                      onClick={() => setPreviewPage(p => p + 1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
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

      {/* =========================================================================
          STEP 3: IMPORTING PROGRESS (STREAMING 100,000+ ROWS)
         ========================================================================= */}
      {step === 'importing' && (
        <div id="step-importing-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-14 shadow-sm text-center max-w-2xl mx-auto space-y-6">
          <div className="relative w-16 h-16 mx-auto">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-blue-700 dark:text-blue-300">
              {importProgress.percent}%
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Importing Dataset...
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {file?.name} ({file ? formatBytes(file.size) : ''}) • {fileValidationInfo?.fileType.toUpperCase()}
            </p>
          </div>

          {/* Large Dataset Progress Indicator */}
          <div className="space-y-2 text-left bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Import Progress</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 text-sm">
                {importProgress.percent}%
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300 relative"
                style={{ width: `${importProgress.percent}%` }}
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)'
                  }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span className="font-mono">
                {importProgress.processed.toLocaleString()} / {importProgress.total > importProgress.processed ? importProgress.total.toLocaleString() : importProgress.processed.toLocaleString()} rows processed
              </span>
              <span className="text-[11px] truncate max-w-[200px] text-right">
                {importProgress.statusText}
              </span>
            </div>
          </div>

          <button
            id="btn-cancel-import"
            onClick={cancelImport}
            className="px-6 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
          >
            Cancel Import
          </button>
        </div>
      )}

      {/* =========================================================================
          STEP 4: SUMMARY, DATASET HEALTH & STATISTICAL PROFILES
         ========================================================================= */}
      {step === 'summary' && importSummary && (
        <div id="step-summary-container" className="space-y-6">
          {/* Health Score & Completion Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-2xl shrink-0 ${
                  importSummary.health.grade === 'A'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : importSummary.health.grade === 'B'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                    : importSummary.health.grade === 'C'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                }`}>
                  {importSummary.health.grade}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Dataset Health: {importSummary.health.score}/100
                    </h2>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      importSummary.health.status === 'Passed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : importSummary.health.status === 'Warning'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                    }`}>
                      {importSummary.health.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                    {importSummary.health.summaryMessage}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3 text-blue-500" />
                    Original dataset was NOT silently modified. Processed in {importSummary.processingDurationMs}ms.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  id="btn-open-dataset-analytics"
                  onClick={() => setActiveSummaryTab('analytics')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4" />
                  Dataset Analytics Dashboard
                </button>
                {onNavigateToDrift && (
                  <button
                    id="btn-navigate-drift-analysis"
                    onClick={onNavigateToDrift}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    Analyze Data Drift
                  </button>
                )}
                {onNavigateToAnalytics && (
                  <button
                    onClick={onNavigateToAnalytics}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Portfolio Analytics
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setStep('select');
                    setFile(null);
                    setImportSummary(null);
                  }}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Import Another
                </button>
              </div>
            </div>

            {/* Individual Health Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Rows</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                  {importSummary.totalRows.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Cols</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                  {importSummary.totalColumns}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Missing Cells</span>
                <p className={`text-sm font-bold font-mono mt-0.5 ${importSummary.health.missingCells > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                  {importSummary.health.missingCells.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Duplicate Rows</span>
                <p className={`text-sm font-bold font-mono mt-0.5 ${importSummary.health.duplicateRows > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                  {importSummary.health.duplicateRows.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Invalid Values</span>
                <p className={`text-sm font-bold font-mono mt-0.5 ${importSummary.health.invalidValues > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {importSummary.health.invalidValues}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Numerical</span>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                  {importSummary.health.numericalCount}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Categorical</span>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                  {importSummary.health.categoricalCount}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Empty Columns</span>
                <p className={`text-sm font-bold font-mono mt-0.5 ${importSummary.health.emptyColumns.length > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {importSummary.health.emptyColumns.length}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
            <button
              onClick={() => setActiveSummaryTab('health')}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeSummaryTab === 'health'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Dataset Validation &amp; Health
            </button>
            <button
              onClick={() => setActiveSummaryTab('numerical')}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeSummaryTab === 'numerical'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Numerical Summary ({Object.keys(importSummary.numericalStats).length})
            </button>
            <button
              onClick={() => setActiveSummaryTab('categorical')}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeSummaryTab === 'categorical'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <PieChart className="w-4 h-4" />
              Categorical Summary ({Object.keys(importSummary.categoricalStats).length})
            </button>
            <button
              onClick={() => setActiveSummaryTab('preview')}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeSummaryTab === 'preview'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              Data Preview ({importSummary.previewRows.length} rows)
            </button>
            <button
              id="tab-summary-analytics"
              onClick={() => setActiveSummaryTab('analytics')}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeSummaryTab === 'analytics'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Dataset Analytics Dashboard
            </button>
          </div>

          {/* TAB 1: DATASET HEALTH ISSUES */}
          {activeSummaryTab === 'health' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-500" />
                Data Validation Invariants &amp; Audit Logs
              </h3>

              {importSummary.health.issues.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    No schema, missingness, or duplicate anomalies detected. All mathematical invariants passed cleanly.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {importSummary.health.issues.map((iss, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border flex items-start gap-3 text-xs ${
                        iss.severity === 'error'
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                          : iss.severity === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                          : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300'
                      }`}
                    >
                      {iss.severity === 'error' ? (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      )}
                      <span>{iss.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NUMERICAL STATISTICAL SUMMARY */}
          {activeSummaryTab === 'numerical' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Numerical Features Statistical Summary
                </h3>
                <span className="text-[11px] text-slate-500">
                  Calculated via Welford Moments &amp; Reservoir Sampling
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <tr>
                      <th className="p-3">Feature Column</th>
                      <th className="p-3 text-right">Valid Count</th>
                      <th className="p-3 text-right">Missing</th>
                      <th className="p-3 text-right">Mean</th>
                      <th className="p-3 text-right">Median</th>
                      <th className="p-3 text-right">Std Dev</th>
                      <th className="p-3 text-right">Min</th>
                      <th className="p-3 text-right">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {(Object.values(importSummary.numericalStats) as NumericalColumnStats[]).map((s) => (
                      <tr key={s.column} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white">
                          {s.column}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">{s.count.toLocaleString()}</td>
                        <td className={`p-3 text-right ${s.missingCount > 0 ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>
                          {s.missingCount.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-blue-600 dark:text-blue-400 font-bold">{s.mean.toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-700 dark:text-slate-300">{s.median.toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">{s.std.toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-700 dark:text-slate-300">{s.min.toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-700 dark:text-slate-300">{s.max.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORICAL STATISTICAL SUMMARY */}
          {activeSummaryTab === 'categorical' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(Object.values(importSummary.categoricalStats) as CategoricalColumnStats[]).map((cat) => (
                <div key={cat.column} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {cat.column}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {cat.uniqueCount} unique categories • {cat.totalCount.toLocaleString()} values
                      </p>
                    </div>
                    {cat.missingCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {cat.missingCount} missing
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {cat.topCategories.map((top, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                            {top.category || '(blank)'}
                          </span>
                          <span className="font-mono text-slate-500 font-semibold">
                            {top.percentage}% ({top.count.toLocaleString()})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-purple-600 h-full rounded-full"
                            style={{ width: `${top.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: DATA PREVIEW */}
          {activeSummaryTab === 'preview' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Validated Sample Rows
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {filteredPreview.length} available preview rows
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Search preview rows..."
                    value={previewSearch}
                    onChange={(e) => {
                      setPreviewSearch(e.target.value);
                      setPreviewPage(0);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setPreviewPage(0);
                    }}
                    className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                    <option value={250}>250 / page</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 text-center text-slate-400 w-12">#</th>
                      {importSummary.columns.slice(0, 12).map(col => (
                        <th key={col} className="p-2.5">{col}</th>
                      ))}
                      {importSummary.columns.length > 12 && (
                        <th className="p-2.5 text-slate-400 italic">+{importSummary.columns.length - 12} more</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {paginatedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2 text-center text-slate-400 select-none">
                          {previewPage * rowsPerPage + idx + 1}
                        </td>
                        {importSummary.columns.slice(0, 12).map(col => (
                          <td key={col} className="p-2 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                            {row[col] ?? <span className="text-slate-400 italic">null</span>}
                          </td>
                        ))}
                        {importSummary.columns.length > 12 && <td className="p-2 text-slate-400">...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 mt-auto">
                <span className="text-xs text-slate-500">
                  Page {previewPage + 1} of {Math.max(1, totalPages)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={previewPage === 0}
                    onClick={() => setPreviewPage(p => Math.max(0, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={previewPage >= totalPages - 1}
                    onClick={() => setPreviewPage(p => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DATASET ANALYTICS DASHBOARD */}
          {activeSummaryTab === 'analytics' && (
            <div className="pt-2">
              <DatasetAnalyticsDashboard
                importSummary={importSummary}
                onNavigateToUpload={() => {
                  setStep('select');
                  setFile(null);
                  setImportSummary(null);
                }}
              />
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
};
