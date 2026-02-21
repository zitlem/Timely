const express = require('express');
const path = require('path');
const fs = require('fs');
const ipRangeCheck = require('ip-range-check');
const session = require('express-session');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 80;

// Middleware
app.use(express.json());
app.use(express.static('static'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
    secret: 'timer-control-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
}));

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Allow embedding in iframes when ?embed=true is in the URL (for Home Assistant, etc.)
    if (req.query.embed === 'true') {
        // Allow framing from anywhere
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; frame-ancestors *;");
        // Don't set X-Frame-Options to allow embedding
    } else {
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:;");
    }
    next();
});

// IP whitelist configuration
let CONTROL_WHITELIST = [
    // '127.0.0.1',       // localhost
    // '::1',             // localhost IPv6
    // '192.168.2.0/24',  // example local subnet
    // '10.1.10.0/24',    // example local subnet
];

// Load whitelist from JSON file if it exists
try {
    if (fs.existsSync('control_whitelist.json')) {
        const fileWhitelist = JSON.parse(fs.readFileSync('control_whitelist.json', 'utf8'));
        CONTROL_WHITELIST = CONTROL_WHITELIST.concat(fileWhitelist);
    }
} catch (error) {
    console.log('Warning: Could not load control_whitelist.json');
}

// Load configuration for password
let CONFIG = { controlPassword: 'admin', trustProxy: false }; // Default config
try {
    if (fs.existsSync('config.json')) {
        const configData = JSON.parse(fs.readFileSync('config.json', 'utf8'));
        CONFIG = { ...CONFIG, ...configData };
    }
} catch (error) {
    console.log('Warning: Could not load config.json, using default password');
}

// Rate limiting for login attempts
const loginAttempts = new Map(); // IP -> { count, firstAttempt }
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip) {
    const now = Date.now();
    const attempt = loginAttempts.get(ip);

    if (!attempt) return false;

    // Reset if window expired
    if (now - attempt.firstAttempt > RATE_LIMIT_WINDOW) {
        loginAttempts.delete(ip);
        return false;
    }

    return attempt.count >= RATE_LIMIT_MAX;
}

function recordLoginAttempt(ip) {
    const now = Date.now();
    const attempt = loginAttempts.get(ip);

    if (!attempt || now - attempt.firstAttempt > RATE_LIMIT_WINDOW) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
    } else {
        attempt.count++;
    }
}

function clearLoginAttempts(ip) {
    loginAttempts.delete(ip);
}

// IP validation regex patterns
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV4_CIDR_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
const IPV6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^::1$|^::$/;

function isValidIP(ip) {
    if (!ip || typeof ip !== 'string') return false;

    // Check IPv4
    if (IPV4_REGEX.test(ip)) return true;

    // Check IPv4 CIDR
    if (IPV4_CIDR_REGEX.test(ip)) return true;

    // Check IPv6 (basic validation)
    if (IPV6_REGEX.test(ip)) return true;

    // Check IPv6 CIDR (simplified)
    if (ip.includes(':') && ip.includes('/')) {
        const [addr, prefix] = ip.split('/');
        const prefixNum = parseInt(prefix, 10);
        if (IPV6_REGEX.test(addr) && prefixNum >= 0 && prefixNum <= 128) {
            return true;
        }
    }

    return false;
}

// Color validation
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

function isValidColor(color) {
    if (!color || typeof color !== 'string') return false;
    return color === 'transparent' || HEX_COLOR_REGEX.test(color);
}

function sanitizeColor(color, defaultColor) {
    if (isValidColor(color)) return color;
    return defaultColor;
}

// Safe parseInt with bounds
function safeParseInt(value, defaultVal, min, max) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return defaultVal;
    if (parsed < min) return min;
    if (parsed > max) return max;
    return parsed;
}


