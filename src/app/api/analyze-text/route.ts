// src/app/api/analyze-text/route.ts
// AI-powered text analysis for smart editorial styling.
// Calls Claude to analyze Arabic text and returns formatting marks.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `أنت محرر تحريري محترف في الجزيرة. مهمتك تحليل نص عربي وتحديد التنسيق المناسب.

القواعد:
1. **بولد**: الأسماء المهمة، المناصب، الأماكن المهمة، الأرقام مع وحداتها (سنوات، نسب، مبالغ)
2. **هايلايت**: جملة واحدة فقط الأهم في الفقرة — العبارة المفتاحية أو الاقتباس
3. **إيتاليك**: التوضيحات بين أقواس، الترجمات
4. **لا تبالغ**: حد أقصى 3 عناصر بولد و1 هايلايت لكل فقرة
5. **العنوان**: لا تنسقه — خليه زي ما هو
6. **لو النص قصير (أقل من 10 كلمات)**: لا تنسقه

أرجع JSON فقط بالشكل التالي:
{
  "paragraphs": [
    {
      "segments": [
        { "text": "نص عادي", "style": "regular" },
        { "text": "نص مهم", "style": "bold" },
        { "text": "عبارة مفتاحية", "style": "highlight" },
        { "text": "(توضيح)", "style": "italic" }
      ]
    }
  ]
}

الأنماط المتاحة: "regular", "bold", "highlight", "italic"
لا تضف أو تحذف أي كلمة — النص يجب أن يبقى كما هو بالضبط.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 },
    );
  }

  let body: { text: string; isTitle?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  // Titles: return plain
  if (body.isTitle) {
    return NextResponse.json({
      paragraphs: [{
        segments: [{ text: body.text.trim(), style: 'regular' }],
      }],
    });
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `حلل هذا النص وأرجع JSON بالتنسيق المناسب:\n\n${body.text}`,
      }],
    });

    // Extract text from response
    const responseText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI returned invalid format' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[analyze-text] Error:', err);
    return NextResponse.json(
      { error: 'Analysis failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
