// API Route de Vercel para obtener la URL del webhook
// Este endpoint expone de forma segura la variable de entorno WEBHOOK_URL
// sin exponerla directamente en el código del cliente

export default function handler(req, res) {
  // Solo permitir métodos GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Leer la variable de entorno
  const webhookUrl = process.env.WEBHOOK_URL;

  // Si no está configurada, retornar error
  if (!webhookUrl) {
    return res.status(500).json({ 
      error: 'WEBHOOK_URL not configured',
      message: 'La variable de entorno WEBHOOK_URL no está configurada en Vercel'
    });
  }

  // Retornar la URL en formato JSON
  return res.status(200).json({ 
    webhookUrl: webhookUrl 
  });
}

