# Calculadora de Acuerdos de Pago

Una calculadora web embebible que permite a agentes de cobranza negociar acuerdos de pago con clientes morosos, aplicando descuentos según el plazo de pago seleccionado.

## 🚀 Características

- **Interfaz Moderna**: Diseño responsive y profesional
- **Cálculos Automáticos**: Aplica descuentos según reglas de negocio
- **Integración Webhook**: Envía acuerdos directamente a n8n
- **Validación de Parámetros**: Verifica datos requeridos desde URL
- **Formato Colombiano**: Moneda en pesos colombianos

## 📋 Reglas de Negociación

### Deudas < $1.000.000
- Pago del 100% del capital (sin descuento)
- Plazo máximo: 12 meses
- Interfaz: Slider para seleccionar cuotas

### Deudas ≥ $1.000.000
- **Contado**: 30% descuento sobre capital
- **6 Meses**: 20% descuento sobre capital  
- **1 Año**: 10% descuento sobre capital
- **2 Años**: Sin descuento (0%)

*Nota: En todos los casos se condonan los intereses y costos de cobranza.*

## 🛠️ Setup Local

### Requisitos
- Navegador web moderno
- Servidor web local (opcional, para desarrollo)

### Instalación

1. **Clonar o descargar** los archivos del proyecto
2. **Abrir directamente** `index.html` en tu navegador
3. **O usar servidor local** (recomendado para desarrollo):

```bash
# Con Python 3
python -m http.server 8000

# Con Node.js (http-server)
npx http-server

# Con PHP
php -S localhost:8000
```

4. **Acceder** a `http://localhost:8000`

## 📖 Uso

### Parámetros de URL Requeridos

```
?capital=1500000&intereses=300000&costos=150000
```

### Parámetros Informativos (Opcionales)

```
&fechaInicio=2024-01-15&diasMora=270&cuotaAnterior=125000
```

### Parámetros del Sistema (Opcionales)

```
&uuid=123e4567-e89b-12d3-a456-426614174000
```

### URL Completa de Ejemplo

```
index.html?capital=1500000&intereses=300000&costos=150000&fechaInicio=2024-01-15&diasMora=270&cuotaAnterior=125000&uuid=123e4567-e89b-12d3-a456-426614174000
```

### Parámetros Disponibles

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `capital` | number | ✅ | Capital adeudado en pesos |
| `intereses` | number | ✅ | Intereses acumulados |
| `costos` | number | ✅ | Costos de cobranza |
| `fechaInicio` | string | ❌ | Fecha inicio de mora (YYYY-MM-DD) |
| `diasMora` | number | ❌ | Días transcurridos en mora |
| `cuotaAnterior` | number | ❌ | Valor de la cuota antes de mora |
| `uuid` | string | ❌ | UUID del deudor (se envía en webhook pero no se muestra) |

## 🔧 Configuración del Webhook

### 1. Configurar URL del Webhook

Editar el archivo `calculator.js` línea 8:

```javascript
this.webhookUrl = 'https://tu-webhook-n8n.com/webhook/acuerdos-pago';
```

### 2. Payload del Webhook

El webhook recibe un POST con el siguiente JSON:

```json
{
  "capitalOriginal": 1500000,
  "interesesCondonados": 300000,
  "costosCondonados": 150000,
  "totalOriginal": 1950000,
  "capitalAPagar": 1050000,
  "descuentoCapital": 450000,
  "totalCondonado": 450000,
  "totalAhorro": 900000,
  "planSeleccionado": "6 Meses",
  "numeroCuotas": 6,
  "valorCuota": 175000,
  "fechaAcuerdo": "2025-01-10T15:30:00.000Z",
  "datosInformativos": {
    "fechaInicioMora": "2024-01-15",
    "diasMora": "270",
    "cuotaAnterior": "125000"
  },
  "uuidDeudor": "123e4567-e89b-12d3-a456-426614174000",
  "urlOrigen": "http://localhost:8000/index.html?...",
  "timestamp": 1736527800000
}
```

