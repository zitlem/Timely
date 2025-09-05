# Countdown Timer Server

A web-based countdown timer application with full-screen display, remote control capabilities, and IP-based access control. Perfect for presentations, meetings, events, and anywhere you need a reliable countdown timer.

## Features

- **Full-screen timer display** - Clean, readable interface perfect for projection
- **Remote control** - Start, pause, and reset from any whitelisted device
- **IP-based access control** - Public display with restricted control access
- **Offline resilience** - Continues running even if connection is lost
- **Real-time client tracking** - See how many displays are connected
- **Customizable appearance** - Colors, fonts, and display options
- **Visual alerts** - Warning colors and flashing when time expires
- **Responsive design** - Works on all screen sizes

## Quick Start

1. **Install Python and Flask**
   ```bash
   pip install flask
   ```

2. **Configure IP whitelist** (edit `timer.py`)
   ```python
   CONTROL_WHITELIST = [
       '127.0.0.1',       # localhost
       '192.168.1.0/24',  # your network
   ]
   ```

3. **Run the server**
   ```bash
   python timer.py
   ```

4. **Access the interfaces**
   - Timer Display: `http://your-server/`
   - Control Panel: `http://your-server/control`
   - Help Documentation: `http://your-server/help`

## Project Structure

```
timer/
├── timer.py              # Main Flask application
├── control_whitelist.json # IP whitelist (optional)
├── README.md            # This file
└── templates/
    ├── timer.html       # Timer display template
    ├── control.html     # Control panel template
    └── help.html        # Help documentation
```

## Configuration

### IP Whitelist Setup

The timer display is publicly accessible, but control functions require whitelisted IP addresses.

**Method 1: Edit timer.py**
```python
CONTROL_WHITELIST = [
    '127.0.0.1',       # localhost
    '::1',             # localhost IPv6
    '192.168.1.0/24',  # entire subnet
    '10.0.0.100',      # specific IP
]
```

**Method 2: JSON file**
Create `control_whitelist.json`:
```json
[
    "127.0.0.1",
    "192.168.1.0/24",
    "10.0.0.0/16"
]
```

### Supported IP Formats
- Single IPv4: `192.168.1.100`
- IPv4 Subnet: `192.168.1.0/24` (256 addresses)
- Large Subnet: `10.0.0.0/16` (65,536 addresses)
- IPv6: `::1` or `2001:db8::/32`

## Usage

### Timer Display

The main timer display (`/`) shows a full-screen countdown that anyone can view. It features:

- Large, readable digits
- Automatic color changes (green → red as time expires)
- Flashing animation when timer reaches zero
- Connection status indicator
- Offline continuation capability

### Control Panel

The control panel (`/control`) allows whitelisted users to:

- Set custom timer durations (hours, minutes, seconds)
- Use quick preset buttons (1m, 5m, 10m, etc.)
- Start, pause, and reset the timer
- View connected display count
- Monitor timer status in real-time

### Customization

Customize the timer display appearance with URL parameters:

```
/?background=%23000000&font-color=%23ffffff&show-seconds=false
```

**Available parameters:**
- `background` - Background color (hex, URL encoded)
- `font-color` - Text color (hex, URL encoded)
- `show-seconds` - Display seconds (true/false)
- `hide-hour-auto` - Auto-hide hours when zero (on/off)

**Example themes:**
- Classic: `/?background=%23000000&font-color=%2300ff00`
- Modern: `/?background=%232d3748&font-color=%2363b3ed`
- Warning: `/?background=%23000000&font-color=%23ff4444`

## API Reference

### GET /api/status
Get current timer status (public access)

**Response:**
```json
{
  "running": true,
  "paused": false,
  "remaining": 300.5,
  "finished": false,
  "total": 600,
  "connected_clients": 3
}
```

### POST /api/start
Start timer with duration (requires whitelist)

**Request:**
```json
{
  "hours": 0,
  "minutes": 5,
  "seconds": 30
}
```

### POST /api/pause
Pause/resume timer (requires whitelist)

### POST /api/reset
Reset timer to zero (requires whitelist)

### GET /api/whitelist
Check whitelist status (requires whitelist)

**Response:**
```json
{
  "whitelist": ["127.0.0.1", "192.168.1.0/24"],
  "your_ip": "192.168.1.100",
  "access": "granted"
}
```

### GET /api/clients
Get detailed client information (requires whitelist)

**Response:**
```json
{
  "connected_count": 2,
  "clients": [
    {
      "ip": "192.168.1.100",
      "last_seen": "14:30:25",
      "seconds_ago": 2
    }
  ]
}
```

## Troubleshooting

### Common Issues

**Can't control timer:**
- Check if your IP is in the whitelist
- Visit `/api/whitelist` to verify your IP address
- Check console logs for access denied messages

**Timer not updating:**
- Check network connectivity
- Timer will continue running locally during disconnections
- Refresh page to resync with server

**Display not responsive:**
- Ensure browser supports modern CSS features
- Try different browser or device
- Check for JavaScript errors in browser console

### Debug Information

**View server logs:**
```bash
python timer.py  # Watch console output
```

**Check connected clients:**
- Visit `/api/clients` from whitelisted IP
- Monitor client count in control panel

**Test API endpoints:**
```bash
# Check status
curl http://your-server/api/status

# Start 5-minute timer (from whitelisted IP)
curl -X POST http://your-server/api/start \
  -H "Content-Type: application/json" \
  -d '{"minutes": 5}'
```

## Security Considerations

- Timer display is **publicly accessible** - anyone can view
- Control functions are **restricted** to whitelisted IPs only
- Use HTTPS in production to protect API communications
- Regularly review and update IP whitelist
- Monitor access logs for unauthorized attempts
- Consider VPN access for remote control

## Use Cases

- **Presentations** - Full-screen timer for speakers
- **Meetings** - Keep track of agenda items
- **Events** - Countdown for activities or breaks
- **Classrooms** - Timed exercises and activities
- **Conferences** - Session time management
- **Broadcasting** - Live event countdowns

## Requirements

- Python 3.6+
- Flask web framework
- Modern web browser with JavaScript enabled
- Network connectivity (for remote control)

## License

This project is open source. Feel free to modify and distribute as needed.

## Support

For help and documentation, visit `/help` on your timer server or refer to the inline documentation in the code.