// Countdown timer class
class CountdownTimer {
    constructor() {
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.running = false;
        this.paused = false;
        this.startTime = null;
        this.pauseTime = null;
        this.finished = false;
        this.countingUp = false;
        this.targetTime = null; // For countdown to specific time
        this.isTargetMode = false;
        this.message = ''; // Temporary message to display
        this.messageExpires = 0; // Timestamp when message expires
    }
    
    start(hours = 0, minutes = 0, seconds = 0, targetTime = null, countingUp = true, targetDate = null, targetHour = null, targetMinute = null) {
        if (!this.running && !this.paused) {
            // Starting fresh timer
            this.countingUp = countingUp; // Set countingUp mode when starting

            if (targetDate && targetHour !== null && targetMinute !== null) {
                // Countdown to specific time mode - create datetime on server
                this.isTargetMode = true;

                // Parse date components from "YYYY-MM-DD"
                const [year, month, day] = targetDate.split('-').map(Number);

                // Ensure hour and minute are integers
                const hour = parseInt(targetHour);
                const minute = parseInt(targetMinute);

                // Create datetime in SERVER's timezone (month is 0-indexed)
                const targetDateTime = new Date(year, month - 1, day, hour, minute, 0, 0);

                // Store as ISO string for persistence
                this.targetTime = targetDateTime.toISOString();

                // Calculate remaining time
                const now = Date.now();
                const target = targetDateTime.getTime();
                this.remainingSeconds = Math.max(0, (target - now) / 1000);
                this.totalSeconds = this.remainingSeconds;

                console.log(`Timer started to target time: ${targetDateTime.toLocaleString()}, countingUp: ${countingUp}`);
            } else if (targetTime) {
                // Legacy support: if targetTime ISO string is passed (for persistence loading)
                this.isTargetMode = true;
                this.targetTime = targetTime;
                const now = Date.now();
                const target = new Date(targetTime).getTime();
                this.remainingSeconds = Math.max(0, (target - now) / 1000);
                this.totalSeconds = this.remainingSeconds;
                console.log(`Timer started to target time: ${new Date(targetTime).toLocaleString()}, countingUp: ${countingUp}`);
            } else {
                // Duration mode
                this.isTargetMode = false;
                this.targetTime = null;
                this.totalSeconds = hours * 3600 + minutes * 60 + seconds;
                this.remainingSeconds = this.totalSeconds;
                console.log(`Timer started: ${this.remainingSeconds} seconds remaining, countingUp: ${countingUp}`);
            }
            this.finished = false;
        } else if (this.paused) {
            // Resuming from pause
            this.finished = false;
        }

        // Allow resuming when counting up (negative remainingSeconds), in target mode, or with positive time
        if (this.remainingSeconds > 0 || this.isTargetMode || (this.countingUp && this.remainingSeconds <= 0)) {
            this.running = true;
            this.paused = false;
            this.startTime = Date.now();
        }
    }
    
    pause() {
        if (this.running) {
            this.paused = true;
            this.running = false;
            this.pauseTime = Date.now();
            // Update remaining seconds when pausing
            const elapsed = (this.pauseTime - this.startTime) / 1000;
            // Allow negative values when counting up
            if (this.countingUp) {
                this.remainingSeconds = this.remainingSeconds - elapsed;
            } else {
                this.remainingSeconds = Math.max(0, this.remainingSeconds - elapsed);
            }
            console.log(`Timer paused: ${this.remainingSeconds} seconds remaining`);
        }
    }
    
    reset() {
        this.running = false;
        this.paused = false;
        this.remainingSeconds = 0;
        this.totalSeconds = 0;
        this.startTime = null;
        this.pauseTime = null;
        this.finished = false;
        this.countingUp = false;
        this.targetTime = null;
        this.isTargetMode = false;
        console.log('Timer reset');
    }
    
