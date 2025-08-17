// DataViz Pro - Interactive Data Visualization Tool
// Main JavaScript file with comprehensive data analysis features

class DataVizPro {
    constructor() {
        this.data = null;
        this.originalData = null;
        this.columns = [];
        this.currentFeature = null;
        this.charts = {};
        this.analysis = {};
        
        this.initializeEventListeners();
        this.setupDragAndDrop();
    }

    initializeEventListeners() {
        const fileInput = document.getElementById('fileInput');
        const dropZone = document.getElementById('dropZone');
        const resetBtn = document.getElementById('resetBtn');
        const exportBtn = document.getElementById('exportBtn');

        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        resetBtn.addEventListener('click', () => this.resetApplication());
        exportBtn.addEventListener('click', () => this.exportReport());
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('dragover');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });

        dropZone.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        const validTypes = ['.csv', '.tsv', '.xlsx', '.xls'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validTypes.includes(fileExtension)) {
            this.showError('Invalid file type. Please upload CSV, TSV, or Excel files.');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            this.showError('File size exceeds 50MB limit.');
            return;
        }

        this.showLoading(true);
        this.showProgress(true);

        try {
            const data = await this.parseFile(file);
            this.originalData = [...data];
            this.data = data;
            this.analyzeDataset();
            this.renderDashboard();
            this.showUploadSection(false);
        } catch (error) {
            this.showError('Error processing file: ' + error.message);
        } finally {
            this.showLoading(false);
            this.showProgress(false);
        }
    }

    async parseFile(file) {
        return new Promise((resolve, reject) => {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    let data;
                    
                    if (fileExtension === 'csv') {
                        data = this.parseCSV(e.target.result);
                    } else if (fileExtension === 'tsv') {
                        data = this.parseTSV(e.target.result);
                    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                        data = this.parseExcel(e.target.result);
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));

            if (fileExtension === 'csv' || fileExtension === 'tsv') {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    }

    parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            return row;
        });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    parseTSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split('\t').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = line.split('\t');
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            return row;
        });
    }

    parseExcel(arrayBuffer) {
        // Simplified Excel parsing - in production, use a proper library
        const data = new Uint8Array(arrayBuffer);
        const arr = [];
        
        for (let i = 0; i !== data.length; ++i) {
            arr[i] = String.fromCharCode(data[i]);
        }
        
        const bstr = arr.join('');
        // This is a simplified version - you'd need xlsx library for full support
        return this.parseCSV(bstr);
    }

    analyzeDataset() {
        if (!this.data || this.data.length === 0) return;

        this.columns = Object.keys(this.data[0]);
        this.analysis = {
            summary: this.calculateSummary(),
            quality: this.calculateDataQuality(),
            duplicates: this.findDuplicates(),
            outliers: this.detectOutliers(),
            featureAnalysis: this.analyzeFeatures()
        };
    }

    calculateSummary() {
        return {
            totalRows: this.data.length,
            totalColumns: this.columns.length,
            missingValues: this.calculateMissingValues(),
            dataTypes: this.inferDataTypes()
        };
    }

    calculateMissingValues() {
        let totalMissing = 0;
        
        this.data.forEach(row => {
            this.columns.forEach(col => {
                if (!row[col] || row[col] === '' || row[col] === null || row[col] === undefined) {
                    totalMissing++;
                }
            });
        });
        
        return {
            total: totalMissing,
            percentage: (totalMissing / (this.data.length * this.columns.length)) * 100
        };
    }

    inferDataTypes() {
        const types = {};
        
        this.columns.forEach(col => {
            const sample = this.data.slice(0, 100).map(row => row[col]).filter(val => val);
            
            if (sample.every(val => !isNaN(val) && val !== '')) {
                types[col] = 'numeric';
            } else if (sample.every(val => this.isDate(val))) {
                types[col] = 'datetime';
            } else {
                types[col] = 'categorical';
            }
        });
        
        return types;
    }

    isDate(value) {
        const date = new Date(value);
        return date instanceof Date && !isNaN(date) && value.toString().match(/\d{4}/);
    }

    calculateDataQuality() {
        const missing = this.calculateMissingValues();
        const duplicates = this.findDuplicates();
        const outliers = this.detectOutliers();
        
        let score = 100;
        
        // Penalize for missing values
        score -= (missing.percentage * 0.5);
        
        // Penalize for duplicates
        score -= (duplicates.percentage * 0.3);
        
        // Penalize for outliers
        score -= (outliers.totalOutliers / this.data.length) * 10;
        
        return Math.max(0, Math.min(100, score));
    }

    findDuplicates() {
        const seen = new Set();
        const duplicates = [];
        
        this.data.forEach((row, index) => {
            const key = JSON.stringify(row);
            if (seen.has(key)) {
                duplicates.push(index);
            } else {
                seen.add(key);
            }
        });
        
        return {
            rows: duplicates,
            count: duplicates.length,
            percentage: (duplicates.length / this.data.length) * 100
        };
    }

    detectOutliers() {
        const outliers = {};
        let totalOutliers = 0;
        
        this.columns.forEach(col => {
            const values = this.data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
            if (values.length > 0) {
                const q1 = this.quantile(values, 0.25);
                const q3 = this.quantile(values, 0.75);
                const iqr = q3 - q1;
                const lowerBound = q1 - 1.5 * iqr;
                const upperBound = q3 + 1.5 * iqr;
                
                const colOutliers = this.data.map((row, index) => {
                    const val = parseFloat(row[col]);
                    return (val < lowerBound || val > upperBound) && !isNaN(val) ? index : null;
                }).filter(index => index !== null);
                
                if (colOutliers.length > 0) {
                    outliers[col] = colOutliers;
                    totalOutliers += colOutliers.length;
                }
            }
        });
        
        return {
            outliers,
            totalOutliers,
            columns: Object.keys(outliers)
        };
    }

    quantile(arr, q) {
        const sorted = [...arr].sort((a, b) => a - b);
        const pos = (sorted.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        
        if (sorted[base + 1] !== undefined) {
            return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        } else {
            return sorted[base];
        }
    }

    analyzeFeatures() {
        const analysis = {};
        
        this.columns.forEach(col => {
            const values = this.data.map(row => row[col]).filter(val => val !== '' && val !== null);
            const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
            
            analysis[col] = {
                type: this.inferDataTypes()[col],
                uniqueValues: new Set(values).size,
                nullCount: this.data.length - values.length,
                statistics: numericValues.length > 0 ? {
                    min: Math.min(...numericValues),
                    max: Math.max(...numericValues),
                    mean: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
                    median: this.median(numericValues),
                    stdDev: this.standardDeviation(numericValues)
                } : null,
                distribution: this.calculateDistribution(values, numericValues)
            };
        });
        
        return analysis;
    }

    median(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    standardDeviation(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - mean, 2));
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
    }

    calculateDistribution(values, numericValues) {
        if (numericValues.length > 0) {
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            const bins = 20;
            const binWidth = (max - min) / bins;
            const histogram = new Array(bins).fill(0);
            
            numericValues.forEach(val => {
                const binIndex = Math.min(Math.floor((val - min) / binWidth), bins - 1);
                histogram[binIndex]++;
            });
            
            return {
                type: 'histogram',
                bins: histogram,
                labels: Array.from({length: bins}, (_, i) => 
                    (min + i * binWidth).toFixed(2) + ' - ' + (min + (i + 1) * binWidth).toFixed(2)
                )
            };
        } else {
            const counts = {};
            values.forEach(val => {
                counts[val] = (counts[val] || 0) + 1;
            });
            
            return {
                type: 'categorical',
                values: Object.keys(counts),
                counts: Object.values(counts)
            };
        }
    }

    renderDashboard() {
        this.renderOverview();
        this.renderQualityIndicators();
        this.renderFeatureTabs();
        this.showControls(true);
    }

    renderOverview() {
        document.getElementById('totalRows').textContent = this.analysis.summary.totalRows.toLocaleString();
        document.getElementById('totalColumns').textContent = this.analysis.summary.totalColumns;
        document.getElementById('missingValues').textContent = 
            `${this.analysis.summary.missingValues.total} (${this.analysis.summary.missingValues.percentage.toFixed(1)}%)`;
        
        const qualityScore = Math.round(this.analysis.quality);
        document.getElementById('dataQuality').textContent = `${qualityScore}%`;
        document.getElementById('qualityScore').textContent = `${qualityScore}%`;
        document.getElementById('qualityBar').style.width = `${qualityScore}%`;
    }

    renderQualityIndicators() {
        // Duplicate analysis
        document.getElementById('duplicateRows').textContent = this.analysis.duplicates.count;
        document.getElementById('duplicatePercentage').textContent = 
            `${this.analysis.duplicates.percentage.toFixed(1)}%`;
        
        // Outlier analysis
        document.getElementById('totalOutliers').textContent = this.analysis.outliers.totalOutliers;
        document.getElementById('outlierColumns').textContent = this.analysis.outliers.columns.length;
    }

    renderFeatureTabs() {
        const tabsContainer = document.getElementById('featureTabs');
        tabsContainer.innerHTML = '';
        
        this.columns.forEach((col, index) => {
            const tab = document.createElement('button');
            tab.className = `feature-tab ${index === 0 ? 'active' : ''}`;
            tab.textContent = col;
            tab.onclick = () => this.switchFeature(col);
            tabsContainer.appendChild(tab);
        });
        
        if (this.columns.length > 0) {
            this.switchFeature(this.columns[0]);
        }
    }

    switchFeature(column, event) {
        this.currentFeature = column;
        document.querySelectorAll('.feature-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Handle both cases: with event parameter and without
        if (event && event.target) {
            event.target.classList.add('active');
        } else {
            // Find the tab element by column name and add active class
            const tabs = document.querySelectorAll('.feature-tab');
            tabs.forEach(tab => {
                if (tab.textContent === column) {
                    tab.classList.add('active');
                }
            });
        }
        
        this.renderFeatureAnalysis(column);
    }

    renderFeatureAnalysis(column) {
        const content = document.getElementById('featureContent');
        const analysis = this.analysis.featureAnalysis[column];
        
        content.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h4 class="text-lg font-semibold mb-4">Feature Analysis: ${column}</h4>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Data Type:</span>
                            <span class="type-badge type-${analysis.type}">${analysis.type}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Unique Values:</span>
                            <span>${analysis.uniqueValues}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Missing Values:</span>
                            <span>${analysis.nullCount}</span>
                        </div>
                        ${analysis.statistics ? `
                            <div class="border-t pt-3">
                                <h5 class="font-medium mb-2">Statistics</h5>
                                <div class="space-y-1 text-sm">
                                    <div class="flex justify-between">
                                        <span>Min:</span>
                                        <span>${analysis.statistics.min.toFixed(2)}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Max:</span>
                                        <span>${analysis.statistics.max.toFixed(2)}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Mean:</span>
                                        <span>${analysis.statistics.mean.toFixed(2)}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Median:</span>
                                        <span>${analysis.statistics.median.toFixed(2)}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Std Dev:</span>
                                        <span>${analysis.statistics.stdDev.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div>
                    <h4 class="text-lg font-semibold mb-4">Distribution</h4>
                    <div class="chart-container">
                        <canvas id="featureChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        this.renderFeatureChart(column, analysis);
    }

    renderFeatureChart(column, analysis) {
        const ctx = document.getElementById('featureChart').getContext('2d');
        
        if (this.charts.featureChart) {
            this.charts.featureChart.destroy();
        }
        
        if (analysis.distribution.type === 'histogram') {
            this.charts.featureChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: analysis.distribution.labels,
                    datasets: [{
                        label: 'Frequency',
                        data: analysis.distribution.bins,
                        backgroundColor: 'rgba(59, 130, 246, 0.6)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } else {
            this.charts.featureChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: analysis.distribution.values,
                    datasets: [{
                        label: 'Count',
                        data: analysis.distribution.counts,
                        backgroundColor: 'rgba(16, 185, 129, 0.6)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    showLoading(show) {
        document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
    }

    showProgress(show) {
        document.getElementById('uploadProgress').classList.toggle('hidden', !show);
    }

    showUploadSection(show) {
        document.getElementById('uploadSection').classList.toggle('hidden', !show);
        document.getElementById('dashboard').classList.toggle('hidden', show);
    }

    showControls(show) {
        document.getElementById('exportBtn').classList.toggle('hidden', !show);
        document.getElementById('resetBtn').classList.toggle('hidden', !show);
    }

    showError(message) {
        alert(message); // In production, use a proper notification system
    }

    resetApplication() {
        this.data = null;
        this.originalData = null;
        this.columns = [];
        this.currentFeature = null;
        this.analysis = {};
        
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
        
        document.getElementById('fileInput').value = '';
        this.showUploadSection(true);
        this.showControls(false);
    }

    async exportReport() {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            // Add title
            pdf.setFontSize(20);
            pdf.text('Data Analysis Report', 20, 20);
            
            // Add summary
            pdf.setFontSize(12);
            pdf.text(`Dataset Overview:`, 20, 40);
            pdf.text(`Total Rows: ${this.analysis.summary.totalRows}`, 20, 50);
            pdf.text(`Total Columns: ${this.analysis.summary.totalColumns}`, 20, 60);
            pdf.text(`Data Quality Score: ${Math.round(this.analysis.quality)}%`, 20, 70);
            
            // Add charts as images (simplified version)
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            
            // Create a simple visualization
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(0, 0, 800, 600);
            
            ctx.fillStyle = '#374151';
            ctx.font = '16px Arial';
            ctx.fillText('Data Analysis Report', 50, 50);
            
            // Save the PDF
            pdf.save('data-analysis-report.pdf');
        } catch (error) {
            console.error('Error exporting report:', error);
            this.showError('Error generating report. Please try again.');
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.dataVizPro = new DataVizPro();
});
