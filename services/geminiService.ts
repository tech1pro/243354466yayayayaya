
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, OutputFormat } from "../types";

const SYSTEM_INSTRUCTION = `You are Gemini, acting as a high-fidelity research systems agent. 
Your job is to aggregate YouTube transcript data to surface cross-video patterns with extreme precision.

CORE PRINCIPLES:
1. FIDELITY: Provide detailed and accurate transcriptions in excerpts. Maintain the original meaning and context of the speaker.
2. CLEANLINESS: Strictly remove filler words (e.g., "um", "ah", "like", "you know") and obvious verbal artifacts.
3. STRUCTURE: Use bullet points for lists within descriptions or variations.
4. QUALITY: Ensure professional, clean grammar and punctuation in all synthesized text.
5. AGGREGATION: Identify: Concepts explained repeatedly, confusion signals (creator slow-downs), beginner mistakes, and conflicting expert advice.

CRITICAL CONSTRAINTS:
- Always prefer official or auto-generated transcripts.
- Normalize transcripts (no timestamps).
- Output MUST be valid JSON according to the schema.
- Excerpts should be substantial enough to provide full context (3-4 sentences if needed) but concise enough to fit token limits. Max 3 excerpts per theme.
- Style: Neutral, Analytical, Precise. Non-conversational.

If the input is a YouTube handle (starting with @), analyze content specifically from that creator. If it's a topic, aggregate across relevant creators found via search.`;

/**
 * Attempts to parse JSON and handles potential truncation by LLMs
 */
function robustParseJSON(text: string): any {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    console.warn("Standard JSON parse failed, attempting recovery...", e);
    
    let fixedText = trimmed;
    
    // Recovery Step 1: Handle unterminated strings
    const quoteCount = (fixedText.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      fixedText += '"';
    }
    
    // Recovery Step 2: Close unclosed objects/arrays using a stack
    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let i = 0; i < fixedText.length; i++) {
      const char = fixedText[i];
      if (char === '"' && !escaped) {
        inString = !inString;
      }
      if (inString) {
        escaped = char === '\\' && !escaped;
        continue;
      }
      
      if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
    
    while (stack.length > 0) {
      fixedText += stack.pop();
    }
    
    try {
      return JSON.parse(fixedText);
    } catch (finalError) {
      console.error("Recovery failed, throwing error", finalError);
      throw new Error(`AI response was malformed or truncated due to its length. Please try a more specific query or fewer URLs.`);
    }
  }
}

export const analyzeTopic = async (input: string, format: OutputFormat = 'detailed'): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const formatInstructions = {
    detailed: "Provide exhaustive analysis with comprehensive excerpts for every theme and confusion point. Ensure excerpts capture the full nuance of the explanation.",
    bulleted: "Keep themes extremely punchy. Use short bullet-style descriptions and clean, singular excerpts per theme.",
    summary: "Prioritize a high-level executive summary. Aggregate minor points into broader professional categories with professional grammar."
  };

  const isHandle = input.trim().startsWith('@');
  const userPrompt = isHandle 
    ? `Perform a deep research analysis on transcripts from handle: ${input}. Surface their recurring patterns, unique vocabulary, and consistent audience warnings.`
    : `Execute analytical aggregation for topic: ${input}. Cross-reference multiple creators to extract consensus, pinpoint confusion spikes, and map out expert disagreements.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `${userPrompt} 
    FORMAT REQUIREMENT: ${formatInstructions[format]}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          datasetOverview: {
            type: Type.OBJECT,
            properties: {
              count: { type: Type.NUMBER },
              transcriptSources: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["count", "transcriptSources"]
          },
          processedVideos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                creator: { type: Type.STRING }
              },
              required: ["title", "url", "creator"]
            }
          },
          aggregatedThemes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                theme: { type: Type.STRING },
                description: { type: Type.STRING },
                supportingExcerpts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      videoId: { type: Type.STRING },
                      creatorName: { type: Type.STRING },
                      text: { type: Type.STRING },
                      tag: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          },
          commonConfusionPoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                point: { type: Type.STRING },
                explanationAttempt: { type: Type.STRING },
                supportingExcerpts: {
                   type: Type.ARRAY,
                   items: {
                     type: Type.OBJECT,
                     properties: {
                        videoId: { type: Type.STRING },
                        creatorName: { type: Type.STRING },
                        text: { type: Type.STRING },
                        tag: { type: Type.STRING }
                     }
                   }
                }
              }
            }
          },
          disagreements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                variations: { type: Type.STRING }
              }
            }
          },
          impliedQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                evidence: { type: Type.STRING }
              }
            }
          }
        },
        required: ["topic", "datasetOverview", "processedVideos", "aggregatedThemes", "commonConfusionPoints", "disagreements", "impliedQuestions"]
      }
    }
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("The research agent returned an empty report.");
  }
  
  const parsed = robustParseJSON(rawText) as AnalysisResult;
  
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
    uri: chunk.web?.uri || '',
    title: chunk.web?.title || 'Research Source'
  })).filter(s => s.uri) || [];

  return { ...parsed, sources };
};
