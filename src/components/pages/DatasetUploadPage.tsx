import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Database,
  ArrowRight,
  Download,
  Loader2,
} from 'lucide-react';
import Papa from 'papaparse';

export const DatasetUploadPage: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    insertedCount?: number;
    message?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setUploadResult(null);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const downloadTemplate = () => {
    const template = [
      'policyId',
      'age',
      'drivingExperienceYears',
      'creditScore',
      'annualMileage',
      'vehicleCategory',
      'vehicleAge',
      'vehicleValue',
      'regionalZone',
      'coverageTier',
      'deductible',
      'priorClaimsLast5Years',
      'trafficViolationsCount',
      'antiTheftDevice',
      'policyTenureYears',
      'driverGender',
      'maritalStatus',
      'annualExposure'
    ].join(',') + '\n';
    
    // Sample row
    const sample = 'POL-UP-0001,35,12,710,12000,Economy Sedan,4,22000,Suburban Moderate (Zone B),Standard Comprehensive,500,0,0,Yes,3,Male,Married,1.0';
    
    const blob = new Blob([template + sample], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'insurance_dataset_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uploadDataset = () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);
    setUploadResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setUploadProgress(40);
        try {
          const response = await fetch('/api/dataset/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ records: results.data }),
          });
          
          setUploadProgress(80);
          
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || 'Upload failed');
          }

          setUploadProgress(100);
          setTimeout(() => {
            setIsUploading(false);
            setUploadResult({
              success: true,
              insertedCount: result.insertedCount,
              message: 'Dataset imported and analyzed successfully. Models updated.',
            });
            setFile(null);
          }, 600);
        } catch (error: any) {
          setIsUploading(false);
          setUploadResult({
            success: false,
            message: error.message || 'Failed to communicate with server.',
          });
        }
      },
      error: (error) => {
        setIsUploading(false);
        setUploadResult({
          success: false,
          message: `CSV Parsing Error: ${error.message}`,
        });
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Dataset Upload &amp; Management
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Import historical policy sets for risk model training, reference, and portfolio backtesting.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Upload Actuarial Dataset (CSV)
            </h3>

            {/* Drag & Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Drag and drop your dataset file here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Supports .csv files with standard underwriting feature headers
              </p>
              
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Browse Files
              </button>
            </div>

            {/* Selected File State */}
            {file && !isUploading && !uploadResult && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={uploadDataset}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
                >
                  Start Import <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Uploading State */}
            {isUploading && (
              <div className="mt-4 p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing and calibrating against model parameters...
                  </span>
                  <span className="text-xs text-slate-500">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Result State */}
            {uploadResult && (
              <div
                className={`mt-4 p-4 rounded-xl border flex items-start gap-3 ${
                  uploadResult.success
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
                }`}
              >
                {uploadResult.success ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-bold">
                    {uploadResult.success ? 'Upload Complete' : 'Upload Failed'}
                  </h4>
                  <p className="text-xs mt-1 opacity-90">{uploadResult.message}</p>
                  {uploadResult.success && uploadResult.insertedCount && (
                    <p className="text-xs mt-2 font-mono bg-white/50 dark:bg-black/20 px-2 py-1 rounded inline-block">
                      + {uploadResult.insertedCount} policies indexed
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Template Instructions Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Formatting Requirements
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              To properly align with our gradient boosted trees inputs, please ensure your dataset includes standard actuarial pricing attributes.
            </p>
            
            <ul className="text-[11px] space-y-2 text-slate-600 dark:text-slate-400 mb-6 font-mono">
              <li>• age (number)</li>
              <li>• drivingExperienceYears</li>
              <li>• creditScore</li>
              <li>• annualMileage</li>
              <li>• vehicleCategory</li>
              <li>• priorClaimsLast5Years</li>
            </ul>

            <button
              onClick={downloadTemplate}
              className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
            >
              <Download className="w-4 h-4" />
              Download CSV Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
