import { DataRow, DatasetStats, ColumnProfile, ColumnIssue, ColumnType, AppSettings } from '../types';
import Papa from 'papaparse';

// --- Normalization Helpers ---

const MISSING_TOKENS = new Set([
  "", "null", "nan", "n/a", "na", "none", "-", "--", "?"
]);

/**
 * Normalizes a single value:
 * 1. Trims whitespace if string.
 * 2. Checks case-insensitive missing tokens.
 * 3. Returns null if missing token, otherwise trimmed value (or original).
 */
const normalizeValue = (val: any): any => {
  if (val === null || val === undefined) return null;
  
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.length === 0 || MISSING_TOKENS.has(trimmed.toLowerCase())) return null;
    return trimmed;
  }
  
  return val;
};

// --- Statistics Helpers ---

const calculateNumericStats = (values: number[]) => {
  if (values.length === 0) return undefined;
  
  values.sort((a, b) => a - b);
  const min = values[0];
  const max = values[values.length - 1];
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  
  // Median
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  
  // Std Dev
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { min, max, mean, median, stdDev };
};

const levenshteinDistance = (a: string, b: string): number => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion/deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// --- Type Inference & Validation ---

const isDate = (val: any): boolean => {
  if (!val) return false;
  const d = new Date(val);
  // Must be valid date AND look like a date string (avoid short numbers/strings)
  // Also check reasonable bounds (e.g. year 1000 to 3000) to avoid noise
  if (isNaN(d.getTime())) return false;
  
  // Simple check: if it parses as a date, is the year reasonable?
  const year = d.getFullYear();
  if (year < 1900 || year > 2100) return false;

  return String(val).length > 5 && !/^-?\d+(\.\d+)?$/.test(String(val));
};

const isNumber = (val: any): boolean => {
  if (val === null || val === undefined || val === '') return false;
  // Handle currency symbols or commas if simple
  const clean = String(val).replace(/,/g, '').replace('$', '').replace('€', '');
  return !isNaN(Number(clean)) && clean.trim() !== '';
};

// --- Outlier Detection (IQR) ---

const findOutliers = (values: number[], sensitivity: 'Low' | 'Medium' | 'High'): number[] => {
  if (values.length < 5) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  
  let multiplier = 1.5;
  if (sensitivity === 'Low') multiplier = 3.0; // Less sensitive (needs 3x IQR to be outlier)
  if (sensitivity === 'High') multiplier = 1.0; // More sensitive

  const lowerBound = q1 - (iqr * multiplier);
  const upperBound = q3 + (iqr * multiplier);

  return values.filter(v => v < lowerBound || v > upperBound);
};

// --- Main Analysis Engine ---

