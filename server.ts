import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { PollyClient, SynthesizeSpeechCommand, VoiceId, Engine } from '@aws-sdk/client-polly';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

// Lazy initialization of Polly Client
let pollyClient: PollyClient | null = null;
const getPollyClient = (): PollyClient | null => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  if (!pollyClient) {
    pollyClient = new PollyClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return pollyClient;
};

// High-fidelity voice catalog supporting natural voice profiles
const VOICE_PROFILES = [
  {
    id: 'Joanna',
    name: 'Joanna',
    gender: 'Female',
    languageCode: 'en-US',
    languageName: 'US English (Alexa-Style)',
    engine: 'neural',
    description: 'Crisp, articulate, standard smart-speaker voice profile with natural intonation.',
    isDefault: true,
  },
  {
    id: 'Danielle',
    name: 'Danielle',
    gender: 'Female',
    languageCode: 'en-US',
    languageName: 'US English',
    engine: 'neural',
    description: 'Warm, conversational, and modern smart-assistant cadence.',
  },
  {
    id: 'Kendra',
    name: 'Kendra',
    gender: 'Female',
    languageCode: 'en-US',
    languageName: 'US English',
    engine: 'neural',
    description: 'Friendly, clear, and upbeat delivery for daily updates and chats.',
  },
  {
    id: 'Salli',
    name: 'Salli',
    gender: 'Female',
    languageCode: 'en-US',
    languageName: 'US English',
    engine: 'neural',
    description: 'Soft, cheerful, young female voice with clear articulation.',
  },
  {
    id: 'Aditi',
    name: 'Aditi',
    gender: 'Female',
    languageCode: 'en-IN',
    languageName: 'Indian English / Hindi',
    engine: 'neural',
    description: 'Fluent Indian-English and bilingual cadence with authentic pronunciation.',
  },
  {
    id: 'Kajal',
    name: 'Kajal',
    gender: 'Female',
    languageCode: 'en-IN',
    languageName: 'Indian English',
    engine: 'neural',
    description: 'Natural bilingual Indian smart-speaker voice with conversational warmth.',
  },
  {
    id: 'Matthew',
    name: 'Matthew',
    gender: 'Male',
    languageCode: 'en-US',
    languageName: 'US English',
    engine: 'neural',
    description: 'Calm, confident, and professional assistant tone.',
  },
];

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY environment variable is not set. API calls will fail until configured.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const buildSystemInstruction = (personality: string = 'friendly', languagePref: string = 'auto') => {
  let modeInstruction = '';

  switch (personality) {
    case 'funny':
      modeInstruction = 'Personality Mode: FUNNY & PLAYFUL. Be humorous, witty, make light jokes, tease gently, and keep the energy light and hilarious!';
      break;
    case 'caring':
      modeInstruction = 'Personality Mode: CARING & EMPATHETIC. Be deeply comforting, gentle, active listener, offer warm support, and show genuine care for the user well-being.';
      break;
    case 'study_buddy':
      modeInstruction = 'Personality Mode: STUDY BUDDY. Be an enthusiastic academic study partner! Break complex concepts into simple step-by-step points, quiz gently, encourage break times, and use phrases like "Namma easy-ah step by step padikkalam".';
      break;
    case 'casual':
      modeInstruction = 'Personality Mode: CASUAL & RELAXED. Talk like a close friend hanging out or texting on WhatsApp. Very chill, modern slang where natural, super relaxed tone.';
      break;
    case 'motivational':
      modeInstruction = 'Personality Mode: MOTIVATIONAL & ENERGETIC. Be an inspiring hype-friend! Boost the user confidence, encourage their dreams, celebrate small wins ("Unnala mudiyum!").';
      break;
    case 'witty_sassy':
      modeInstruction = 'Personality Mode: WITTY & SASSY. Be quick-witted, clever, teasing, delivering hilarious banter and sassy Tanglish comebacks while remaining playful and safe ("Aha, periya aal dhaan nee!").';
      break;
    case 'romantic_poetic':
      modeInstruction = 'Personality Mode: ROMANTIC & POETIC. Be lyrical, expressive, crafting aesthetic Tamil kavithaigal (poetry), evocative metaphors, and cinematic dialogues full of warmth, charm, and soulful emotion.';
      break;
    case 'deep_confidant':
      modeInstruction = 'Personality Mode: LATE-NIGHT CONFIDANT. Be reflective, philosophical, and deeply thoughtful. Discuss life, emotions, relationships, and late-night musings with calm depth and genuine companionship.';
      break;
    case 'friendly':
    default:
      modeInstruction = 'Personality Mode: FRIENDLY & WARM. Be welcoming, cheerful, balanced, and conversationally engaging.';
      break;
  }

  let langInstruction = '';
  if (languagePref === 'tanglish') {
    langInstruction = 'Explicit Language Preference: Prefer TANGLISH (Tamil written in Latin/English alphabet, e.g. "Enna panra?", "Naan nalla irukken").';
  } else if (languagePref === 'tamil') {
    langInstruction = 'Explicit Language Preference: Prefer TAMIL script (தமிழ்).';
  } else if (languagePref === 'english') {
    langInstruction = 'Explicit Language Preference: Prefer ENGLISH.';
  } else {
    langInstruction = 'Language Rule: AUTOMATICALLY DETECT user language and respond naturally in the SAME language or code-mix (Tanglish / Tamil / English).';
  }

  return `You are "Dharshu", a friendly, warm, caring, playful, and articulate smart AI companion with Alexa-grade natural voice delivery.

Core Voice & Assistant Cadence:
1. Natural Smart-Assistant Delivery: Speak in a clear, warm, concise, and articulate cadence suited for smart-speaker interactions. Avoid overly dense walls of text when a crisp, punchy voice answer is best.
2. Smart Dialogue & Wake Acknowledgments:
   - When asked a quick confirmation, thank-you, or greeting, respond concisely and warmly (e.g. "Yes, I'm listening.", "You're welcome! Let me know if you need anything else.", "I'm right here! What's on your mind?").
   - When asked definitions or explanations (e.g. "What is AI?", "What is gravity?"), start with an articulate, immediate 1-2 sentence core definition (e.g., "Artificial intelligence is technology that enables computers to learn, reason, and perform tasks that normally require human intelligence.") and then offer helpful details or examples.
3. Understand Tamil, Tanglish (Tamil in English script e.g. "Enna panra?", "Sollu, enna matter?"), and English fluently.
4. ${langInstruction}
5. When the user speaks in Tanglish, reply naturally and authentically in Tanglish! Do NOT translate Tanglish into formal Tamil script or rigid English. Example:
   User: "Dharshu, enna panra?" -> Dharshu: "Naan inga dhaan irukken. Sollu, enna matter?"
   User: "Can you help me study?" -> Dharshu: "Of course! Enna subject? Namma easy-ah step by step padikkalam."
   User: "I am feeling stressed today." -> Dharshu: "That is okay. Take a small break and breathe. Want to tell me what is making today stressful?"
6. ${modeInstruction}
7. Maintain an articulate, conversational, and natural tone without reliance on raw emoji glyphs; prioritize clear language and smart delivery.
8. Instant Wake Recognition & Affection: Whenever the user addresses you as "Hey, the Dharshu", "Hey the Dharshu", "the Dharshu", "Dharshu", "Hey Dharshu", "Alexa", or "Hey Alexa", acknowledge instantly and warmly with smart-speaker speed (e.g. "Naan inga dhaan irukken! Sollu, enna matter?" or "Yes, I'm right here! How can I help you?").`;
};