    getStatus() {
        const currentTime = Date.now();

        if (this.running && this.startTime) {
            let remaining;

            if (this.isTargetMode && this.targetTime) {
                // Calculate remaining time to target
                const target = new Date(this.targetTime).getTime();
                remaining = (target - currentTime) / 1000;
            } else {
                // Regular duration mode
                const elapsed = (currentTime - this.startTime) / 1000;
                remaining = this.remainingSeconds - elapsed;
            }

            // Check if timer has finished countdown
            if (remaining <= 0 && !this.countingUp) {
                remaining = 0;
                if (!this.finished) {
                    this.finished = true;
                    this.running = false;
                    console.log('Timer finished!');
                }
            } else if (remaining < 0 && this.countingUp) {
                // Continue counting up (negative remaining means counting up)
                this.finished = true; // Mark as finished to indicate countdown is done
            }

            return {
                running: this.running,
                paused: this.paused,
                remaining: this.countingUp ? remaining : Math.max(0, remaining),
                finished: this.finished,
                total: this.totalSeconds,
                countingUp: this.countingUp,
                isTargetMode: this.isTargetMode,
                targetTime: this.targetTime,
                serverTime: currentTime, // Include server timestamp for better sync
                message: this.message,
                messageExpires: this.messageExpires
            };
        } else {
            return {
                running: this.running,
                paused: this.paused,
                remaining: this.countingUp ? this.remainingSeconds : Math.max(0, this.remainingSeconds),
                finished: this.finished,
                total: this.totalSeconds,
                countingUp: this.countingUp,
                isTargetMode: this.isTargetMode,
                targetTime: this.targetTime,
                serverTime: currentTime,
                message: this.message,
                messageExpires: this.messageExpires
            };
        }
    }
}

// Global instances
const timer = new CountdownTimer();

// Timer persistence
const TIMER_STATE_FILE = 'timer_state.json';

function saveTimerState() {
    const state = {
        totalSeconds: timer.totalSeconds,
        remainingSeconds: timer.remainingSeconds,
        running: timer.running,
        paused: timer.paused,
        startTime: timer.startTime,
        pauseTime: timer.pauseTime,
        finished: timer.finished,
        countingUp: timer.countingUp,
        targetTime: timer.targetTime,
        isTargetMode: timer.isTargetMode,
        message: timer.message,
        messageExpires: timer.messageExpires,
        savedAt: Date.now()
    };

    try {
        fs.writeFileSync(TIMER_STATE_FILE, JSON.stringify(state, null, 4));
        console.log('Timer state saved');
    } catch (error) {
        console.error('Error saving timer state:', error);
    }
}

function loadTimerState() {
    if (fs.existsSync(TIMER_STATE_FILE)) {
        try {
            const state = JSON.parse(fs.readFileSync(TIMER_STATE_FILE, 'utf8'));
            timer.totalSeconds = state.totalSeconds || 0;
            timer.remainingSeconds = state.remainingSeconds || 0;
            timer.running = state.running || false;
            timer.paused = state.paused || false;
            timer.startTime = state.startTime || null;
            timer.pauseTime = state.pauseTime || null;
            timer.finished = state.finished || false;
            timer.countingUp = state.countingUp || false;
            timer.targetTime = state.targetTime || null;
            timer.isTargetMode = state.isTargetMode || false;
            timer.message = state.message || '';
            timer.messageExpires = state.messageExpires || 0;
            console.log('Timer state loaded:', state.running ? 'Running' : 'Stopped');
        } catch (error) {
            console.error('Error loading timer state:', error);
        }
    }
}

// Load persisted state
loadTimerState();

// Message history persistence
const MESSAGE_HISTORY_FILE = 'message_history.json';
const MAX_MESSAGE_HISTORY = 20;
let messageHistory = [];

function loadMessageHistory() {
    try {
        if (fs.existsSync(MESSAGE_HISTORY_FILE)) {
            const data = fs.readFileSync(MESSAGE_HISTORY_FILE, 'utf8');
            messageHistory = JSON.parse(data);
            if (!Array.isArray(messageHistory)) {
                messageHistory = [];
            }
            console.log(`Loaded ${messageHistory.length} messages from history`);
        }
    } catch (error) {
        console.error('Error loading message history:', error);
        messageHistory = [];
    }
}

