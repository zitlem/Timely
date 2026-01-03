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
- **State Persistence**: Timer state is preserved across server restarts

### 🎨 Customizable Display
- **Color Schemes**: Customize background, font, warning colors, and count-up color
- **Visual Alerts**: Configurable warning colors at 5 minutes and 1 minute
- **Flashing Modes**: Flash indefinitely or for 10 seconds when timer expires
- **Flexible Positioning**: Place timer anywhere on screen (5 position options)
- **Responsive Design**: Works perfectly on all screen sizes from mobile to 4K displays

### 🎛️ Advanced Controls
- **Control Panel**: Intuitive interface with preset timers
- **Target Time Mode**: Count down to specific events/deadlines
- **IP Whitelisting**: Secure access control for timer operations
- **Password Authentication**: Secure login when outside whitelisted IPs
- **API Access**: Full REST API for automation and integration
- **Activity Logging**: Track all timer operations with log viewer

### 🕐 Clock Display
- **Optional Clock**: Show current time alongside or instead of timer
- **12/24 Hour Format**: Choose your preferred time format
- **Configurable Display**: Show/hide seconds and AM/PM indicator

### 🔧 Display Options
- Auto-hide hours when zero
- Show/hide seconds
- Hide seconds when timer > 1 hour
- Custom font sizes (50-200%)
- Text shadow/glow effects
- Transparent background mode for overlays

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

   # Use custom port (default: 80)
   PORT=3000 npm start
   ```

4. **Access the Application**
   - Timer Display: `http://localhost/`
   - Control Panel: `http://localhost/control`
   - Activity Log: `http://localhost/log`
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

#### Display Parameters
| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `show-seconds` | Display seconds | true | false |
| `hide-hour-auto` | Auto-hide hours when zero | off | on |
| `hide-seconds-over-hour` | Hide seconds > 1 hour | false | true |
| `font-size` | Font size percentage | 100 | 150 |
| `no-shadow` | Disable text shadow | false | true |
| `position` | Timer position | center | top-left |
| `embed` | Enable iframe embedding mode | false | true |

#### Clock Parameters
| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `show-clock` | Show clock alongside timer | false | true |
| `show-only-clock` | Show only clock (no timer) | false | true |
| `clock-24-hour` | Use 24-hour format | true | false |
| `clock-show-seconds` | Show seconds in clock | true | false |
| `clock-show-ampm` | Show AM/PM indicator | true | false |

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

# Overlay mode (transparent background)
/?transparent-bg=true&font-color=%23ffffff&no-shadow=true

# Large font in top-left corner
/?position=top-left&font-size=150

# Modern blue theme
/?background=%232d3748&font-color=%2363b3ed&hide-hour-auto=on

# Clock only (no timer)
/?show-only-clock=true&clock-24-hour=false

# Timer with clock
/?show-clock=true&clock-show-seconds=false

# Embed in Home Assistant or iframe
/?embed=true&transparent-bg=true
```

### Control Panel (`/control`)

Access at `http://localhost/control`

**Authentication:**
- If your IP is whitelisted, you'll have direct access
- Otherwise, you'll see a login page requiring the control password

**Features:**
- **Duration Mode**: Set timer by hours, minutes, seconds with preset buttons
- **Target Time Mode**: Count down to specific date and time
- Start, pause, and reset controls
- Real-time status display
- Always shows count-up after zero

**Note**: Control panel always counts up after zero. Individual timer displays can use `?stop-at-zero=true` to stop at zero.

### Activity Log (`/log`)

Access at `http://localhost/log` (requires authentication)

View all timer activity including:
- Timer start/pause/reset operations
- Authentication attempts
- Access to control endpoints

Logs are automatically rotated at 1MB with up to 2 backup files.

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

### Authenticate (Password Login)
```bash
POST /api/auth
Content-Type: application/json

{
    "password": "your_password"
}

Response:
{
    "success": true
}
```

### Logout
```bash
POST /api/logout

Response:
{
    "success": true
}
```

### Add IP to Whitelist
```bash
POST /api/whitelist/add
Content-Type: application/json

{
    "ip": "192.168.1.50"
}
```

### Remove IP from Whitelist
```bash
POST /api/whitelist/remove
Content-Type: application/json

{
    "ip": "192.168.1.50"
}
```

## 🔒 Security & Access Control

### Password Authentication

Configure the control panel password in `config.json`:
```json
{
    "controlPassword": "your_secure_password",
    "trustProxy": false
}
```

- `controlPassword`: Password required for non-whitelisted IPs (default: `admin`)
- `trustProxy`: Set to `true` if behind a reverse proxy to trust `X-Forwarded-For` headers

**Security Features:**
- Rate limiting: 5 failed attempts per 15 minutes per IP
- Session-based authentication (24-hour expiry)
- Secure session cookies (httpOnly)

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
├── logger.js                # Logging module with rotation
├── package.json             # Dependencies and scripts
├── config.json              # Password and proxy configuration
├── control_whitelist.json   # IP whitelist (optional)
├── timer_state.json         # Persisted timer state (auto-generated)
├── views/                   # EJS templates
│   ├── timer.ejs           # Timer display view
│   ├── control.ejs         # Control panel view
│   ├── control-login.ejs   # Login page for control panel
│   ├── log.ejs             # Activity log viewer
│   └── help.ejs            # Documentation & URL builder
├── static/                  # Static assets
│   ├── css_timer.css       # Timer display styles
│   ├── css_control.css     # Control panel styles
│   ├── favicon.svg         # Application favicon
│   └── *.woff2             # Inter font family
└── logs/                    # Activity logs (auto-generated)
    └── timer.log           # Current log file
```

## 🛠️ Production Deployment

For production use:

1. **Configure Security**
   - Change the default password in `config.json`
   - Update the session secret in `server.js` (line 19)
   - Set up IP whitelisting in `control_whitelist.json`

2. **Use a Process Manager**
   ```bash
   npm install pm2 -g
   pm2 start server.js --name "timely-timer"
   pm2 save
   pm2 startup
   ```

3. **Reverse Proxy (Nginx)**
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
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   **Note**: When using a reverse proxy, set `"trustProxy": true` in `config.json` to correctly identify client IPs.

4. **Enable HTTPS** with Let's Encrypt
5. **Configure Firewall** rules
6. **Set up Monitoring** and logging

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

This project is provided as-is for educational and commercial use.

---

**Need Help?** Visit `/help` in your browser for the complete interactive documentation and URL builder.