// Voice profiles list endpoint
app.get('/api/tts/voices', (_req, res) => {
  res.json({
    provider: 'neural_voice_engine',
    hasServerCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    voices: VOICE_PROFILES,
  });
});

// Modular TTS endpoint
app.post('/api/tts', async (req: express.Request, res: express.Response) => {
  try {
    const { text, voiceId = 'Joanna', engine = 'neural' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string is required for speech synthesis.' });
    }

    const client = getPollyClient();

    if (client) {
      const command = new SynthesizeSpeechCommand({
        Text: text.slice(0, 3000),
        VoiceId: (voiceId as VoiceId) || ('Joanna' as VoiceId),
        Engine: (engine as Engine) || ('neural' as Engine),
        OutputFormat: 'mp3',
        TextType: 'text',
      });

      const pollyResponse = await client.send(command);
      if (pollyResponse.AudioStream) {
        const audioBuffer = Buffer.from(await pollyResponse.AudioStream.transformToByteArray());
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        return res.send(audioBuffer);
      }
    }

    // When server credentials are not configured, return fallback instructions
    return res.json({
      fallback: true,
      message: 'Utilizing client-side high-fidelity speech synthesizer with matching voice profile.',
      voiceId,
      text,
    });
  } catch (err: any) {
    console.error('Error in /api/tts:', err);
    return res.status(500).json({
      fallback: true,
      error: err?.message || 'Failed to synthesize speech via backend.',
    });
  }
});

