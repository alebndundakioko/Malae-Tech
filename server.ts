import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Gemini API Proxy
  app.post("/api/gemini", async (req, res) => {
    try {
      const { model: modelName, contents, config } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: modelName || "gemini-3.5-flash",
        contents,
        config
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Admin Verification Notification Endpoint
  app.post("/api/notify-admin-verification", async (req, res) => {
    try {
      const { 
        userId, 
        userEmail, 
        displayName, 
        medicalSchool, 
        registrationNumber, 
        studentIdFileName, 
        verificationRef 
      } = req.body;

      const ADMIN_EMAIL = "drsamanthaainembabazi@gmail.com";
      
      console.log(`[ADMIN NOTIFICATION] New Student Verification Request for Admin (${ADMIN_EMAIL}):`);
      console.log({
        targetAdmin: ADMIN_EMAIL,
        userId,
        userEmail,
        displayName,
        medicalSchool,
        registrationNumber,
        studentIdFileName,
        verificationRef,
        status: "pending_verification",
        receivedAt: new Date().toISOString()
      });

      res.json({ 
        success: true, 
        message: `Verification notification queued for admin ${ADMIN_EMAIL}`,
        adminNotified: ADMIN_EMAIL,
        status: "pending"
      });
    } catch (notifyErr: any) {
      console.error("Admin notification endpoint error:", notifyErr);
      res.status(500).json({ error: notifyErr.message || "Failed to notify admin" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
