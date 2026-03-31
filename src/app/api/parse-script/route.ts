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
1. في كل فقرة، اختر **جملة واحدة فقط** الأهم — اجعلها bold + highlight معاً
2. باقي النص يبقى regular بدون أي تنسيق
3. مش لازم كل شريحة يكون فيها تنسيق — لو النص عادي خليه عادي
4. العنوان لا يُنسَّق أبداً — يبقى كما هو
5. لا تستخدم italic إلا للتوضيحات بين أقواس فقط
6. القاعدة الذهبية: الأقل هو الأفضل — لا تبالغ

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
        { "text": "نص عادي قبل الجملة المهمة، ", "style": "regular" },
        { "text": "هذه هي الجملة الأهم في الفقرة", "style": "bold_highlight" },
        { "text": " وباقي النص يبقى عادي.", "style": "regular" }
      ]
    }
  ]
}

الأنماط المتاحة:
- "regular" — نص عادي (الأغلبية)
- "bold_highlight" — جملة واحدة مهمة (بولد + هايلايت معاً)
- "italic" — توضيح بين أقواس فقط

لا تحذف أو تضف كلمات — النص يبقى كما هو بالضبط.
أغلب النص يجب أن يكون regular. جملة واحدة فقط bold_highlight في الشريحة بالكتير.`;

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
