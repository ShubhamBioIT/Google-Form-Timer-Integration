// Shared utility functions and configurations

// Configuration
const CONFIG = {
    GOOGLE_FORM_ID: '1FAIpQLSe98h8JuwgdzUlauVykobND66yGuOqiEEpyl913QP4NJ40DrA',
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwyzzoYLrbZ0syexcbuL5gkmuwrRG2J72VM-UIZHfyeDesa3s-CkXhu8CcB0w5AiFl6Ug/exec', // Replace with your script URL
    MAX_SURVEY_TIME: 1800, // 30 minutes maximum
    STORAGE_PREFIX: 'survey_timing_'
};

// Utility functions
const Utils = {
    // Generate unique session ID
    generateSessionId: () => {
        return 'survey_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    },

    // Format time duration
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    },

    // Format time for display (MM:SS)
    formatTimeDisplay: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },

    // Get device info
    getDeviceInfo: () => {
        return {
            userAgent: navigator.userAgent,
            screenSize: `${screen.width}x${screen.height}`,
            windowSize: `${window.innerWidth}x${window.innerHeight}`,
            platform: navigator.platform,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    },

    // Safe localStorage operations
    storage: {
        set: (key, value) => {
            try {
                localStorage.setItem(CONFIG.STORAGE_PREFIX + key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                return false;
            }
        },

        get: (key) => {
            try {
                const item = localStorage.getItem(CONFIG.STORAGE_PREFIX + key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.error('Storage get error:', e);
                return null;
            }
        },

        remove: (key) => {
            try {
                localStorage.removeItem(CONFIG.STORAGE_PREFIX + key);
                return true;
            } catch (e) {
                console.error('Storage remove error:', e);
                return false;
            }
        },

        clear: () => {
            try {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(CONFIG.STORAGE_PREFIX)) {
                        localStorage.removeItem(key);
                    }
                });
                return true;
            } catch (e) {
                console.error('Storage clear error:', e);
                return false;
            }
        }
    }
};

// Analytics and tracking
const Analytics = {
    // Track page view
    trackPageView: (page) => {
        console.log('Page view:', page, new Date().toISOString());
    },

    // Track event
    trackEvent: (event, data) => {
        console.log('Event:', event, data, new Date().toISOString());
    },

    // Track timing
    trackTiming: (category, variable, value) => {
        console.log('Timing:', category, variable, value + 'ms');
    }
};

// API functions for Google Sheets integration
const API = {
    // Send timing data to Google Apps Script
    sendTimingData: async (timingData) => {
        try {
            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'recordTiming',
                    data: timingData
                })
            });

            console.log('Timing data sent successfully');
            return { success: true };
        } catch (error) {
            console.error('Error sending timing data:', error);
            
            // Store locally as backup
            const backupKey = 'backup_' + timingData.sessionId;
            Utils.storage.set(backupKey, timingData);
            
            return { success: false, error: error.message };
        }
    },

    // Retry failed submissions
    retryFailedSubmissions: async () => {
        const keys = Object.keys(localStorage).filter(key => 
            key.startsWith(CONFIG.STORAGE_PREFIX + 'backup_')
        );

        for (const key of keys) {
            try {
                const data = Utils.storage.get(key.replace(CONFIG.STORAGE_PREFIX, ''));
                if (data) {
                    const result = await API.sendTimingData(data);
                    if (result.success) {
                        Utils.storage.remove(key.replace(CONFIG.STORAGE_PREFIX, ''));
                        console.log('Retry successful for:', key);
                    }
                }
            } catch (error) {
                console.error('Retry failed for:', key, error);
            }
        }
    }
};

// Performance monitoring
const Performance = {
    marks: {},

    // Mark start of operation
    mark: (name) => {
        Performance.marks[name] = performance.now();
    },

    // Measure time since mark
    measure: (name, startMark) => {
        const endTime = performance.now();
        const startTime = Performance.marks[startMark] || 0;
        const duration = endTime - startTime;
        
        Analytics.trackTiming('Performance', name, duration);
        return duration;
    }
};

// Initialize shared functionality
document.addEventListener('DOMContentLoaded', function() {
    // Performance tracking
    Performance.mark('page_load_start');
    
    // Track page view
    const page = window.location.pathname.includes('form.html') ? 'form' : 'home';
    Analytics.trackPageView(page);
    
    // Retry any failed submissions on page load
    API.retryFailedSubmissions();
    
    // Clean up old data (older than 7 days)
    cleanupOldData();
});

// Cleanup function
function cleanupOldData() {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CONFIG.STORAGE_PREFIX)) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data && data.timestamp && new Date(data.timestamp).getTime() < oneWeekAgo) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // Remove corrupted entries
                localStorage.removeItem(key);
            }
        }
    });
}

// Export utilities for use in other scripts
window.SurveyUtils = Utils;
window.SurveyAnalytics = Analytics;
window.SurveyAPI = API;
window.SurveyPerformance = Performance;
