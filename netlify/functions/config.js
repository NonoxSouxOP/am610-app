// Función serverless de Netlify: guarda y sirve la configuración editable
// de la radio (URL de stream, programación, contacto) usando Netlify Blobs
// como base de datos simple. La app pública SOLO usa GET (lectura libre).
// El panel admin.html usa POST, que exige la contraseña de administrador
// guardada como variable de entorno (nunca queda en el código ni en GitHub).

import { getStore } from "@netlify/blobs";

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

export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (req.method === "OPTIONS") {
    return new Response("", { status: 204, headers });
  }

  const store = getStore("am610-config");

  if (req.method === "GET") {
    const data = await store.get("config", { type: "json" });
    return new Response(JSON.stringify(data || DEFAULT_CONFIG), { status: 200, headers });
  }

  if (req.method === "POST") {
    const providedPassword = req.headers.get("x-admin-password");
    if (!process.env.ADMIN_PASSWORD || providedPassword !== process.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Contraseña incorrecta" }), { status: 401, headers });
    }

    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400, headers });
    }

    if (payload.__authCheck) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    if (!payload.streamUrl || !payload.schedule || !payload.contact) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), { status: 400, headers });
    }

    await store.setJSON("config", payload);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  return new Response(JSON.stringify({ error: "Método no permitido" }), { status: 405, headers });
};

export const config = { path: "/.netlify/functions/config" };
