// Función serverless de Netlify: guarda y sirve la configuración editable
// de la radio (URL de stream, programación, contacto) usando Netlify Blobs
// como base de datos simple. La app pública SOLO usa GET (lectura libre).
// El panel admin.html usa POST, que exige la contraseña de administrador
// guardada como variable de entorno (nunca queda en el código ni en GitHub).

const { getStore } = require("@netlify/blobs");

const DEFAULT_CONFIG = {
  streamUrl: "https://ohradio.cc:8014/stream",
  schedule: {
    "Lun–Vie": [
      { time: "06:00", end: "09:00", name: "Buen Día San Martín", host: "Magazine matutino" },
      { time: "09:00", end: "12:00", name: "Mediomundo", host: "Actualidad y música" },
      { time: "12:00", end: "14:00", name: "La Mesa", host: "Entrevistas del mediodía" },
      { time: "14:00", end: "17:00", name: "Tarde Nuestra", host: "Música y consultorio" },
      { time: "17:00", end: "20:00", name: "Data Deportiva", host: "Deportes locales" },
      { time: "20:00", end: "22:00", name: "Noche 610", host: "Selección musical" }
    ],
    "Sáb": [
      { time: "08:00", end: "12:00", name: "Fin de Semana 610", host: "Magazine de sábado" },
      { time: "12:00", end: "16:00", name: "Sport San Martín", host: "Deportes del fin de semana" },
      { time: "16:00", end: "21:00", name: "Tarde de Clásicos", host: "Música seleccionada" }
    ],
    "Dom": [
      { time: "09:00", end: "13:00", name: "Domingo en Familia", host: "Magazine dominical" },
      { time: "13:00", end: "18:00", name: "Fútbol y algo más", host: "Cobertura deportiva" },
      { time: "18:00", end: "21:00", name: "Cierre de Semana", host: "Música y repaso" }
    ]
  },
  contact: {
    instagram: "",
    facebook: "",
    whatsapp: "",
    email: "",
    address: ""
  }
};

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const store = getStore("am610-config");

  if (event.httpMethod === "GET") {
    const data = await store.get("config", { type: "json" });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data || DEFAULT_CONFIG)
    };
  }

  if (event.httpMethod === "POST") {
    const providedPassword = event.headers["x-admin-password"];
    if (!process.env.ADMIN_PASSWORD || providedPassword !== process.env.ADMIN_PASSWORD) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Contraseña incorrecta" })
      };
    }

    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "JSON inválido" }) };
    }

    // Chequeo de contraseña sin tocar el storage (usado por el panel al iniciar sesión)
    if (payload.__authCheck) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (!payload.streamUrl || !payload.schedule || !payload.contact) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Faltan campos requeridos" }) };
    }

    await store.setJSON("config", payload);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: "Método no permitido" }) };
};