export const analyzeDataset = (data: DataRow[], settings: AppSettings): DatasetStats => {
  if (!data || data.length === 0) {
    return { rowCount: 0, columnCount: 0, totalMissingCells: 0, duplicateRows: 0, columns: [] };
  }

  const headers = Object.keys(data[0]);
  const rowCount = data.length;
  let totalMissingCells = 0;

  // 1. Detect Exact Duplicate Rows
  const rowStrings = data.map(r => JSON.stringify(r));
  const uniqueRowStrings = new Set(rowStrings);
  const duplicateRows = rowCount - uniqueRowStrings.size;

  const columns: ColumnProfile[] = headers.map(colName => {
    const rawValues = data.map(row => row[colName]);
    
    // 2. Normalize Data & Count Missing
    const normalizedValues = rawValues.map(normalizeValue);
    const definedValues = normalizedValues.filter(v => v !== null);
    const missingCount = rowCount - definedValues.length;
    totalMissingCells += missingCount;
    
    // 3. Infer Schema
    let numCount = 0, dateCount = 0, boolCount = 0;
    definedValues.forEach(v => {
        if (isNumber(v)) numCount++;
        else if (isDate(v)) dateCount++;
        else if (String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'false') boolCount++;
    });

    const definedCount = definedValues.length;
    let inferredType: ColumnType = 'string';
    
    // Inference Thresholds
    if (definedCount > 0) {
        if (numCount / definedCount > 0.8) inferredType = 'number';
        else if (dateCount / definedCount > 0.8) inferredType = 'date';
        else if (boolCount / definedCount > 0.8) inferredType = 'boolean';
    }

    const issues: ColumnIssue[] = [];

    // Issue: Missing Values
    if (missingCount > 0) {
      issues.push({
        type: 'missing',
        description: `${missingCount} missing values (${((missingCount/rowCount)*100).toFixed(1)}%)`,
        severity: missingCount / rowCount > 0.2 ? 'High' : 'Medium',
        count: missingCount,
        examples: []
      });
    }

    // Issue: Mixed Types ( > 5% violation)
    if (definedCount > 0) {
        let violations = 0;
        let exampleViolations: string[] = [];
        
        if (inferredType === 'number') {
            const nonNums = definedValues.filter(v => !isNumber(v));
            violations = nonNums.length;
            exampleViolations = nonNums.slice(0, 3).map(String);
        } else if (inferredType === 'date') {
            const nonDates = definedValues.filter(v => !isDate(v));
            violations = nonDates.length;
            exampleViolations = nonDates.slice(0, 3).map(String);
        }

        if (violations / definedCount > 0.05) {
             issues.push({
                type: 'mixed_types',
                description: `${violations} values do not match inferred type '${inferredType}'`,
                severity: 'High',
                count: violations,
                examples: exampleViolations
             });
        }
    }

    // 4. Numeric Stats & Outliers
    let numericStats = undefined;
    if (inferredType === 'number') {
        const nums = definedValues.map(v => parseFloat(String(v).replace(/,/g, ''))).filter(n => !isNaN(n));
        numericStats = calculateNumericStats(nums);

        if (nums.length > 5) {
            const outliers = findOutliers(nums, settings.outlierSensitivity);
            if (outliers.length > 0) {
                issues.push({
                    type: 'outlier',
                    description: `Detected ${outliers.length} outliers (Sensitivity: ${settings.outlierSensitivity})`,
                    severity: settings.outlierSensitivity === 'High' ? 'Medium' : 'High',
                    count: outliers.length,
                    examples: outliers.slice(0, 3).map(String)
                });
            }
        }
    }

    // 5. Text Stats & Inconsistencies (Case & Fuzzy)
    let topCategories: { value: string; count: number }[] | undefined;
    const uniqueCount = new Set(definedValues.map(String)).size;

    if (inferredType === 'string') {
        // Frequency Map
        const counts: Record<string, number> = {};
        definedValues.forEach(v => {
            const s = String(v);
            counts[s] = (counts[s] || 0) + 1;
        });
        
        topCategories = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([value, count]) => ({ value, count }));

        // A. Case/Whitespace Inconsistencies
        const lowerMap: Record<string, Set<string>> = {};
        Object.keys(counts).forEach(key => {
            const lower = key.toLowerCase().trim();
            if (!lowerMap[lower]) lowerMap[lower] = new Set();
            lowerMap[lower].add(key);
        });

        const caseInconsistencies = Object.values(lowerMap).filter(set => set.size > 1);
        if (caseInconsistencies.length > 0) {
             issues.push({
                type: 'inconsistent_category',
                description: `${caseInconsistencies.length} groups of case/whitespace variations`,
                severity: 'Medium',
                count: caseInconsistencies.length,
                examples: caseInconsistencies.slice(0, 3).map(s => Array.from(s).join(' / '))
             });
        }

        // B. Fuzzy Matching (Levenshtein) - Only for categorical fields (unique < 500)
        // Check between distinct normalized keys to find "Software Engineer" vs "Softwar Engineer"
        if (uniqueCount < 500 && uniqueCount > 1) {
             const distinctNorm = Object.keys(lowerMap);
             const fuzzyGroups: string[][] = [];
             const used = new Set<string>();

             for (let i = 0; i < distinctNorm.length; i++) {
                 if (used.has(distinctNorm[i])) continue;
                 const group = [distinctNorm[i]];
                 
                 for (let j = i + 1; j < distinctNorm.length; j++) {
                     if (used.has(distinctNorm[j])) continue;
                     
                     // Optimization: Only compare if lengths are similar (diff <= 2)
                     if (Math.abs(distinctNorm[i].length - distinctNorm[j].length) > 2) continue;
                     
                     const dist = levenshteinDistance(distinctNorm[i], distinctNorm[j]);
                     // Threshold: dist <= 2 and length > 3 (avoid mapping "cat" to "bat")
                     if (dist <= 2 && distinctNorm[i].length > 3) {
                         group.push(distinctNorm[j]);
                         used.add(distinctNorm[j]);
                     }
                 }
                 if (group.length > 1) fuzzyGroups.push(group);
             }

             if (fuzzyGroups.length > 0) {
                 issues.push({
                     type: 'inconsistent_category',
                     description: `${fuzzyGroups.length} potential typos/near-duplicates found`,
                     severity: 'Low',
                     count: fuzzyGroups.length,
                     examples: fuzzyGroups.slice(0, 3).map(g => g.join(' ≈ '))
                 });
             }
        }
    }

    return {
      name: colName,
      inferredType,
      missingCount,
      uniqueCount,
      issues,
      topCategories,
      numericStats
    };
  });

  return {
    rowCount,
    columnCount: headers.length,
    totalMissingCells,
    duplicateRows,
    columns
  };
};

// --- Auto-Clean Logic ---

export const performAutoClean = (data: DataRow[], stats: DatasetStats): DataRow[] => {
    let cleaned = data.map(row => {
        const newRow: DataRow = {};
        Object.keys(row).forEach(key => {
            // Apply global normalization
            newRow[key] = normalizeValue(row[key]);
        });
        return newRow;
    });

    // 1. Remove Exact Duplicates
    const seen = new Set();
    cleaned = cleaned.filter(row => {
        const s = JSON.stringify(row);
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
    });

    // 2. Column Cleaning
    stats.columns.forEach(col => {
        cleaned = cleaned.map(row => {
            let val = row[col.name];

            if (col.inferredType === 'number') {
                 if (val !== null && isNumber(val)) {
                     // Clean currency/commas
                     val = parseFloat(String(val).replace(/,/g, '').replace('$', ''));
                 } else if (val !== null) {
                     val = null; // Enforce type
                 }
            } else if (col.inferredType === 'string' && val !== null) {
                // Auto-fix case inconsistency if we detected it? 
                // For safety, simple trim is mostly what we do automatically.
                val = String(val).trim();
            }

            // Fill Missing
            if (val === null) {
                 if (col.inferredType === 'string') val = "Unknown";
                 // Numbers/Dates left as null for safety in this strict version
            }
            
            return { ...row, [col.name]: val };
        });
    });

    return cleaned;
};

export const parseCSV = (file: File): Promise<DataRow[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false, 
            complete: (results) => {
                resolve(results.data as DataRow[]);
            },
            error: (err) => reject(err)
        });
    });
};