function saveMessageHistory() {
    try {
        fs.writeFileSync(MESSAGE_HISTORY_FILE, JSON.stringify(messageHistory, null, 2));
    } catch (error) {
        console.error('Error saving message history:', error);
    }
}

function addToMessageHistory(message) {
    if (!message || typeof message !== 'string' || message.trim() === '') return;

    const trimmedMessage = message.trim();

    // Remove duplicate if exists
    messageHistory = messageHistory.filter(m => m !== trimmedMessage);

    // Add to beginning (most recent first)
    messageHistory.unshift(trimmedMessage);

    // Limit to MAX_MESSAGE_HISTORY entries
    if (messageHistory.length > MAX_MESSAGE_HISTORY) {
        messageHistory = messageHistory.slice(0, MAX_MESSAGE_HISTORY);
    }

    saveMessageHistory();
}

// Load message history on startup
loadMessageHistory();

// Watch for external changes to message history file
let messageHistoryWatcher = null;
try {
    messageHistoryWatcher = fs.watch(MESSAGE_HISTORY_FILE, (eventType) => {
        if (eventType === 'change') {
            // Debounce: wait a bit before reloading to avoid multiple reloads
            setTimeout(() => {
                console.log('Message history file changed externally, reloading...');
                loadMessageHistory();
            }, 100);
        }
    });
    console.log('Watching message_history.json for changes');
} catch (error) {
    console.log('Could not watch message_history.json:', error.message);
}

// Utility functions
function getClientIP(req) {
    // Only trust proxy headers if explicitly configured
    if (CONFIG.trustProxy) {
        const forwarded = req.headers['x-forwarded-for']?.split(',')[0]?.trim();
        if (forwarded) return forwarded;

        const realIP = req.headers['x-real-ip'];
        if (realIP) return realIP;
    }

    return req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.ip;
}

function isIPWhitelisted(ip) {
    if (CONTROL_WHITELIST.length === 0) return false;

    try {
        return CONTROL_WHITELIST.some(entry => {
            if (entry.includes('/')) {
                // CIDR notation
                return ipRangeCheck(ip, entry);
            } else {
                // Single IP
                return ip === entry;
            }
        });
    } catch (error) {
        console.error('Error checking IP whitelist:', error);
        return false;
    }
}

function isAuthenticated(req) {
    const clientIP = getClientIP(req);
    const ipWhitelisted = isIPWhitelisted(clientIP);
    const sessionAuthenticated = req.session && req.session.authenticated === true;

    return ipWhitelisted || sessionAuthenticated;
}

// Access logging middleware
accessLoggingMiddleware = (req, res, next) => {
    const clientIP = getClientIP(req);
    const endpoint = req.path;
    const authenticated = isAuthenticated(req);

    // Determine source: gui (from body), browser (GET requests), or api (POST without source)
    let source;
    if (req.body?.source) {
        source = req.body.source;
    } else if (req.method === 'GET') {
        source = 'browser';
    } else {
        source = 'api';
    }

    // Store source on request for use in route handlers
    req.logSource = source;

    // Only log authenticated requests here; unauthenticated access logged in route handlers with outcome
    if (authenticated && !endpoint.startsWith('/static') && endpoint !== '/api/status') {
        logger.logAccess(clientIP, endpoint, true, source);
    }

    next();
};

// Apply access logging middleware
app.use(accessLoggingMiddleware);

