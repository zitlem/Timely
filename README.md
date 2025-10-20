# Timely - Advanced Countdown Timer

A professional, feature-rich countdown timer with real-time synchronization, customizable display options, and comprehensive control capabilities.

![Timely Timer](https://img.shields.io/badge/version-2.0-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D14.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎯 Core Functionality
- **Dual Timer Modes**: Set duration-based timers OR count down to specific date/time
- **Count-Up Mode**: Timer continues counting up after reaching zero (configurable)
- **Real-time Synchronization**: Multiple clients stay synchronized automatically
- **Offline Resilience**: Continues running even if connection is lost

### 🎨 Customizable Display
- **Color Schemes**: Customize background, font, warning colors, and count-up color
- **Visual Alerts**: Configurable warning colors at 5 minutes and 1 minute
- **Flashing Modes**: Flash indefinitely, for 10 seconds, or only at zero (not when counting up)
- **Flexible Positioning**: Place timer anywhere on screen (5 position options)
- **Responsive Design**: Works perfectly on all screen sizes from mobile to 4K displays

### 🕐 Clock Modes
- **Clock Display**: Show current time when timer is reset
- **Clock-Only Mode**: Display as a clock without timer functionality
- **12/24 Hour Format**: Choose between 12-hour (with AM/PM) or 24-hour format
- **Clock Customization**: Control seconds display and AM/PM visibility independently

### 🎛️ Advanced Controls
- **Control Panel**: Intuitive interface with preset timers
- **Target Time Mode**: Count down to specific events/deadlines
- **IP Whitelisting**: Secure access control for timer operations
- **API Access**: Full REST API for automation and integration

### 🔧 Display Options
- Auto-hide hours when zero
- Show/hide seconds (timer and clock independent)
- Hide seconds when timer > 1 hour
- Custom font sizes (50-200%)
- Text shadow/glow effects
- Transparent background mode for overlays
- Inverted separator blinking synchronized with flash

## 🚀 Quick Start

### Installation

1. **Install Node.js** (v14 or higher)
   ```bash
   # Download from https://nodejs.org/
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Server**
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

4. **Access the Application**
   - Timer Display: `http://localhost/`
   - Control Panel: `http://localhost/control`
   - Help & Documentation: `http://localhost/help`

## 📖 Usage

### Timer Display (`/`)

Customize the timer using URL parameters:

#### Color Parameters
| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `background` | Background color (hex) | #000000 | #1a1a2e |
| `transparent-bg` | Transparent background | false | true |
| `font-color` | Text color (hex) | #00ff00 | #00ff00 |
| `warning-color-1` | Color at 5 minutes (hex) | #ff8800 | #ffa500 |
| `warning-color-2` | Color at 1 minute (hex) | #ff4444 | #ff0000 |
| `count-up-color` | Color when counting up (hex) | warning-color-2 | #0088ff |

#### Behavior Parameters
| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `stop-at-zero` | Stop at zero (no count up) | false | true |
| `flash-indefinitely` | Flash indefinitely at zero | true | false |
| `flash-count-up` | Flash when counting up | true | false |

#### Clock Display Parameters
| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `show-clock` | Show current time when reset | false | true |
| `show-only-clock` | Show only clock (ignore timer) | false | true |
| `clock-24-hour` | Use 24-hour clock format | true | false |
| `clock-show-seconds` | Show seconds in clock | true | false |
| `clock-show-ampm` | Show AM/PM in 12-hour clock | true | false |

#### Display Parameters
| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `show-seconds` | Display seconds | true | false |
| `hide-hour-auto` | Auto-hide hours when zero | off | on |
| `hide-seconds-over-hour` | Hide seconds > 1 hour | false | true |
| `font-size` | Font size percentage | 100 | 150 |
| `no-shadow` | Disable text shadow | false | true |
| `position` | Timer position | center | top-left |

**Valid Positions**: `center`, `top-left`, `top-right`, `bottom-left`, `bottom-right`

### Example URLs

```bash
# Classic green timer
/?background=%23000000&font-color=%2300ff00

# Red warning theme
/?background=%23000000&font-color=%23ff4444&warning-color-1=%23ff6600

# Stop at zero with blue count-up
/?stop-at-zero=false&count-up-color=%230088ff

# Flash for 10 seconds only
/?flash-indefinitely=false

# Count up without flashing
/?flash-count-up=false

# Overlay mode (transparent background)
/?transparent-bg=true&font-color=%23ffffff&no-shadow=true

# Large font in top-left corner
/?position=top-left&font-size=150

# Modern blue theme
/?background=%232d3748&font-color=%2363b3ed&hide-hour-auto=on

# Clock display when reset
/?show-clock=true

# Clock-only mode (12-hour format)
/?show-only-clock=true&clock-24-hour=false&clock-show-seconds=false

# Clock without AM/PM
/?show-only-clock=true&clock-24-hour=false&clock-show-ampm=false
```

### Control Panel (`/control`)

Access at `http://localhost/control`

**Features:**
- **Duration Mode**: Set timer by hours, minutes, seconds with preset buttons
- **Target Time Mode**: Count down to specific date and time
- Start, pause, and reset controls
- Real-time status display
- Always shows count-up after zero

**Note**: Control panel always counts up after zero. Individual timer displays can use `?stop-at-zero=true` to stop at zero.

## 🔌 API Reference

### Start Timer (Duration Mode)
```bash
POST /api/start
Content-Type: application/json

{
    "hours": 0,
    "minutes": 5,
    "seconds": 30,
    "countingUp": true
}
```

### Start Timer (Target Time Mode)
```bash
POST /api/start
Content-Type: application/json

{
    "targetTime": "2025-12-31T23:59:59.000Z",
    "countingUp": true
}
```

### Pause/Resume Timer
```bash
POST /api/pause
```

### Reset Timer
```bash
POST /api/reset
```

### Get Timer Status
```bash
GET /api/status

Response:
{
    "running": true,
    "paused": false,
    "remaining": 300.5,
    "finished": false,
    "total": 600,
    "countingUp": true,
    "isTargetMode": false,
    "targetTime": null,
    "serverTime": 1735689600000
}
```

### Check Whitelist Access
```bash
GET /api/whitelist

Response:
{
    "whitelist": ["127.0.0.1", "192.168.1.0/24"],
    "your_ip": "192.168.1.100",
    "access": "granted"
}
```

## 🔒 Security & Access Control

### IP Whitelisting

Control access is restricted to whitelisted IPs. Configure using either method:

**Method 1: Code Configuration**

Edit `CONTROL_WHITELIST` in `server.js`:
```javascript
let CONTROL_WHITELIST = [
    '127.0.0.1',       // localhost
    '::1',             // localhost IPv6
    '192.168.1.0/24',  // home network
    '10.0.0.100',      // specific IP
];
```

**Method 2: JSON File**

Create `control_whitelist.json`:
```json
[
    "127.0.0.1",
    "192.168.1.0/24",
    "10.0.0.0/16"
]
```

**Supported Formats:**
- Single IPv4: `192.168.1.100`
- IPv4 Subnet: `192.168.1.0/24` (256 addresses)
- Large Subnet: `10.0.0.0/16` (65,536 addresses)
- IPv6: `::1` or `2001:db8::/32`

**Access Rules:**
- Timer Display (`/`): Public access (anyone can view)
- Control Panel (`/control`): Whitelisted IPs only
- API Control Endpoints: Whitelisted IPs only
- API Status (`/api/status`): Public access

## 🎨 Preset Themes

Access the URL builder at `/help` for interactive theme creation, or use these presets:

- **Classic Green**: Black background, green text, traditional terminal look
- **Matrix**: Dark green background, bright green text
- **Modern Blue**: Dark slate background, blue text, clean design
- **Minimal White**: White background, dark text, no shadows
- **Warning Red**: Black background, red text, high visibility
- **Purple Glow**: Dark purple background, purple text with glow
- **Transparent Overlay**: Transparent background for OBS/streaming

## 📁 Project Structure

```
timely/
├── server.js                # Main Express server
├── package.json             # Dependencies and scripts
├── control_whitelist.json   # IP whitelist (optional)
├── views/                   # EJS templates
│   ├── timer.ejs           # Timer display view
│   ├── control.ejs         # Control panel view
│   └── help.ejs            # Documentation & URL builder
└── static/                  # Static assets
    ├── fonts/              # Web fonts (Inter family)
    └── favicon.svg         # Application favicon
```

## 🛠️ Production Deployment

For production use:

1. **Use a Process Manager**
   ```bash
   npm install pm2 -g
   pm2 start server.js --name "timely-timer"
   pm2 save
   pm2 startup
   ```

2. **Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name timer.example.com;

       location / {
           proxy_pass http://localhost:80;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable HTTPS** with Let's Encrypt
4. **Configure Firewall** rules
5. **Set up Monitoring** and logging

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

This project is provided as-is for educational and commercial use.

## 🙏 Acknowledgments

- Built with Express.js and EJS
- Uses Inter font family for modern UI
- Inspired by professional countdown timer applications

---

**Need Help?** Visit `/help` in your browser for the complete interactive documentation and URL builder.