### 3. Configurar n8n

1. Crear un **Webhook node** en n8n
2. Copiar la URL del webhook generada
3. Actualizar la variable `webhookUrl` en el código
4. Configurar el nodo para recibir JSON

## 🌐 Deploy en Producción

### Railway

1. **Crear proyecto** en [Railway](https://railway.app)
2. **Conectar repositorio** o subir archivos
3. **Configurar variables** de entorno si es necesario
4. **Deploy automático**

### Vercel

1. **Instalar Vercel CLI**: `npm i -g vercel`
2. **En el directorio del proyecto**: `vercel`
3. **Seguir las instrucciones** del CLI
4. **Configurar dominio** personalizado si es necesario

### Netlify

1. **Arrastrar carpeta** del proyecto a [Netlify Drop](https://app.netlify.com/drop)
2. **O conectar repositorio** Git
3. **Configurar build settings** (no necesarias para archivos estáticos)

## 📱 Integración con FlutterFlow

### Widget Web View

```dart
WebViewWidget(
  controller: WebViewController()
    ..setJavaScriptMode(JavaScriptMode.unrestricted)
    ..loadRequest(Uri.parse('https://tu-dominio.com/calculadora?capital=1500000&intereses=300000&costos=150000')),
)
```

### URL Dinámica

```dart
String buildCalculatorUrl({
  required double capital,
  required double intereses,
  required double costos,
  String? fechaInicio,
  int? diasMora,
  double? cuotaAnterior,
}) {
  final uri = Uri.https('tu-dominio.com', '/calculadora', {
    'capital': capital.toString(),
    'intereses': intereses.toString(),
    'costos': costos.toString(),
    if (fechaInicio != null) 'fechaInicio': fechaInicio,
    if (diasMora != null) 'diasMora': diasMora.toString(),
    if (cuotaAnterior != null) 'cuotaAnterior': cuotaAnterior.toString(),
  });
  
  return uri.toString();
}
```

## 🧪 Testing

### URLs de Prueba

```bash
# Deuda menor a $1M
http://localhost:8000?capital=500000&intereses=75000&costos=25000

# Deuda mayor a $1M - Contado
http://localhost:8000?capital=1500000&intereses=300000&costos=150000

# Con datos informativos
http://localhost:8000?capital=2000000&intereses=400000&costos=200000&fechaInicio=2024-01-15&diasMora=270&cuotaAnterior=125000
```

### Debugging

Abrir consola del navegador y ejecutar:

```javascript
window.debugCalculator();
```

## 📁 Estructura del Proyecto

```
calculadora-acuerdos-pago/
├── index.html          # Página principal
├── styles.css          # Estilos y diseño responsive
├── calculator.js       # Lógica de cálculo y webhook
└── README.md          # Documentación
```

## 🔒 Seguridad

- ✅ Validación de parámetros de entrada
- ✅ Sanitización de datos numéricos
- ✅ Manejo de errores en webhook
- ⚠️ **Importante**: Configurar CORS en n8n si es necesario
- ⚠️ **Importante**: Validar origen del webhook en n8n

## 🆘 Solución de Problemas

### Error: "Parámetros Faltantes"
- Verificar que todos los parámetros requeridos estén en la URL
- Asegurar que los valores sean numéricos válidos

### Webhook no funciona
- Verificar URL del webhook en `calculator.js`
- Comprobar que n8n esté configurado correctamente
- Revisar consola del navegador para errores CORS

### Cálculos incorrectos
- Verificar que los valores de entrada sean correctos
- Revisar reglas de descuento en el código
- Usar función de debug: `window.debugCalculator()`

## 📞 Soporte

Para reportar bugs o solicitar funcionalidades, crear un issue en el repositorio del proyecto.

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2025