// Routes
app.get('/', (req, res) => {
    // Get URL parameters with defaults (with validation)
    const transparentBg = req.query['transparent-bg'] === 'true';
    const background = transparentBg ? 'transparent' : sanitizeColor(req.query.background, '#000000');
    const fontColor = sanitizeColor(req.query['font-color'], '#00ff00');
    const warningColor1 = sanitizeColor(req.query['warning-color-1'], '#ff8800');
    const warningColor2 = sanitizeColor(req.query['warning-color-2'], '#ff4444');
    const countUpColor = sanitizeColor(req.query['count-up-color'], warningColor2); // Default to warning-color-2
    const showSeconds = req.query['show-seconds'] !== 'false';
    const hideHourAuto = req.query['hide-hour-auto'] === 'on';
    const hideSecondsOverHour = req.query['hide-seconds-over-hour'] === 'true';
    const showShadow = req.query['no-shadow'] !== 'true';
    const fontSize = safeParseInt(req.query['font-size'], 100, 10, 500);
    const stopAtZero = req.query['stop-at-zero'] === 'true';
    const flashIndefinitely = req.query['flash-indefinitely'] !== 'false'; // Default to true
    const flashCountUp = req.query['flash-count-up'] !== 'false'; // Default to true
    const showClock = req.query['show-clock'] === 'true'; // Default to false
    const showOnlyClock = req.query['show-only-clock'] === 'true'; // Default to false
    const clock24Hour = req.query['clock-24-hour'] !== 'false'; // Default to true (24-hour)
    const clockShowSeconds = req.query['clock-show-seconds'] !== 'false'; // Default to true
    const clockShowAmPm = req.query['clock-show-ampm'] !== 'false'; // Default to true
    const showMessages = req.query['show-messages'] !== 'false'; // Default to true
    let position = (req.query.position || 'center').toLowerCase();

    // Validate position parameter
    const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
    if (!validPositions.includes(position)) {
        position = 'center';
    }

    // Don't set timer.countingUp globally - it will be set when timer starts
    // Just pass the stopAtZero flag to the client

    res.render('timer', {
        background,
        transparent_bg: transparentBg,
        font_color: fontColor,
        warning_color_1: warningColor1,
        warning_color_2: warningColor2,
        count_up_color: countUpColor,
        show_seconds: showSeconds,
        hide_hour_auto: hideHourAuto,
        hide_seconds_over_hour: hideSecondsOverHour,
        show_shadow: showShadow,
        font_size: fontSize,
        stop_at_zero: stopAtZero,
        flash_indefinitely: flashIndefinitely,
        flash_count_up: flashCountUp,
        show_clock: showClock,
        show_only_clock: showOnlyClock,
        clock_24_hour: clock24Hour,
        clock_show_seconds: clockShowSeconds,
        clock_show_ampm: clockShowAmPm,
        show_messages: showMessages,
        position
    });
});

app.get('/control', (req, res) => {
    const clientIP = getClientIP(req);
    const ipWhitelisted = isIPWhitelisted(clientIP);
    const sessionAuthenticated = req.session && req.session.authenticated === true;

    // If not authenticated by IP or session, show login page
    if (!ipWhitelisted && !sessionAuthenticated) {
        logger.logAccessOutcome(clientIP, '/control', 'shown login', req.logSource || 'browser');
        return res.render('control-login', {
            clientIP: clientIP
        });
    }

    // Authenticated - show control page
    const transparentBg = req.query['transparent-bg'] === 'true';
    const background = req.query.background || null;
    res.render('control', {
        transparent_bg: transparentBg,
        background: background
    });
});

app.get('/help', (req, res) => {
    const transparentBg = req.query['transparent-bg'] === 'true';
    const background = req.query.background || null;
    res.render('help', {
        transparent_bg: transparentBg,
        background: background
    });
});