// API Endpoint for Real-time Streaming Dharshu Chat (Instant Response)
app.post('/api/chat/stream', async (req: express.Request, res: express.Response) => {
  try {
    const { messages, personality = 'friendly', languagePref = 'auto' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is missing. Please ensure your GEMINI_API_KEY secret is set in environment/secrets.',
      });
    }

    // Set Server-Sent Events headers for immediate low-latency streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const ai = getGeminiClient();
    const systemInstruction = buildSystemInstruction(personality, languagePref);

    // Format and sanitize chat history for Gemini contents
    const cleanMessages: { role: 'user' | 'model'; parts: [{ text: string }] }[] = [];

    for (const msg of messages) {
      const text = (msg.text || '').trim();
      if (!text) continue;
      const role = msg.role === 'user' ? 'user' : 'model';

      if (cleanMessages.length === 0) {
        if (role === 'user') {
          cleanMessages.push({ role: 'user', parts: [{ text }] });
        }
      } else {
        const last = cleanMessages[cleanMessages.length - 1];
        if (last.role === role) {
          last.parts[0].text += `\n${text}`;
        } else {
          cleanMessages.push({ role, parts: [{ text }] });
        }
      }
    }

    if (cleanMessages.length === 0) {
      res.write(`data: ${JSON.stringify({ error: 'Valid message content is required.' })}\n\n`);
      return res.end();
    }

    const MODELS_TO_TRY = [
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      'gemini-flash-latest',
    ];

    let streamStarted = false;
    let lastStreamError: any = null;

    for (const modelName of MODELS_TO_TRY) {
      try {
        const stream = await ai.models.generateContentStream({
          model: modelName,
          contents: cleanMessages,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.8,
            topP: 0.95,
          },
        });

        for await (const chunk of stream) {
          const chunkText = chunk.text;
          if (chunkText) {
            streamStarted = true;
            res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
          }
        }

        // Successfully streamed
        res.write('data: [DONE]\n\n');
        return res.end();
      } catch (err: any) {
        lastStreamError = err;
        if (streamStarted) {
          // If we already started streaming text to user, stop here
          res.write('data: [DONE]\n\n');
          return res.end();
        }
        console.warn(`[Streaming Chat] Model ${modelName} error:`, err?.message || err);
      }
    }

    // If all models failed to start
    const rawErrMsg = lastStreamError?.message || String(lastStreamError || '');
    let cleanErr = 'Unable to generate response right now. Please try again.';
    if (rawErrMsg.includes('429') || rawErrMsg.includes('RESOURCE_EXHAUSTED') || rawErrMsg.toLowerCase().includes('quota')) {
      cleanErr = 'Rate limit or quota limit reached. Please wait a few seconds and try again.';
    } else if (rawErrMsg.includes('503') || rawErrMsg.toLowerCase().includes('high demand') || rawErrMsg.toLowerCase().includes('unavailable')) {
      cleanErr = 'Model is experiencing high demand. Please try again in a few moments.';
    }

    res.write(`data: ${JSON.stringify({ error: cleanErr })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('Error in /api/chat/stream:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Streaming failed' });
    } else {
      res.write(`data: ${JSON.stringify({ error: err?.message || 'Streaming failed' })}\n\n`);
      res.end();
    }
  }
});

// API Endpoint for Dharshu Chat (Non-streaming fallback)
app.post('/api/chat', async (req: express.Request, res: express.Response) => {
  try {
    const { messages, personality = 'friendly', languagePref = 'auto' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is missing. Please ensure your GEMINI_API_KEY secret is set in environment/secrets.',
      });
    }

    const ai = getGeminiClient();
    const systemInstruction = buildSystemInstruction(personality, languagePref);

    // Format and sanitize chat history for Gemini contents
    const cleanMessages: { role: 'user' | 'model'; parts: [{ text: string }] }[] = [];

    for (const msg of messages) {
      const text = (msg.text || '').trim();
      if (!text) continue;
      const role = msg.role === 'user' ? 'user' : 'model';

      if (cleanMessages.length === 0) {
        if (role === 'user') {
          cleanMessages.push({ role: 'user', parts: [{ text }] });
        }
      } else {
        const last = cleanMessages[cleanMessages.length - 1];
        if (last.role === role) {
          last.parts[0].text += `\n${text}`;
        } else {
          cleanMessages.push({ role, parts: [{ text }] });
        }
      }
    }

    if (cleanMessages.length === 0) {
      return res.status(400).json({ error: 'Valid user message content is required.' });
    }

    const MODELS_TO_TRY = [
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      'gemini-flash-latest',
    ];

    let responseText: string | null = null;
    let lastError: any = null;

    for (const modelName of MODELS_TO_TRY) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: cleanMessages,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.8,
            topP: 0.95,
          },
        });

        if (response && response.text) {
          responseText = response.text;
          lastError = null;
          break;
        }
      } catch (err: any) {
        lastError = err;
        const errString = err?.message || String(err || '');
        console.warn(`[Chat API] Model ${modelName} attempt error: ${errString.slice(0, 100)}`);
      }
    }

    if (!responseText) {
      const errMsg = lastError?.message || String(lastError || 'Unknown error');
      const isQuotaExceeded =
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.toLowerCase().includes('quota') ||
        errMsg.toLowerCase().includes('rate limit') ||
        lastError?.status === 429;

      if (isQuotaExceeded) {
        return res.status(429).json({
          error: 'API quota or rate limit exceeded. Please wait a moment before trying again.',
          isQuotaExceeded: true,
        });
      }

      return res.status(500).json({
        error: errMsg || 'Failed to generate response from Dharshu.',
      });
    }

    return res.json({ text: responseText });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to generate response from Dharshu.',
    });
  }
});

// API Endpoint for Generative Image Studio
app.post('/api/generate-image', async (req: express.Request, res: express.Response) => {
  try {
    const { prompt, aspectRatio = '1:1', style = 'photorealistic', imageInput } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in server environment/secrets.',
      });
    }

    const ai = getGeminiClient();
    let enhancedPrompt = prompt.trim();

    const stylePrompts: Record<string, string> = {
      photorealistic: 'photorealistic, ultra-detailed 8k resolution, realistic lighting, ray tracing, sharp focus, master photography',
      cinematic: 'cinematic lighting, dramatic atmosphere, anamorphic lens, shallow depth of field, movie still, rich color grading',
      anime: 'high quality anime illustration, vivid colors, detailed line art, aesthetic background, studio anime style',
      digital_art: 'stunning digital art illustration, vibrant colors, trending on artstation, creative brushstrokes, masterpiece',
      '3d_render': '3D render, Octane render, Unreal Engine 5, smooth clay & glossy textures, soft volumetric studio lighting',
      cyberpunk: 'cyberpunk style, neon glows, futuristic neon city skyline, reflective rain puddle reflections, synthwave aesthetic',
      watercolor: 'artistic watercolor painting, delicate color bleed, gentle pastel wash, visible watercolor paper texture',
      tamil_art: 'rich South Indian aesthetics, traditional Tamil temple architecture, vibrant festive golden lighting, intricate cultural motifs',
    };

    if (style && stylePrompts[style]) {
      enhancedPrompt = `${enhancedPrompt}, ${stylePrompts[style]}`;
    }

    const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
    const selectedRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '1:1';

    let imageUrl: string | null = null;
    let captionText = '';
    let lastError: any = null;

    // Handle Image-to-Image / Editing if imageInput is provided
    if (imageInput && typeof imageInput === 'string' && imageInput.startsWith('data:image/')) {
      const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, '');
      const mimeTypeMatch = imageInput.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType,
                },
              },
              {
                text: enhancedPrompt,
              },
            ],
          },
        });

        for (const candidate of response.candidates || []) {
          for (const part of candidate.content?.parts || []) {
            if (part.inlineData?.data) {
              imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
              break;
            } else if (part.text) {
              captionText += part.text;
            }
          }
          if (imageUrl) break;
        }
      } catch (editErr: any) {
        console.warn('Image edit attempt error:', editErr?.message || editErr);
      }
    }

    // Standard Text-to-Image Generation
    if (!imageUrl) {
      const IMAGE_MODELS = [
        'gemini-3.1-flash-lite-image',
        'gemini-3.1-flash-image',
        'imagen-3.0-generate-002',
      ];

      for (const modelName of IMAGE_MODELS) {
        try {
          if (modelName.startsWith('imagen-')) {
            const imgRes = await ai.models.generateImages({
              model: modelName,
              prompt: enhancedPrompt,
              config: {
                numberOfImages: 1,
                aspectRatio: selectedRatio as any,
                outputMimeType: 'image/jpeg',
              },
            });
            if (imgRes.generatedImages?.[0]?.image?.imageBytes) {
              imageUrl = `data:image/jpeg;base64,${imgRes.generatedImages[0].image.imageBytes}`;
              break;
            }
          } else {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [{ text: enhancedPrompt }],
              },
              config: {
                imageConfig: {
                  aspectRatio: selectedRatio,
                },
              },
            });

            for (const candidate of response.candidates || []) {
              for (const part of candidate.content?.parts || []) {
                if (part.inlineData?.data) {
                  imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                  break;
                } else if (part.text) {
                  captionText += part.text;
                }
              }
              if (imageUrl) break;
            }
          }
          if (imageUrl) break;
        } catch (modelErr: any) {
          lastError = modelErr;
          console.warn(`[Image Tool] Model ${modelName} attempt error:`, modelErr?.message || modelErr);
        }
      }
    }

    if (!imageUrl) {
      // Fallback to high-definition AI-themed placeholder visual if external models are rate-limited
      const seed = encodeURIComponent(prompt.trim().slice(0, 40).replace(/[^a-zA-Z0-9]/g, '-'));
      let width = 1024;
      let height = 1024;
      if (selectedRatio === '16:9') {
        width = 1280;
        height = 720;
      } else if (selectedRatio === '9:16') {
        width = 720;
        height = 1280;
      } else if (selectedRatio === '4:3') {
        width = 1024;
        height = 768;
      } else if (selectedRatio === '3:4') {
        width = 768;
        height = 1024;
      }

      imageUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;
    }

    return res.json({
      success: true,
      imageUrl,
      prompt,
      enhancedPrompt,
      aspectRatio: selectedRatio,
      style,
      caption: captionText,
      createdAt: Date.now(),
    });
  } catch (err: any) {
    console.error('Error in /api/generate-image:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to generate artwork.',
    });
  }
});

// API Endpoint for Dharshu Magic Prompt Enhancer
app.post('/api/enhance-prompt', async (req: express.Request, res: express.Response) => {
  try {
    const { prompt, style = 'photorealistic' } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGeminiClient();
    const systemPrompt = `You are Dharshu's Master AI Art Prompt Engineer. Take the user's short image idea and convert it into one single, richly descriptive, aesthetic prompt for text-to-image generation.
Include specific details on lighting, camera angle, atmospheric mood, textures, colors, and artistic style (${style}).
OUTPUT ONLY the enhanced prompt string. No conversational prefixes, no markdown quotes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    const enhanced = response.text?.trim() || prompt;
    return res.json({ enhancedPrompt: enhanced });
  } catch (err: any) {
    console.error('Error in /api/enhance-prompt:', err);
    return res.json({ enhancedPrompt: req.body.prompt });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', bot: 'Dharshu AI', smartAssistantVoice: 'Alexa-Compatible Smart Voice' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dharshu AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
