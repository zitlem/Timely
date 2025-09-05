from flask import Flask, render_template, request, jsonify
import time
import threading
import os
import json
import ipaddress
import logging
from collections import defaultdict
from datetime import datetime, timedelta

app = Flask(__name__)

# IP whitelist for control access - modify this list as needed
CONTROL_WHITELIST = [
    #'127.0.0.1',       # localhost
    #'::1',             # localhost IPv6
    #'192.168.2.0/24',  # example local subnet
    #'10.1.10.0/24',    # example local subnet
]

if os.path.exists('control_whitelist.json'):
    try:
        with open('control_whitelist.json', 'r') as f:
            file_whitelist = json.load(f)
            CONTROL_WHITELIST.extend(file_whitelist)
    except Exception:
        pass

# Pre-parse whitelist entries to ipaddress objects
def parse_entry(entry):
    """Parse an entry as an IP address or network."""
    try:
        if '/' in entry:
            return ipaddress.ip_network(entry, strict=False)
        return ipaddress.ip_address(entry)
    except ValueError:
        return None  # ignore invalid entries

PARSED_WHITELIST = [parse_entry(e) for e in CONTROL_WHITELIST if parse_entry(e)]

def is_ip_whitelisted(ip):
    """Check if IP is whitelisted for control access."""
    try:
        ip_obj = ipaddress.ip_address(ip)
    except ValueError:
        return False

    for entry in PARSED_WHITELIST:
        if isinstance(entry, ipaddress.IPv4Network) or isinstance(entry, ipaddress.IPv6Network):
            if ip_obj in entry:
                return True
        elif isinstance(entry, ipaddress.IPv4Address) or isinstance(entry, ipaddress.IPv6Address):
            if ip_obj == entry:
                return True
    return False

class ClientTracker:
    def __init__(self):
        self.clients = {}  # {ip: last_seen_timestamp}
        self.lock = threading.Lock()
        self.timeout = 10  # seconds - consider client disconnected after this time
        
    def update_client(self, ip):
        """Update last seen time for a client"""
        with self.lock:
            self.clients[ip] = time.time()
    
    def cleanup_stale_clients(self):
        """Remove clients that haven't been seen recently"""
        with self.lock:
            current_time = time.time()
            stale_clients = []
            for ip, last_seen in self.clients.items():
                if current_time - last_seen > self.timeout:
                    stale_clients.append(ip)
            
            for ip in stale_clients:
                del self.clients[ip]
    
    def get_connected_count(self):
        """Get number of currently connected clients"""
        self.cleanup_stale_clients()
        with self.lock:
            return len(self.clients)
    
    def get_clients_info(self):
        """Get detailed client information (for debugging)"""
        self.cleanup_stale_clients()
        with self.lock:
            current_time = time.time()
            clients_info = []
            for ip, last_seen in self.clients.items():
                clients_info.append({
                    'ip': ip,
                    'last_seen': datetime.fromtimestamp(last_seen).strftime('%H:%M:%S'),
                    'seconds_ago': int(current_time - last_seen)
                })
            return clients_info

class CountdownTimer:
    def __init__(self):
        self.total_seconds = 0
        self.remaining_seconds = 0
        self.running = False
        self.paused = False
        self.start_time = None
        self.pause_time = None
        self.finished = False
        self.lock = threading.Lock()
        
    def start(self, hours=0, minutes=0, seconds=0):
        with self.lock:
            if not self.running and not self.paused:
                # Starting fresh timer
                self.total_seconds = hours * 3600 + minutes * 60 + seconds
                self.remaining_seconds = self.total_seconds
                self.finished = False
            elif self.paused:
                # Resuming from pause
                self.finished = False
            
            if self.remaining_seconds > 0:
                self.running = True
                self.paused = False
                self.start_time = time.time()
                print(f"Timer started: {self.remaining_seconds} seconds remaining")
            
    def pause(self):
        with self.lock:
            if self.running:
                self.paused = True
                self.running = False
                self.pause_time = time.time()
                # Update remaining seconds when pausing
                elapsed = self.pause_time - self.start_time
                self.remaining_seconds = max(0, self.remaining_seconds - elapsed)
                print(f"Timer paused: {self.remaining_seconds} seconds remaining")
                
    def reset(self):
        with self.lock:
            self.running = False
            self.paused = False
            self.remaining_seconds = 0
            self.total_seconds = 0
            self.start_time = None
            self.pause_time = None
            self.finished = False
            print("Timer reset")
            
    def get_status(self):
        with self.lock:
            current_time = time.time()
            
            if self.running and self.start_time:
                elapsed = current_time - self.start_time
                remaining = self.remaining_seconds - elapsed
                
                # Check if timer has finished
                if remaining <= 0:
                    remaining = 0
                    if not self.finished:
                        self.finished = True
                        self.running = False
                        print("Timer finished!")
                
                return {
                    'running': self.running,
                    'paused': self.paused,
                    'remaining': remaining,
                    'finished': self.finished,
                    'total': self.total_seconds
                }
            else:
                return {
                    'running': self.running,
                    'paused': self.paused,
                    'remaining': self.remaining_seconds,
                    'finished': self.finished,
                    'total': self.total_seconds
                }