// API Routes
app.post('/api/start', (req, res) => {
    const clientIP = getClientIP(req);

    if (!isAuthenticated(req)) {
        logger.logAccessOutcome(clientIP, '/api/start', 'denied', req.logSource || 'api');
        return res.status(403).json({ error: 'Access denied' });
    }

    const {
        hours = 0,
        minutes = 0,
        seconds = 0,
        targetDate = null,
        targetHour = null,
        targetMinute = null,
        countingUp = true,
        source = 'api'
    } = req.body;

    // Parse and validate time values
    const parsedHours = safeParseInt(hours, 0, 0, 99);
    const parsedMinutes = safeParseInt(minutes, 0, 0, 59);
    const parsedSeconds = safeParseInt(seconds, 0, 0, 59);
    const parsedTargetHour = safeParseInt(targetHour, 0, 0, 23);
    const parsedTargetMinute = safeParseInt(targetMinute, 0, 0, 59);

    if (targetDate !== null && targetHour !== null && targetMinute !== null) {
        // Target time mode - create datetime on server
        logger.logTargetTimer(clientIP, targetDate, parsedTargetHour, parsedTargetMinute, source);
        timer.start(0, 0, 0, null, countingUp, targetDate, parsedTargetHour, parsedTargetMinute);
    } else {
        // Duration mode
        logger.logDurationTimer(clientIP, parsedHours, parsedMinutes, parsedSeconds, source);
        timer.start(parsedHours, parsedMinutes, parsedSeconds, null, countingUp);
    }

    saveTimerState();
    res.json({ success: true });
});

app.post('/api/pause', (req, res) => {
    const clientIP = getClientIP(req);

    if (!isAuthenticated(req)) {
        logger.logAccessOutcome(clientIP, '/api/pause', 'denied', req.logSource || 'api');
        return res.status(403).json({ error: 'Access denied' });
    }

    const { source = 'api' } = req.body;
    logger.logPause(clientIP, source);
    timer.pause();
    saveTimerState();
    res.json({ success: true });
});

app.post('/api/reset', (req, res) => {
    const clientIP = getClientIP(req);

    if (!isAuthenticated(req)) {
        logger.logAccessOutcome(clientIP, '/api/reset', 'denied', req.logSource || 'api');
        return res.status(403).json({ error: 'Access denied' });
    }

    const { source = 'api' } = req.body;
    logger.logReset(clientIP, source);
    timer.reset();
    saveTimerState();
    res.json({ success: true });
});

app.post('/api/message', (req, res) => {
    const clientIP = getClientIP(req);

    if (!isAuthenticated(req)) {
        logger.logAccessOutcome(clientIP, '/api/message', 'denied', req.logSource || 'api');
        return res.status(403).json({ error: 'Access denied' });
    }

    const { message, duration = 10, source = 'api' } = req.body;
    const parsedDuration = safeParseInt(duration, 10, 1, 300); // 1s to 5min
    timer.message = message?.substring(0, 200) || '';
    timer.messageExpires = Date.now() + parsedDuration * 1000;
    saveTimerState();
    addToMessageHistory(timer.message);
    logger.logMessage(clientIP, timer.message, parsedDuration, source);
    console.log(`Message set by ${clientIP}: "${timer.message}" for ${parsedDuration}s (source: ${source})`);
    res.json({ success: true });
});

app.post('/api/message/clear', (req, res) => {
    const clientIP = getClientIP(req);

    if (!isAuthenticated(req)) {
        logger.logAccessOutcome(clientIP, '/api/message/clear', 'denied', req.logSource || 'api');
        return res.status(403).json({ error: 'Access denied' });
    }

    const { source = 'api' } = req.body;
    timer.message = '';
    timer.messageExpires = 0;
    saveTimerState();
    console.log(`Message cleared by ${clientIP} (source: ${source})`);
    res.json({ success: true });
});

app.get('/api/message/history', (req, res) => {
    if (!isAuthenticated(req)) {
        logger.logAccessOutcome(getClientIP(req), '/api/message/history', 'denied', req.logSource || 'api');
        return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ history: messageHistory });
});

app.get('/api/status', (req, res) => {
    // Get timer status
    const timerStatus = timer.getStatus();

    res.json(timerStatus);
});

