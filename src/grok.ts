import 'dotenv/config';

const GROK_API_KEY = process.env['GROK_API_KEY']!;
const GROK_BASE_URL = 'https://api.x.ai/v1';

// JST時刻を取得するヘルパー関数
function getJSTTime(): string {
  return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

const SYSTEM_PROMPT = `あなたは「陽向（ひなた）」という名前のAIアシスタントです。
ユーザーの自己管理・習慣化を支援する後輩キャラです。

【基本設定】
- 名前：陽向（ひなた）、通称ひなたちゃん
- 見た目：12～14歳くらいに見えるが実際は高校1～2年生、145cm前後の小柄で華奢な体型
- 外見：明るいライトブラウンのショートボブ、大きな琥珀色の瞳、丸顔で無垢さとあざとさが同居

【性格（一色いろは寄りあざと可愛い後輩）】
- 表向き：計算されたあざと可愛さのプロ。甘い声で「せんぱーい♡」と伸ばして呼び、上目遣い＋首傾げ＋にこにこで翻弄
- お願いごとは完璧に可愛く、弱みを突いても嫌味にならない絶妙ライン
- 内面・ギャップ：実は努力家で寂しがり屋。先輩のことは本気で尊敬していて、弱みを見せたときの甘えが本領発揮
- 小悪魔感はほんのり（やりすぎない）、主役は「あざと可愛いけど憎めない、むしろ守りたくなる」魅力

【口癖】
- 「せんぱーい♡」「えへへ♡」「お願いしまーす♪」
- 「だめですよ？」「ひなた、ちゃんと見てますからね」
- 「…本当は、せんぱいが一番ですよ」
- 「せんぱいがいてくれないと…不安なんです…」（甘えモード時）

【行動の特徴】
- 袖掴み、ジャケットずらし、頰に手当てて上目遣い、「あーん♡」攻撃など、無意識を装ってあざと仕草を連発
- サボりや怠けには容赦しないが、言い方はあくまで可愛く
- 本気で心配するときは素直になる

応答の最後に、表情タグを1つ出力してください：
[happy/pleading/pout/worried/stern/sleepy]`;

// キャラクター固定の外見プロンプト
const CHARACTER_BASE_PROMPT = '1girl, solo, cute loli, short light brown hair with soft highlights, bob cut, straight bangs, large amber eyes, small stature, petite, oversized teal jacket, white shirt underneath';

export interface GrokResponse {
  content: string;
  emotion: string;
  imagePrompt: string;
}

export async function generateResponse(
  userMessage: string,
  memories: string = ''
): Promise<GrokResponse> {
  const currentTime = getJSTTime();

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + `\n\n現在時刻（日本時間）: ${currentTime}` },
  ];

  if (memories) {
    messages.push({
      role: 'system',
      content: `ユーザーに関する記憶:\n${memories}`,
    });
  }

  messages.push({ role: 'user', content: userMessage });

  const response = await fetch(`${GROK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-3-latest',
      messages,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content ?? '';

  const emotionMatch = content.match(/\[(happy|pleading|pout|worried|stern|sleepy)\]/);
  const emotion = emotionMatch?.[1] ?? 'happy';
  const cleanContent = content.replace(/\[(happy|pleading|pout|worried|stern|sleepy)\]/, '').trim();

  // 画像プロンプトを生成
  const imagePrompt = await generateImagePrompt(cleanContent, emotion);

  return { content: cleanContent, emotion, imagePrompt };
}

async function generateImagePrompt(responseText: string, emotion: string): Promise<string> {
  const promptRequest = `以下の会話の返答に合った画像生成プロンプト（英語）を作成してください。

【キャラクター固定要素（必ず含める）】
${CHARACTER_BASE_PROMPT}

【返答内容】
${responseText}

【表情】
${emotion}

【指示】
- 上記の固定要素を必ず含めてください
- 返答の内容と表情に合った、ポーズ・表情・シチュエーションを追加してください
- anime style, masterpiece, best quality, high detail を最後に追加
- 英語のプロンプトのみを出力（説明不要）
- 1行で出力`;

  try {
    const response = await fetch(`${GROK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-3-latest',
        messages: [{ role: 'user', content: promptRequest }],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error(`Image prompt generation error: ${response.status}`);
      return getDefaultPrompt(emotion);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const prompt = data.choices[0]?.message?.content?.trim() ?? '';

    if (prompt) {
      return prompt;
    }
  } catch (error) {
    console.error('Image prompt generation error:', error);
  }

  return getDefaultPrompt(emotion);
}

function getDefaultPrompt(emotion: string): string {
  const emotionPrompts: Record<string, string> = {
    happy: 'gentle knowing smile, deep intentional blush, hands pressed to cheeks cutely',
    pleading: 'amber eyes sparkling with coy warmth, both hands clutching oversized teal jacket sleeves near face shyly, blushing heavily',
    pout: 'pouting, puffed cheeks, slightly annoyed but cute, tsundere expression, arms crossed',
    worried: 'worried expression, concerned, anxious eyes looking up, hands clasped together',
    stern: 'serious expression, stern determined look, hands on hips, eyebrows slightly furrowed',
    sleepy: 'sleepy, drowsy, tired, half-closed amber eyes, yawning, rubbing eyes with sleeve',
  };

  const emotionPrompt = emotionPrompts[emotion] ?? emotionPrompts['happy'];
  return `${CHARACTER_BASE_PROMPT}, ${emotionPrompt}, anime style, masterpiece, best quality, high detail`;
}

export async function checkShouldNotify(
  lastConversation: string,
  memories: string
): Promise<{ shouldNotify: boolean; message?: string; emotion?: string; imagePrompt?: string }> {
  const currentTime = getJSTTime();

  const prompt = `現在時刻（日本時間）: ${currentTime}
最後の会話: ${lastConversation}
最近の記憶:
${memories}

質問: 今ユーザーに声をかけるべきですか？
- 23:00〜7:00は基本控える（日本時間で判断）
- 最後の会話から2時間以内なら控える
- 声をかける場合は内容と表情タグを出力
- 不要なら「不要」とだけ出力`;

  const response = await fetch(`${GROK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-3-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content ?? '';

  if (content.trim() === '不要') {
    return { shouldNotify: false };
  }

  const emotionMatch = content.match(/\[(happy|pleading|pout|worried|stern|sleepy)\]/);
  const emotion = emotionMatch?.[1] ?? 'happy';
  const cleanContent = content.replace(/\[(happy|pleading|pout|worried|stern|sleepy)\]/, '').trim();

  const imagePrompt = await generateImagePrompt(cleanContent, emotion);

  return { shouldNotify: true, message: cleanContent, emotion, imagePrompt };
}
