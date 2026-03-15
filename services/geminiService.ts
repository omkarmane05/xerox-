
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSmartPrintTip = async (filename: string, fileType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User wants to print a file named "${filename}" (type: ${fileType}) in a xerox shop. Give a very short (10 words max) professional tip for perfect printing.`
    });
    return response.text;
  } catch (err) {
    console.error("Gemini tip generation failed", err);
    return null;
  }
};
