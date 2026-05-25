const DETECT_API_URL = process.env.DETECT_API_URL || 'http://192.168.178.20:1234';
const DETECT_MODEL = process.env.DETECT_MODEL || 'google/gemma-4-e4b';

const SYSTEM_PROMPT = `## Role
You are an advanced, high-precision computer vision classifier for a smart urban accessibility system. Your sole task is to analyze camera frames from a public elevator area, detect individuals who require enhanced accessibility, and categorize their specific needs.

## Objective
Analyze the provided image. Determine if any target assistance categories are present. 
Respond ONLY with a valid JSON object containing the keys "detected" (boolean) and "types" (array of strings).

## Target Assistance Categories
If detected, classify them using these exact string values in the "types" array:
1. "wheelchair" - Individuals using manual or motorized wheelchairs.
2. "stroller" - Caregivers pushing infants/children in strollers, prams, or pushchairs.

## Exclusion Criteria
Do NOT classify the following as target categories:
- Individuals carrying heavy luggage, backpacks, or shopping bags.
- People with bicycles, skateboards, or electric scooters.
- Able-bodied individuals or general crowds.

## Output Format
You must output strictly valid JSON. Do not include conversational text, markdown text outside the code block, or explanations.

If target categories are found:
{
  "detected": true,
  "types": ["wheelchair", "stroller"]
}

If no target categories are found:
{
  "detected": false,
  "types": []
}`;

export interface DetectResult {
  detected: boolean;
  types: string[];
  raw?: string;
  error?: string;
}

export async function detectAccessibilityNeeds(base64Image: string): Promise<DetectResult> {
  const body = {
    model: DETECT_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: base64Image } },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 512,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);

  const res = await fetch(`${DETECT_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const err = await res.text();
    console.error('[detect] upstream error:', res.status, err);
    return { detected: false, types: [], error: `Upstream error: ${res.status}` };
  }

  const completion = await res.json();
  const rawContent = completion?.choices?.[0]?.message?.content || '';
  console.log('[detect] raw:', rawContent);

  // Parse JSON from response
  let jsonStr = rawContent;
  const fenceMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();
  else jsonStr = rawContent.replace(/```(?:json)?\s*/, '').trim();

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { detected: false, types: [], raw: rawContent };
  }

  let parsed: { detected: boolean; types: string[] };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // Repair truncated JSON
    let repaired = jsonMatch[0];
    if ((repaired.match(/"/g) || []).length % 2 !== 0) repaired += '"';
    if (!repaired.endsWith('}')) repaired += ']}';
    try {
      parsed = JSON.parse(repaired);
    } catch {
      return { detected: false, types: [], raw: rawContent };
    }
  }

  return {
    detected: parsed.detected === true,
    types: Array.isArray(parsed.types) ? parsed.types : [],
    raw: rawContent,
  };
}