# Global instances
timer = CountdownTimer()
client_tracker = ClientTracker()

def get_client_ip():
    """Get the real client IP address, accounting for proxies"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    else:
        return request.remote_addr

@app.route('/')
def timer_display():
    # Track this client
    client_ip = get_client_ip()
    client_tracker.update_client(client_ip)
    
    # Get URL parameters with defaults
    background = request.args.get('background', '#000000')
    font_color = request.args.get('font-color', '#00ff00')
    show_seconds = request.args.get('show-seconds', 'true').lower() == 'true'
    hide_hour_auto = request.args.get('hide-hour-auto', 'off').lower() == 'on'
    
    return render_template('timer.html', 
                         background=background,
                         font_color=font_color,
                         show_seconds=show_seconds,
                         hide_hour_auto=hide_hour_auto)

@app.route('/control')
def control_page():
    return render_template('control.html')
    
@app.route('/help')
def help_page():
    return render_template('help.html')

@app.route('/api/start', methods=['POST'])
def api_start():
    client_ip = get_client_ip()
    if not is_ip_whitelisted(client_ip):
        print(f"Access denied for IP: {client_ip}")
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    hours = int(data.get('hours', 0))
    minutes = int(data.get('minutes', 0))
    seconds = int(data.get('seconds', 0))
    
    print(f"Start request from {client_ip}: {hours}h {minutes}m {seconds}s")
    timer.start(hours, minutes, seconds)
    return jsonify({'success': True})

@app.route('/api/pause', methods=['POST'])
def api_pause():
    client_ip = get_client_ip()
    if not is_ip_whitelisted(client_ip):
        print(f"Access denied for IP: {client_ip}")
        return jsonify({'error': 'Access denied'}), 403
    
    print(f"Pause request from {client_ip}")
    timer.pause()
    return jsonify({'success': True})

@app.route('/api/reset', methods=['POST'])
def api_reset():
    client_ip = get_client_ip()
    if not is_ip_whitelisted(client_ip):
        print(f"Access denied for IP: {client_ip}")
        return jsonify({'error': 'Access denied'}), 403
    
    print(f"Reset request from {client_ip}")
    timer.reset()
    return jsonify({'success': True})

@app.before_request
def suppress_status_logs():
    if request.path == "/api/status":
        logging.getLogger("werkzeug").setLevel(logging.ERROR)
    else:
        logging.getLogger("werkzeug").setLevel(logging.INFO)

@app.route('/api/status', methods=['GET'])
def api_status():
    # Track this client for timer display pages
    client_ip = get_client_ip()
    if request.headers.get('User-Agent', '').find('timer') != -1 or request.referrer and 'timer' in request.referrer:
        client_tracker.update_client(client_ip)
    
    # Get timer status
    timer_status = timer.get_status()
    
    # Add connected clients count for control pages
    timer_status['connected_clients'] = client_tracker.get_connected_count()
    
    return jsonify(timer_status)

@app.route('/api/clients', methods=['GET'])
def api_clients():
    """Get detailed client information (for debugging/admin)"""
    client_ip = get_client_ip()
    if not is_ip_whitelisted(client_ip):
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify({
        'connected_count': client_tracker.get_connected_count(),
        'clients': client_tracker.get_clients_info()
    })

@app.route('/api/whitelist', methods=['GET'])
def api_whitelist():
    """Show current whitelist (for debugging)"""
    client_ip = get_client_ip()
    if not is_ip_whitelisted(client_ip):
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify({
        'whitelist': CONTROL_WHITELIST,
        'your_ip': client_ip,
        'access': 'granted'
    })

def print_whitelist_info():
    """Print whitelist information at startup"""
    print("Starting Timer Server...")
    print(f"Control access configured for:")
    for i, entry in enumerate(CONTROL_WHITELIST):
        parsed = parse_entry(entry)
        if parsed:
            if isinstance(parsed, ipaddress.IPv4Network) or isinstance(parsed, ipaddress.IPv6Network):
                print(f"  {i+1}. Subnet: {entry} ({parsed.num_addresses} addresses)")
            else:
                print(f"  {i+1}. IP: {entry}")
        else:
            print(f"  {i+1}. Invalid entry (ignored): {entry}")
    
    print(f"\nTotal parsed whitelist entries: {len(PARSED_WHITELIST)}")

if __name__ == '__main__':
    print_whitelist_info()
    app.run(debug=False, host='0.0.0.0', port=80)