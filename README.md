# Timely Countdown Timer - Node.js Version

## Project Structure
```
timely/
├── server.js                # Main Node.js server
├── package.json             # Node.js dependencies
├── control_whitelist.json   # IP whitelist configuration
├── views/                   # EJS templates
│   ├── timer.ejs           # Timer display
│   ├── control.ejs         # Control panel
│   └── help.ejs            # Documentation
├── static/                  # Static assets (CSS, fonts)
```

### Manual Installation
1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Version 14 or higher recommended

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Application**
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

The application will be available at:
- Timer Display: `http://localhost:80/`
- Control Panel: `http://localhost:80/control`
- Help & Documentation: `http://localhost:80/help`

## Usage Guide

### Timer Display Page (`/`)

The timer display supports the following URL parameters:

#### Basic Parameters:
- `background` - Background color (hex code, e.g., `#000000`)
- `font-color` - Font color (hex code, e.g., `#00ff00`)
- `warning-color` - Warning color for last minute (hex code, e.g., `#ff4444`)
- `show-seconds` - Show/hide seconds (`true` or `false`)
- `hide-hour-auto` - Hide hours when zero (`on` or `off`)
- `position` - Timer position (`top-left`, `top-right`, `bottom-left`, `bottom-right`, `center`)

#### Example URLs:
```
http://localhost:5000/
http://localhost:5000/?background=%23FF0000&font-color=%23FFFFFF
http://localhost:5000/?show-seconds=false&hide-hour-auto=on
http://localhost:5000/?background=%23001122&font-color=%23FFAA00&show-seconds=true
http://localhost:5000/?position=top-left&background=%23000000&font-color=%2300ff00
http://localhost:5000/?position=bottom-right&show-seconds=false
http://localhost:5000/?warning-color=%23ff8800&background=%23000000&font-color=%2300ff00
```

### Control Page (`/control`)

Access the control interface at `http://localhost:5000/control`

Features:
- Set hours, minutes, and seconds
- Start/Resume timer
- Pause timer
- Reset timer
- Live status display
- Direct link to timer display

### API Endpoints

#### Start Timer
```bash
POST /api/start
Content-Type: application/json

{
    "hours": 0,
    "minutes": 5,
    "seconds": 30
}
```

#### Pause Timer
```bash
POST /api/pause
```

#### Reset Timer
```bash
POST /api/reset
```

#### Get Status
```bash
GET /api/status

Response:
{
    "running": true,
    "paused": false,
    "remaining": 330.5,
    "finished": false
}
```

## Features Implemented

### Timer Display
✅ Full viewport countdown display
✅ Blocky/digital font (Share Tech Mono with Courier New fallback)
✅ Support for hours, minutes, seconds
✅ URL parameters for customization
✅ Dynamic hour hiding when zero
✅ Red warning when < 60 seconds
✅ Red flashing when timer reaches zero
✅ Auto-reset after 10 seconds
✅ Responsive design
✅ Smooth transitions

### Control Interface
✅ Clean, minimal styling
✅ Input fields for time setting
✅ Start/Pause/Reset buttons
✅ Live status synchronization
✅ Visual notifications
✅ Responsive design
✅ Keyboard shortcuts (Enter to start)

### Backend
✅ Express.js API with proper endpoints
✅ Thread-safe timer management
✅ Precise time calculations
✅ Auto-reset functionality
✅ State synchronization

### Additional Features
✅ Smooth animations and transitions
✅ Blinking separators when running
✅ Gradient backgrounds
✅ Glass-morphism UI effects
✅ Mobile-responsive design
✅ Error handling and notifications

## Color Customization Examples

### Dark Theme
```
/?background=%23000000&font-color=%2300FF00
```

### Light Theme  
```
/?background=%23FFFFFF&font-color=%23000000
```

### Blue Theme
```
/?background=%23001133&font-color=%2300AAFF
```

### Red Alert Theme
```
/?background=%23330000&font-color=%23FF0000
```


## License

This project is provided as-is for educational and commercial use.