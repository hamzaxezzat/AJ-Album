// src/app/api/analyze-text/route.ts
// AI-powered text analysis for smart editorial styling.
// Calls Claude to analyze Arabic text and returns formatting marks.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `أنت محرر تحريري محترف في الجزيرة. مهمتك تحليل نص عربي وتحديد التنسيق المناسب.

القواعد:
1. في كل فقرة، اختر **جملة واحدة فقط** الأهم — اجعلها bold_highlight (بولد + هايلايت معاً)
2. باقي النص يبقى regular بدون أي تنسيق
3. مش لازم كل فقرة يكون فيها تنسيق — لو النص عادي خليه عادي
4. لا تستخدم italic إلا للتوضيحات بين أقواس فقط
5. القاعدة: الأقل هو الأفضل — لا تبالغ

أرجع JSON فقط بالشكل التالي:
{
  "paragraphs": [
    {
      "segments": [
        { "text": "نص عادي قبل ", "style": "regular" },
        { "text": "الجملة الأهم هنا", "style": "bold_highlight" },
        { "text": " وباقي النص عادي.", "style": "regular" }
      ]
    }
  ]
}

الأنماط: "regular", "bold_highlight", "italic"
لا تضف أو تحذف أي كلمة — النص يبقى كما هو بالضبط.
أغلب النص يجب أن يكون regular.`;

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
