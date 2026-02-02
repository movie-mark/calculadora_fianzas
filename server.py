#!/usr/bin/env python3
"""
Servidor HTTP simple para desarrollo local de la calculadora de acuerdos de pago
Sirve archivos estáticos y el endpoint /api/config
"""

import http.server
import socketserver
import json
import os
from urllib.parse import urlparse

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Manejar endpoint /api/config
        if self.path == '/api/config' or self.path == '/api/config/':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Usar variable de entorno o fallback
            webhook_url = os.environ.get('WEBHOOK_URL', 'https://tu-webhook-n8n.com/webhook/acuerdos-pago')
            
            response = {
                'webhookUrl': webhook_url
            }
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
            return
        
        # Servir archivos estáticos normalmente
        return super().do_GET()

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Servidor iniciado en http://localhost:{PORT}")
        print(f"Presiona Ctrl+C para detener el servidor")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido")