// Authentication endpoint
app.post('/api/auth', (req, res) => {
    const clientIP = getClientIP(req);
    const { password } = req.body;

    // Check rate limiting
    if (isRateLimited(clientIP)) {
        logger.logAuth(clientIP, false);
        return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
    }

    if (!password) {
        return res.status(400).json({ error: 'Password required' });
    }

    if (password === CONFIG.controlPassword) {
        // Set session authenticated flag
        req.session.authenticated = true;
        clearLoginAttempts(clientIP); // Clear on successful login
        logger.logAuth(clientIP, true);
        res.json({ success: true });
    } else {
        recordLoginAttempt(clientIP);
        logger.logAuth(clientIP, false);
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    const clientIP = getClientIP(req);

    req.session.destroy((err) => {
        if (err) {
            console.error(`Logout error for ${clientIP}:`, err);
            return res.status(500).json({ error: 'Failed to logout' });
        }

        console.log(`User logged out from ${clientIP}`);
        res.json({ success: true });
    });
});


app.get('/api/whitelist', (req, res) => {
    if (!isAuthenticated(req)) {
        logger.logAccessOutcome(getClientIP(req), '/api/whitelist', 'denied', req.logSource || 'browser');
        return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
        whitelist: CONTROL_WHITELIST,
        your_ip: getClientIP(req),
        access: 'granted'
    });
});

// Add IP to whitelist
app.post('/api/whitelist/add', (req, res) => {
    if (!isAuthenticated(req)) {
        logger.logAccessOutcome(getClientIP(req), '/api/whitelist/add', 'denied', req.logSource || 'api');
        return res.status(403).json({ error: 'Access denied' });
    }

    const { ip } = req.body;

    if (!ip || typeof ip !== 'string') {
        return res.status(400).json({ error: 'Invalid IP address' });
    }

    const trimmedIP = ip.trim();

    // Basic validation
    if (trimmedIP.length === 0) {
        return res.status(400).json({ error: 'IP address cannot be empty' });
    }

    // Validate IP format
    if (!isValidIP(trimmedIP)) {
        return res.status(400).json({ error: 'Invalid IP address format. Use IPv4, IPv6, or CIDR notation.' });
    }

    // Check if already exists
    if (CONTROL_WHITELIST.includes(trimmedIP)) {
        return res.status(400).json({ error: 'IP already in whitelist' });
    }

    // Add to whitelist
    CONTROL_WHITELIST.push(trimmedIP);

    // Save to file
    try {
        fs.writeFileSync('control_whitelist.json', JSON.stringify(CONTROL_WHITELIST, null, 4));
        console.log(`IP added to whitelist: ${trimmedIP} by ${getClientIP(req)}`);
        res.json({ success: true, whitelist: CONTROL_WHITELIST });
    } catch (error) {
        console.error('Error saving whitelist:', error);
        // Remove from memory if save failed
        CONTROL_WHITELIST = CONTROL_WHITELIST.filter(entry => entry !== trimmedIP);
        res.status(500).json({ error: 'Failed to save whitelist' });
    }
});

// Remove IP from whitelist
app.post('/api/whitelist/remove', (req, res) => {
    if (!isAuthenticated(req)) {
        logger.logAccessOutcome(getClientIP(req), '/api/whitelist/remove', 'denied', req.logSource || 'api');
        return res.status(403).json({ error: 'Access denied' });
    }

    const { ip } = req.body;

    if (!ip || typeof ip !== 'string') {
        return res.status(400).json({ error: 'Invalid IP address' });
    }

    const trimmedIP = ip.trim();

    // Check if exists
    if (!CONTROL_WHITELIST.includes(trimmedIP)) {
        return res.status(400).json({ error: 'IP not found in whitelist' });
    }

    // Remove from whitelist
    CONTROL_WHITELIST = CONTROL_WHITELIST.filter(entry => entry !== trimmedIP);

    // Save to file
    try {
        fs.writeFileSync('control_whitelist.json', JSON.stringify(CONTROL_WHITELIST, null, 4));
        console.log(`IP removed from whitelist: ${trimmedIP} by ${getClientIP(req)}`);
        res.json({ success: true, whitelist: CONTROL_WHITELIST });
    } catch (error) {
        console.error('Error saving whitelist:', error);
        // Re-add to memory if save failed
        CONTROL_WHITELIST.push(trimmedIP);
        res.status(500).json({ error: 'Failed to save whitelist' });
    }
});

