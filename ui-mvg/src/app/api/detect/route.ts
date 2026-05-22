import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

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

function compressBase64Image(base64: string): Promise<string> {
  const raw = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(raw, 'base64');

  return sharp(buffer)
    .resize(640, 480, { fit: 'inside' })
    .jpeg({ quality: 65 })
    .toBuffer()
    .then((compressed) => {
      const b64 = compressed.toString('base64');
      return `data:image/jpeg;base64,${b64}`;
    });
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Missing image' }, { status: 400 });
    }

    // Compress the image to reduce token cost
    const compressed = await compressBase64Image(image);
    const originalBytes = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64').length;
    const compressedBytes = Buffer.from(compressed.replace(/^data:image\/\w+;base64,/, ''), 'base64').length;
    console.log(`[compress] ${(originalBytes / 1024).toFixed(1)}KB → ${(compressedBytes / 1024).toFixed(1)}KB (${((1 - compressedBytes / originalBytes) * 100).toFixed(0)}% smaller)`);

    const body = {
      model: DETECT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: compressed } },
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
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: 502 });
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
      return NextResponse.json({ detected: false, types: [], raw: rawContent });
    }

    let parsed: { detected: boolean; types: string[] };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // Repair truncated JSON
      let repaired = jsonMatch[0];
      if ((repaired.match(/"/g) || []).length % 2 !== 0) repaired += '"';
      let openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
      let openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
      while (openBrackets > 0) { repaired += ']'; openBrackets--; }
      while (openBraces > 0) { repaired += '}'; openBraces--; }
      try {
        parsed = JSON.parse(repaired);
      } catch {
        console.warn('[detect] JSON parse failed after repair:', rawContent);
        return NextResponse.json({ detected: false, types: [], raw: rawContent });
      }
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error('[detect] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
