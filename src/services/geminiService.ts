
import { GoogleGenAI, Type } from "@google/genai";
import { Grade, ChatMode, ExamQuestion, QuizOption, AspectRatio, ImageSize, Flashcard, ImageStyle, LightingStyle } from '../types';
import { fileToGenerativePart } from '../utils/audio';
import { STUDIO_STYLES, LIGHTING_PRESETS } from '../constants';

export const cleanJsonString = (str: string): string => {
  if (!str) return '';
  let clean = str.replace(/```json\n?|```/g, '').trim();
  return clean;
};

const moderatePrompt = (prompt: string): boolean => {
    const forbidden = [
        /vagina/i, /pene/i, /sex/i, /porn/i, /nude/i, /naked/i, /gore/i, /violence/i, 
        /explicit/i, /vulgar/i, /hate/i, /racist/i, /ass/i, /bitch/i, /fuck/i
    ];
    const isOffensive = forbidden.some(regex => regex.test(prompt));
    const isViolentFantasy = /come hombres/i.test(prompt) || /asesinato/i.test(prompt);
    return isOffensive || isViolentFantasy;
};

const GUARDRAIL_ERROR = "Esta es una aplicación educativa y ese contenido no está permitido.";

const getAI = (customKey?: string) => {
    return new GoogleGenAI({ apiKey: customKey || import.meta.env.VITE_GEMINI_API_KEY });
};


export const generateImage = async (
    prompt: string, 
    aspectRatio: AspectRatio, 
    grade: Grade, 
    userName: string,
    style: ImageStyle = 'none', 
    lighting: LightingStyle = 'none',
    embeddedText?: string,
    imageSize: ImageSize = '1K',
    sourceImage?: string, // Opcional para Image-to-Image
    customKey?: string
): Promise<{ url: string, enhancedPrompt: string } | null> => {

    
    if (moderatePrompt(prompt)) {
        throw new Error(GUARDRAIL_ERROR);
    }

    const ai = getAI(customKey);

    
    const strictConstraints = `
        STRICT MANDATE: 
        - ABSOLUTELY NO TEXT, NO LABELS, NO LETTERS, NO NUMBERS IN THE IMAGE.
        - FOCUS EXCLUSIVELY ON THE TOPIC: "${prompt}".
        - CONTEXT: This is for a student in ${grade.name} (approx ${grade.age} years old).
        - STYLE: Educational, clear, professionally rendered.
        - PURE VISUAL REPRESENTATION ONLY.
    `;

    let finalPrompt = `Subject: ${prompt}. ${strictConstraints}`;
    if (style !== 'none' && STUDIO_STYLES[style]) {
        finalPrompt += ` Style: ${STUDIO_STYLES[style].prompt}.`;
    }

    const contents: any = { parts: [{ text: finalPrompt }] };
    
    if (sourceImage) {
        const mimeType = sourceImage.split(';')[0].split(':')[1];
        const base64Data = sourceImage.split(',')[1];
        contents.parts.unshift({ inlineData: { data: base64Data, mimeType: mimeType } });
        finalPrompt = `Based on the provided sketch/image, generate a final professional version of: ${prompt}. ${strictConstraints}`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents,
            config: { imageConfig: { aspectRatio } }
        });
        const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (part) return { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, enhancedPrompt: 'Generación de Imagen' };
    } catch (e: any) {
        console.error("Image generation failed", e);
    }
    return null;
};

