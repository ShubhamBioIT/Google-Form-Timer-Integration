// Simple Google Sheets integration using Google Apps Script Web App
// This is a minimal approach that works without complex API setup

class SurveyTimingTracker {
    constructor(sheetId) {
        this.sheetId = sheetId;
        this.apiUrl = `https://script.google.com/macros/s/${sheetId}/exec`;
    }

    async recordTiming(data) {
        try {
            // Store locally first
            const localKey = `timing_${data.sessionId}`;
            localStorage.setItem(localKey, JSON.stringify(data));

            // For now, we'll just log the data
            // You can later integrate with a simple Google Apps Script
            console.log('📊 Timing Data Recorded:', {
                timestamp: data.timestamp,
                email: data.email,
                sessionId: data.sessionId,
                duration: `${data.timeTakenMinutes} minutes`,
                status: data.status
            });

            return { success: true };
        } catch (error) {
            console.error('Error recording timing:', error);
            return { success: false, error: error.message };
        }
    }

    // Export timing data as CSV
    exportTimingData() {
        const timingData = [];
        
        // Get all timing data from localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('timing_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    timingData.push(data);
                } catch (e) {
                    console.error('Error parsing timing data:', e);
                }
            }
        }

        if (timingData.length === 0) {
            alert('No timing data found');
            return;
        }

        // Convert to CSV
        const headers = ['Timestamp', 'Email', 'Session ID', 'Start Time', 'End Time', 'Time Taken (seconds)', 'Time Taken (minutes)', 'Device Info', 'Status'];
        const csvContent = [
            headers.join(','),
            ...timingData.map(row => [
                row.timestamp,
                row.email,
                row.sessionId,
                row.startTime,
                row.endTime,
                row.timeTakenSeconds,
                row.timeTakenMinutes,
                `"${row.deviceInfo}"`,
                row.status
            ].join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey_timing_data_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

// Usage
window.SurveyTimingTracker = SurveyTimingTracker;
