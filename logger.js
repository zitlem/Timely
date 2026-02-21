const fs = require('fs');
const path = require('path');

const LOG_DIR = 'logs';
const LOG_FILE = path.join(LOG_DIR, 'timer.log');
const MAX_SIZE = 1024 * 1024; // 1MB
const MAX_FILES = 2;

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

function formatTimestamp() {
    const now = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

    const month = months[now.getMonth()];
    const day = now.getDate();
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // Add ordinal suffix (st, nd, rd, th)
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';

    return `${month} ${day}${suffix} ${year} ${hours}:${minutes}:${seconds}`;
}

function formatDuration(hours, minutes, seconds) {
    const parts = [];
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    return parts.join(' ') || '0 seconds';
}

function formatTargetTime(targetDate, targetHour, targetMinute) {
    const date = new Date(targetDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const month = months[date.getMonth()];
    const day = date.getDate();
    const hours = String(targetHour).padStart(2, '0');
    const minutes = String(targetMinute).padStart(2, '0');

    return `${month} ${day} ${hours}:${minutes}:00`;
}

function rotateIfNeeded() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            const stats = fs.statSync(LOG_FILE);
            if (stats.size >= MAX_SIZE) {
                // Delete old rotated log if it exists
                const rotatedLog = LOG_FILE + '.1';
                if (fs.existsSync(rotatedLog)) {
                    fs.unlinkSync(rotatedLog);
                }
                // Rename current log to .1
                fs.renameSync(LOG_FILE, rotatedLog);
            }
        }
    } catch (error) {
        console.error('Error rotating log file:', error);
    }
}

function log(message) {
    try {
        rotateIfNeeded();
        const logEntry = `${message}\n`;
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (error) {
        console.error('Error writing to log file:', error);
    }
}

module.exports = {
    log,
    formatTimestamp,
    formatDuration,
    formatTargetTime,

    // Specific logging functions
    logDurationTimer: function(ip, hours, minutes, seconds, source = 'api') {
        const duration = formatDuration(hours, minutes, seconds);
        const timestamp = formatTimestamp();
        const message = `${ip} set a ${duration} timer via ${source} on ${timestamp}`;
        log(message);
    },

    logTargetTimer: function(ip, targetDate, targetHour, targetMinute, source = 'api') {
        const targetTime = formatTargetTime(targetDate, targetHour, targetMinute);
        const timestamp = formatTimestamp();
        const message = `${ip} set a target timer to ${targetTime} via ${source} on ${timestamp}`;
        log(message);
    },

    logAuth: function(ip, success) {
        const timestamp = formatTimestamp();
        const message = success
            ? `${ip} authenticated successfully on ${timestamp}`
            : `${ip} failed authentication on ${timestamp}`;
        log(message);
    },

    logAccess: function(ip, endpoint, authenticated = true, source = 'api') {
        const timestamp = formatTimestamp();
        const authStatus = authenticated ? 'authenticated' : 'unauthenticated';
        const message = `${ip} accessed ${endpoint} (${authStatus}) via ${source} on ${timestamp}`;
        log(message);
    },

    logAccessOutcome: function(ip, endpoint, outcome, source = 'api') {
        const timestamp = formatTimestamp();
        const message = `${ip} accessed ${endpoint} (${outcome}) via ${source} on ${timestamp}`;
        log(message);
    },

    logPause: function(ip, source = 'api') {
        const timestamp = formatTimestamp();
        const message = `${ip} paused timer via ${source} on ${timestamp}`;
        log(message);
    },

    logReset: function(ip, source = 'api') {
        const timestamp = formatTimestamp();
        const message = `${ip} reset timer via ${source} on ${timestamp}`;
        log(message);
    },

    logMessage: function(ip, message, duration, source = 'api') {
        const timestamp = formatTimestamp();
        const logEntry = `${ip} sent message "${message}" for ${duration}s via ${source} on ${timestamp}`;
        log(logEntry);
    },

    getLogFile: function() {
        return LOG_FILE;
    }
};