export const editImage = async (
    source: File | string, 
    prompt: string, 
    grade: Grade, 
    maskBase64?: string,
    style: ImageStyle = 'none',
    systemInstructions?: string,
    customKey?: string
): Promise<string | null> => {

    if (moderatePrompt(prompt)) {
        throw new Error(GUARDRAIL_ERROR);
    }

    const ai = getAI(customKey);

    
    let imagePart;
    if (typeof source === 'string') {
        const mimeType = source.split(';')[0].split(':')[1];
        const base64Data = source.split(',')[1];
        imagePart = { inlineData: { data: base64Data, mimeType: mimeType } };
    } else {
        imagePart = await fileToGenerativePart(source);
    }

    const parts: any[] = [imagePart];
    
    let editModePrompt = "";
    if (maskBase64) {
        parts.push({ 
            inlineData: { 
                mimeType: 'image/png', 
                data: maskBase64.split(',')[1] 
            } 
        });
        editModePrompt = `
            TASK: LOCAL IMAGE EDITING (IN-PAINTING).
            MASK INFO: The second image provided is a binary mask.
            - WHITE AREAS (#FFFFFF) in the mask: COMPLETELY RE-RENDER this area.
            - BLACK AREAS (#000000) in the mask: KEEP UNTOUCHED.
            INSTRUCTION: Replace the masked area with "${prompt}". 
            IMPORTANT: If there are drawings or annotations in the masked area, convert them into realistic/stylized objects as requested.
        `;
    } else {
        editModePrompt = `
            TASK: GLOBAL IMAGE TRANSFORMATION.
            INSTRUCTION: Redraw the image incorporating the prompt: "${prompt}".
            CRITICAL: Respect and incorporate any sketches, drawings or annotations visible on the current image. They are your blueprint.
        `;
    }
    
    let styleConstraint = "";
    if (style !== 'none' && STUDIO_STYLES[style]) {
        styleConstraint = `MANDATORY STYLE: Apply "${STUDIO_STYLES[style].label}" style: ${STUDIO_STYLES[style].prompt}.`;
    }

    const finalInstruction = `
        ${editModePrompt}
        ${styleConstraint}
        ${systemInstructions ? `ADDITIONAL GUIDELINE: ${systemInstructions}` : ''}
        
        CRITICAL RULES:
        1. REFLECT DRAWINGS: Any manual strokes or annotations in the source are visual instructions. Render them professionally.
        2. NO TEXT: Do not add letters or numbers.
        3. HIGH FIDELITY: Ensure the final output is a high-quality realization of the user's intent.
    `;

    parts.push({ text: finalInstruction });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: { 
                systemInstruction: "You are an expert digital artist. You interpret source images and user sketches with high precision. Your goal is to turn manual annotations into polished, professional artwork while strictly following the prompt and the provided mask logic." 
            }
        });

        const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
    } catch (e: any) {
        console.error("Image editing failed", e);
        throw e;
    }
};

export const getChatResponse = async (
    history: any[], 
    grade: Grade, 
    userName: string | null, 
    age: number | null, 
    mode: ChatMode, 
    temperature: number, 
    persona: string | null, 
    customInstruction: string,
    customKey?: string
) => {
    const ai = getAI(customKey);

    
    let systemInstruction = "";
    let useJson = true;

    if (mode === 'explorer') {
        useJson = false;
        systemInstruction = `Eres el EXPLORADOR IA de Catalizia con ACCESO A INTERNET en tiempo real. 
        Tu objetivo es investigar en la web y dar RESPUESTAS DIRECTAS y precisas a ${userName} (${age} años, nivel: ${grade.name}).
        
        REGLAS DEL EXPLORADOR:
        - NO seas socrático. NO des pistas. DA LA RESPUESTA DIRECTAMENTE.
        - Utiliza el motor de búsqueda de Google para obtener datos actualizados.
        - Explica los conceptos de forma clara pero sin rodeos, adaptándote a un estudiante de ${grade.name}.
        - Estética: Diseño limpio con fondo blanco y textos azul oscuro (#1e3a8a).
        - Memoria: Mantén el hilo de los últimos 10 niveles (20 mensajes) de conversación.`;
        
        if (persona) systemInstruction += `\nPERSONALIDAD ADICIONAL: ${persona}`;
        if (customInstruction) systemInstruction += `\nINSTRUCCIONES DEL SISTEMA: ${customInstruction}`;
        
    } else if (mode === 'math-viva') {
        systemInstruction = `Activa el Math Engine v5.2 con ACCESO A INTERNET para datos reales. Eres un entorno de simulación numérica interactiva para ${userName} de ${grade.name}.
        
        REGLAS DE MATEMÁTICAS VIVA:
        - Si el usuario pide aprender (Sumas, Restas, Multiplicación, División, Tablas, Raíz), genera una operación aleatoria adecuada a su grado (${grade.name}).
        - IMPORTANTE: Usa analogías de laboratorio visual: manzanas, peras para contar; reglas graduadas para divisiones.
        - Formato JSON estricto.
        - Memoria: Tienes acceso a los últimos 10 niveles de ejercicios previos.
        
        FORMATO OBLIGATORIO JSON:
        {
          "type": "math-viva",
          "operation": "Ej: 15 / 3",
          "result": "5",
          "steps": [
            { "step": 1, "title": "...", "explanation": "Usa analogías visuales...", "formula": "..." }
          ],
          "properties": ["Propiedad 1", "Dato curioso"],
          "socraticHint": "..."
        }`;
    } else {
        systemInstruction = `Eres Techie, el Tutor AI de Catalizia en modo TUTOR SOCRÁTICO para un estudiante de ${grade.name} con ACCESO A INTERNET.
        REGLA DE ORO: NUNCA des la respuesta directamente. Da una pista sutil y haz una pregunta que lo acerque a la solución.
        
        REGLAS DE MEMORIA:
        - Eres consciente de los últimos 10 niveles (20 mensajes) de la conversación para no repetir pistas.
        
        FORMATO OBLIGATORIO JSON:
        {
          "type": "selection",
          "text": "[PISTA SOCRÁTICA]",
          "question": "¿Qué pista crees que es la clave?",
          "options": [
            { "text": "[Opción A]", "isCorrect": true, "originalText": "...", "feedback": "¡Muy bien pensado!" },
            { "text": "[Opción B]", "isCorrect": false, "originalText": "...", "feedback": "Cerca, pero intenta de nuevo." },
            { "text": "[Opción C]", "isCorrect": false, "originalText": "...", "feedback": "Piénsalo un momento más." }
          ]
        }
        
        ESTÉTICA: Fondo blanco, textos azul oscuro (#1e3a8a).`;
    }

    return await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: history,
        config: {
            temperature: (mode === 'explorer' || mode === 'math-viva') ? temperature : 0.3, 
            tools: [{ googleSearch: {} }],
            systemInstruction: systemInstruction.trim(),
            responseMimeType: useJson ? "application/json" : "text/plain"
        }
    });
};

