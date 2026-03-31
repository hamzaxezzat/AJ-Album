// src/app/api/parse-script/route.ts
// AI-powered script parsing — splits script into slides with smart styling.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `أنت محرر في الجزيرة. مهمتك تحليل سكريبت ألبوم تحريري وتقسيمه إلى شرائح.

## القواعد:

### تقسيم الشرائح:
1. الشريحة الأولى دائماً هي **الغلاف** (cover) — عنوان الألبوم الرئيسي
2. باقي الشرائح inner slides — كل شريحة لها عنوان ونص
3. تجاهل الأرقام الموجودة في السكريبت (سواء 0 أو 1 أو أي ترقيم) — أنت رقّم من 1
4. لو في كلمة "(العنوان)" أو "عنوان:" أو ما شابه — هذا عنوان الألبوم وليس نص عادي
5. افصل العنوان عن النص — العنوان سطر واحد قصير، والنص هو الباقي

### تنسيق النص (لكل شريحة):
1. **bold**: الأسماء المهمة، المناصب، الأماكن، الأرقام مع وحداتها
2. **highlight**: عبارة مفتاحية واحدة فقط — الأهم في الفقرة
3. **italic**: التوضيحات بين أقواس
4. حد أقصى 3 bold و 1 highlight لكل شريحة
5. العنوان لا يُنسَّق — يبقى كما هو

### الرد:
أرجع JSON فقط بهذا الشكل:
{
  "albumTitle": "عنوان الألبوم",
  "slides": [
    {
      "number": 1,
      "role": "cover",
      "title": "عنوان الغلاف",
      "body": "",
      "bodySegments": []
    },
    {
      "number": 2,
      "role": "inner",
      "title": "عنوان الشريحة",
      "body": "النص الكامل بدون تنسيق",
      "bodySegments": [
        { "text": "نص عادي ", "style": "regular" },
        { "text": "نص مهم", "style": "bold" },
        { "text": " عبارة ", "style": "regular" },
        { "text": "مفتاحية", "style": "highlight" }
      ]
    }
  ]
}

الأنماط: "regular", "bold", "highlight", "italic"
لا تحذف أو تضف كلمات — النص يبقى كما هو بالضبط.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { script: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.script?.trim()) {
    return NextResponse.json({ error: 'No script provided' }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `حلل هذا السكريبت وقسّمه إلى شرائح مع التنسيق:\n\n${body.script}`,
      }],
    });

    const responseText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI returned invalid format' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[parse-script] Error:', err);
    return NextResponse.json(
      { error: 'Parsing failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
