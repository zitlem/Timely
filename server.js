const express = require('express');
const path = require('path');
const fs = require('fs');
const ipRangeCheck = require('ip-range-check');

const app = express();
const PORT = process.env.PORT || 80;

// Middleware
app.use(express.json());
app.use(express.static('static'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
    }
    
    start(hours = 0, minutes = 0, seconds = 0, targetTime = null, countingUp = true) {
        if (!this.running && !this.paused) {
            // Starting fresh timer
            this.countingUp = countingUp; // Set countingUp mode when starting

            if (targetTime) {
                // Countdown to specific time mode
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

        if (this.remainingSeconds > 0 || this.isTargetMode) {
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
            this.remainingSeconds = Math.max(0, this.remainingSeconds - elapsed);
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
                serverTime: currentTime // Include server timestamp for better sync
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
                serverTime: currentTime
            };
        }
    }
}

// Global instances
const timer = new CountdownTimer();

// Utility functions
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
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

// Routes
app.get('/', (req, res) => {
    // Get URL parameters with defaults
    const transparentBg = req.query['transparent-bg'] === 'true';
    const background = transparentBg ? 'transparent' : (req.query.background || '#000000');
    const fontColor = req.query['font-color'] || '#00ff00';
    const warningColor1 = req.query['warning-color-1'] || '#ff8800';
    const warningColor2 = req.query['warning-color-2'] || '#ff4444';
    const countUpColor = req.query['count-up-color'] || warningColor2; // Default to warning-color-2
    const showSeconds = req.query['show-seconds'] !== 'false';
    const hideHourAuto = req.query['hide-hour-auto'] === 'on';
    const hideSecondsOverHour = req.query['hide-seconds-over-hour'] === 'true';
    const showShadow = req.query['no-shadow'] !== 'true';
    const fontSize = parseInt(req.query['font-size']) || 100;
    const stopAtZero = req.query['stop-at-zero'] === 'true';
    const flashIndefinitely = req.query['flash-indefinitely'] !== 'false'; // Default to true
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
        position
    });
});

app.get('/control', (req, res) => {
    res.render('control');
});

app.get('/help', (req, res) => {
    res.render('help');
});

// API Routes
app.post('/api/start', (req, res) => {
    const clientIP = getClientIP(req);
    if (!isIPWhitelisted(clientIP)) {
        console.log(`Access denied for IP: ${clientIP}`);
        return res.status(403).json({ error: 'Access denied' });
    }

    const { hours = 0, minutes = 0, seconds = 0, targetTime = null, countingUp = true } = req.body;

    if (targetTime) {
        console.log(`Start request from ${clientIP} to target time: ${targetTime}`);
        timer.start(0, 0, 0, targetTime, countingUp);
    } else {
        console.log(`Start request from ${clientIP}: ${hours}h ${minutes}m ${seconds}s`);
        timer.start(parseInt(hours), parseInt(minutes), parseInt(seconds), null, countingUp);
    }

    res.json({ success: true });
});

app.post('/api/pause', (req, res) => {
    const clientIP = getClientIP(req);
    if (!isIPWhitelisted(clientIP)) {
        console.log(`Access denied for IP: ${clientIP}`);
        return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`Pause request from ${clientIP}`);
    timer.pause();
    res.json({ success: true });
});

app.post('/api/reset', (req, res) => {
    const clientIP = getClientIP(req);
    if (!isIPWhitelisted(clientIP)) {
        console.log(`Access denied for IP: ${clientIP}`);
        return res.status(403).json({ error: 'Access denied' });
    }
    
    console.log(`Reset request from ${clientIP}`);
    timer.reset();
    res.json({ success: true });
});

app.get('/api/status', (req, res) => {
    // Get timer status
    const timerStatus = timer.getStatus();
    
    res.json(timerStatus);
});


app.get('/api/whitelist', (req, res) => {
    const clientIP = getClientIP(req);
    if (!isIPWhitelisted(clientIP)) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
        whitelist: CONTROL_WHITELIST,
        your_ip: clientIP,
        access: 'granted'
    });
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
    printWhitelistInfo();
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});