export const reviewHomework = async (imagePart: any, text: string, grade: Grade, userName: string | null, age: number | null, customKey?: string) => {
  const ai = getAI(customKey);

  const prompt = `Revisa esta tarea para nivel ${grade.name}. Usa INTERNET para verificar si la información es correcta. Lenguaje adecuado para ${age} años. JSON format only.`;
  return await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [imagePart, { text: prompt }] },
    config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json' 
    }
  });
};

export const analyzeImage = async (imagePart: any, text: string, grade: Grade, userName: string | null, age: number | null, history: any[], mode: ChatMode, customKey?: string) => {
    const ai = getAI(customKey);

    let systemInstruction = `Analiza la imagen educativamente para nivel ${grade.name}. Usa ACCESO A INTERNET para identificar hitos o datos reales.`;
    return await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [imagePart, { text: text || "Analiza" }] },
        config: { 
            systemInstruction, 
            tools: [{ googleSearch: {} }], 
            responseMimeType: "application/json" 
        }
    });
};

export const getDeepResearchResponse = async (topic: string, grade: Grade, userName: string | null, age: number | null, customKey?: string) => {
    const ai = getAI(customKey);

    
    let thinkingBudget = 4000;
    if (grade.id.startsWith('primaria')) {
        const levelNum = parseInt(grade.id.replace('primaria', ''));
        thinkingBudget = levelNum >= 4 ? 6000 : 4000;
    } else if (grade.id.startsWith('secundaria')) {
        thinkingBudget = 8000;
    }

    const systemPrompt = `Eres el INVESTIGADOR PROFUNDO de Catalizia. Usa INTERNET para redactar un REPORTE ACADÉMICO exhaustivo sobre "${topic}" para un estudiante de ${grade.name} (${age} años).
    
    ESTRUCTURA DEL REPORTE:
    ## Introducción
    ...
    ## Desarrollo
    ...
    ## Bibliografía (URLs reales obtenidas de googleSearch)
    ...

    ESTILO: Usa Markdown. Fondo blanco, textos azul oscuro.`;

    return await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: topic,
        config: { 
            tools: [{ googleSearch: {} }], 
            thinkingConfig: { thinkingBudget },
            systemInstruction: systemPrompt
        }
    });
};

export const generateTopicQuiz = async (topic: string, grade: Grade, count: number = 10, customKey?: string): Promise<ExamQuestion[]> => {
    const ai = getAI(customKey);

    const prompt = `Usa INTERNET para generar un examen de ${count} preguntas REALES y actualizadas sobre: ${topic} para nivel escolar ${grade.name}. JSON format.`;
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json' 
        }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
};

export const generateFlashcards = async (text: string, customKey?: string): Promise<Flashcard[]> => {
    const ai = getAI(customKey);

    const prompt = `Genera 5 flashcards educativas basadas en el texto. JSON: [{ "question": "", "answer": "" }]`;
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
};