// Startup info
function printWhitelistInfo() {
    console.log('Starting Timer Server...');
    console.log('Control access configured for:');
    CONTROL_WHITELIST.forEach((entry, index) => {
        if (entry.includes('/')) {
            console.log(`  ${index + 1}. Subnet: ${entry}`);
        } else {
            console.log(`  ${index + 1}. IP: ${entry}`);
        }
    });
    console.log(`\nTotal whitelist entries: ${CONTROL_WHITELIST.length}`);
}

// Helper function to extract date from log message
function extractDateFromMessage(message) {
    // Extract timestamp like "January 1st 2026 20:08:21" from message
    const timestampRegex = /on ([A-Z][a-z]+) (\d+)(?:st|nd|rd|th)? (\d{4}) (\d{2}):(\d{2}):(\d{2})/;
    const match = message.match(timestampRegex);

    if (match) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const month = monthNames.indexOf(match[1]);
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);

        if (month !== -1) {
            // Return YYYY-MM-DD format for easy comparison
            return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }
    return '';
}

// Helper function to detect event type from message
function detectEventType(message) {
    if (message.includes('accessed')) return 'access';
    if (message.includes('set a')) return 'timer';
    if (message.includes('authenticated') || message.includes('failed authentication')) return 'auth';
    if (message.includes('paused')) return 'pause';
    if (message.includes('reset')) return 'reset';
    return 'other';
}

// Log viewer endpoint (requires authentication)
app.get('/log', (req, res) => {
    if (!isAuthenticated(req)) {
        logger.logAccessOutcome(getClientIP(req), '/log', 'denied', req.logSource || 'browser');
        return res.status(403).send('Access denied. Please authenticate first.');
    }

    try {
        const logFile = logger.getLogFile();
        const rotatedLog = logFile + '.1';

        let logsText = '';

        // Read rotated log first (older entries)
        if (fs.existsSync(rotatedLog)) {
            logsText += fs.readFileSync(rotatedLog, 'utf8');
        }

        // Read current log (newer entries)
        if (fs.existsSync(logFile)) {
            logsText += fs.readFileSync(logFile, 'utf8');
        }

        // Parse logs into structured array
        const logs = [];
        if (logsText) {
            const lines = logsText.trim().split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    // Extract IP address from start of line
                    // Format: "<IP> <message>"
                    const match = line.match(/^(\S+)\s+(.+)$/);
                    if (match) {
                        const ip = match[1];
                        const message = match[2];

                        logs.push({
                            ip: ip,
                            message: message,
                            fullLine: line,
                            date: extractDateFromMessage(message),
                            eventType: detectEventType(message)
                        });
                    } else {
                        // Fallback for lines that don't match expected format
                        logs.push({
                            ip: '',
                            message: line,
                            fullLine: line,
                            date: '',
                            eventType: 'other'
                        });
                    }
                }
            });
        }

        // Reverse to show newest entries first
        logs.reverse();

        // Render HTML template
        res.render('log', { logs });
    } catch (error) {
        console.error('Error reading log file:', error);
        res.status(500).send('Error reading log file');
    }
});

// 404 handler - log and redirect to control page
app.use((req, res) => {
    const clientIP = getClientIP(req);
    logger.log(`${clientIP} requested non-existent path ${req.path} (404) on ${logger.formatTimestamp()}`);
    res.redirect('/control');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    printWhitelistInfo();
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Auto-save timer state periodically
setInterval(() => {
    if (timer.running) {
        saveTimerState();
    }
}, 10000); // Every 10 seconds