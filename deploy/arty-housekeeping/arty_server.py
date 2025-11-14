#!/usr/bin/env python3
"""
ARTY™ PMS Add-On Housekeeping Management System
Simple Python web server for demo/development
"""

import os
import json
import csv
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import datetime

class ARTYHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/':
            # Serve the main dashboard
            self.serve_dashboard()
        elif parsed_path.path == '/health':
            # Health check endpoint
            self.send_json_response({
                'status': 'healthy', 
                'timestamp': datetime.datetime.now().isoformat(),
                'version': '1.0.0'
            })
        elif parsed_path.path.startswith('/api/'):
            # API endpoints
            self.handle_api_request(parsed_path.path)
        else:
            # Static files
            super().do_GET()
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path.startswith('/webhooks/'):
            # PMS webhook handler
            vendor = parsed_path.path.split('/')[-1]
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length) if content_length > 0 else b''
            raw_text = post_data.decode('utf-8') if post_data else ''

            print(f"📡 Received webhook from {vendor}: {raw_text}")

            # Try to parse JSON payload
            try:
                payload = json.loads(raw_text) if raw_text else {}
            except Exception:
                payload = {'raw': raw_text}

            # Try to transform via adapter if available
            canonical = None
            try:
                from integrations import adapter
                canonical = adapter.transform(vendor, payload)
            except Exception as e:
                print(f"⚠️ Adapter transform failed: {e}")

            # Ensure processed data directory exists and write result for auditing
            processed_dir = os.path.join('data', 'processed')
            os.makedirs(processed_dir, exist_ok=True)
            ts = datetime.datetime.now().strftime('%Y%m%dT%H%M%S')
            out_filename = f"{vendor}_webhook_{ts}.json"
            out_path = os.path.join(processed_dir, out_filename)

            to_write = canonical if canonical is not None else {
                'vendor': vendor,
                'payload': payload,
                'received_at': datetime.datetime.now().isoformat()
            }

            try:
                with open(out_path, 'w', encoding='utf-8') as f:
                    json.dump(to_write, f, indent=2)
                print(f"✅ Wrote processed webhook to {out_path}")
            except Exception as e:
                print(f"⚠️ Failed writing processed webhook: {e}")

            self.send_json_response({
                'status': 'received',
                'vendor': vendor,
                'timestamp': datetime.datetime.now().isoformat(),
                'processed_file': out_path
            })
        elif parsed_path.path == '/api/upload/csv':
            # CSV upload handler
            self.send_json_response({
                'message': 'CSV upload endpoint ready for implementation',
                'hint': 'Use tools/html_to_csv.py to process uploads'
            })
        else:
            self.send_response(404)
            self.end_headers()
    
    def serve_dashboard(self):
        """Serve the ARTY™ dashboard"""
        try:
            with open('dashboard.html', 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404, "Dashboard not found")
    
    def handle_api_request(self, path):
        """Handle API requests"""
        if path == '/api/rooms':
            self.serve_csv_data('data/hotel_rooms.csv')
        elif path == '/api/tasks':
            self.serve_csv_data('data/hotel_tasks.csv')
        elif path == '/api/staff':
            self.serve_csv_data('data/hotel_staff.csv')
        elif path == '/api/inventory':
            self.serve_csv_data('data/hotel_inventory.csv')
        else:
            self.send_json_response({'error': 'Endpoint not found'}, 404)
    
    def serve_csv_data(self, csv_file):
        """Convert CSV to JSON and serve"""
        try:
            data = []
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                data = list(reader)
            
            self.send_json_response({
                'data': data,
                'count': len(data),
                'source': csv_file
            })
        except FileNotFoundError:
            self.send_json_response({'error': f'Data file {csv_file} not found'}, 404)
    
    def send_json_response(self, data, status=200):
        """Send JSON response"""
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        json_data = json.dumps(data, indent=2)
        self.wfile.write(json_data.encode('utf-8'))

def main():
    # Change to the deployment directory
    deploy_dir = os.path.join(os.getcwd(), 'deploy', 'arty-housekeeping')
    if os.path.exists(deploy_dir):
        os.chdir(deploy_dir)
    
    port = int(os.environ.get('PORT', 3000))
    server_address = ('', port)
    
    print("🏨 Starting ARTY™ Housekeeping Management System")
    print(f"📊 Dashboard: http://localhost:{port}")
    print(f"🔌 Webhooks: http://localhost:{port}/webhooks/{{vendor}}")
    print(f"📡 API: http://localhost:{port}/api/{{endpoint}}")
    print(f"❤️  Health: http://localhost:{port}/health")
    print("\nPress Ctrl+C to stop the server")
    
    httpd = HTTPServer(server_address, ARTYHandler)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down ARTY™ server...")
        httpd.server_close()

if __name__ == '__main__':
    main()