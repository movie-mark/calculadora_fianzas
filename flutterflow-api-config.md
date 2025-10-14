# API Call Simple desde FlutterFlow a Supabase

## 🎯 Consulta Directa a la View (Sin crear funciones)

### Método: GET
**URL Base:** `https://nlmwgphmduflrhzqyxrv.supabase.co/rest/v1/v_creditos_detalle`

### Headers:
```
apikey: [TU_SUPABASE_ANON_KEY]
Authorization: Bearer [TU_SUPABASE_ANON_KEY]
```

### Query Parameters:
- `deudor_id=eq.[UUID_DEL_DEUDOR]`
- `estado=eq.activo`
- `select=*`

### URL Completa con Parámetros:
```
https://nlmwgphmduflrhzqyxrv.supabase.co/rest/v1/v_creditos_detalle?deudor_id=eq.UUID_AQUI&estado=eq.activo&select=*
```

---

## 🔧 Configuración en FlutterFlow

### 1. Crear API Call

1. Ve a **API Calls** en FlutterFlow
2. Click en **+ Add** → **Create API Call**
3. Nombre: `GetDeudorCalculadora`

### 2. Configurar Request

**Method:** `GET`

**URL con variable:** 
```
https://nlmwgphmduflrhzqyxrv.supabase.co/rest/v1/v_creditos_detalle?deudor_id=eq.[deudorId]&estado=eq.activo&select=*
```

**Headers:**
```
apikey: [Tu Supabase Anon Key]
Authorization: Bearer [Tu Supabase Anon Key]
```

### 3. Variable en FlutterFlow

Crea la variable:
- **Variable Name:** `deudorId`
- **Type:** String
- **Test Value:** `e0ad75fa-aa75-4b71-8b66-84441688db8a` (para testing)

### 4. Response (Array)

La respuesta será un array con 1 elemento:

```json
[
  {
    "credito_id": "05f1ae22-7a3b-4c70-b9cd-83ed5e3a8ba8",
    "numero_credito": "2411000180",
    "deudor_id": "e0ad75fa-aa75-4b71-8b66-84441688db8a",
    "documento": "1031179466",
    "nombres": "Laura Katherine",
    "apellidos": "Ovalle Castellanos",
    "fecha_desembolso": "2024-02-06",
    "inicio_mora": "2024-11-30",
    "cuotas_pagadas": null,
    "dias_mora": 336,
    "valor_capital": "14020041.00",
    "seguro_vida": "0.00",
    "estado": "activo",
    "ultima_actualizacion_intereses": "2025-10-13T00:10:08.009022-05:00",
    "total_intereses": "3147538.17",
    "honorarios_cobranza": "3433515.83",
    "total_reclamado": "20601095.00"
  }
]
```

### 5. Construir URL de Calculadora en FlutterFlow

En tu **Custom Code** o **Custom Action**, construye la URL:

```dart
String buildCalculatorUrl(dynamic responseData) {
  if (responseData == null || responseData.isEmpty) {
    return '';
  }
  
  var data = responseData[0]; // Primer elemento del array
  
  String baseUrl = 'https://tu-dominio.com/index.html';
  
  String capital = data['valor_capital'] ?? '0';
  String intereses = data['total_intereses'] ?? '0';
  String costos = data['honorarios_cobranza'] ?? '0';
  String fechaInicio = data['inicio_mora'] ?? '';
  String diasMora = (data['dias_mora'] ?? 0).toString();
  String uuid = data['deudor_id'] ?? '';
  
  return '$baseUrl?capital=$capital&intereses=$intereses&costos=$costos&fechaInicio=$fechaInicio&diasMora=$diasMora&uuid=$uuid';
}
```

---

## 🚀 Opción Más Simple: URL con Select

Si quieres construir la URL directamente en FlutterFlow sin custom code:

**URL en FlutterFlow:**
```
https://nlmwgphmduflrhzqyxrv.supabase.co/rest/v1/v_creditos_detalle?deudor_id=eq.[deudorId]&estado=eq.activo&select=deudor_id,valor_capital,total_intereses,honorarios_cobranza,inicio_mora,dias_mora,nombres,apellidos
```

Luego en **Action Flow**:
1. **API Call:** GetDeudorCalculadora
2. **Set Variable:** calculatorUrl con valor:
   ```
   https://tu-dominio.com/index.html?capital=[response[0].valor_capital]&intereses=[response[0].total_intereses]&costos=[response[0].honorarios_cobranza]&fechaInicio=[response[0].inicio_mora]&diasMora=[response[0].dias_mora]&uuid=[response[0].deudor_id]
   ```
3. **Navigate:** WebView con URL = calculatorUrl

---

## 🔑 Obtener tu Supabase Anon Key

1. Ve a tu proyecto en Supabase Dashboard
2. **Settings** → **API**
3. Copia el **anon/public key**

**Project URL:** `https://nlmwgphmduflrhzqyxrv.supabase.co`

---

## ✅ Ejemplo de Test en curl

```bash
curl -X GET \
  'https://nlmwgphmduflrhzqyxrv.supabase.co/rest/v1/v_creditos_detalle?deudor_id=eq.e0ad75fa-aa75-4b71-8b66-84441688db8a&estado=eq.activo&select=*' \
  -H 'apikey: TU_ANON_KEY' \
  -H 'Authorization: Bearer TU_ANON_KEY'
```

### Response esperado:
```json
[
  {
    "credito_id": "...",
    "valor_capital": "14020041.00",
    "total_intereses": "3147538.17",
    "honorarios_cobranza": "3433515.83",
    ...
  }
]
```

---

## 📌 Nota Importante

**No necesitas crear nada en Supabase.** Solo asegúrate de que:
1. La view `v_creditos_detalle` exista (ya existe ✅)
2. Tengas permisos de lectura en la view
3. Uses tu Supabase Anon Key correctamente

