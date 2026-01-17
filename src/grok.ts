import 'dotenv/config';

const GROK_API_KEY = process.env['GROK_API_KEY']!;
const GROK_BASE_URL = 'https://api.x.ai/v1';

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

export interface GrokResponse {
  content: string;
  emotion: string;
}

export async function generateResponse(
  userMessage: string,
  memories: string = ''
): Promise<GrokResponse> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
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

  return { content: cleanContent, emotion };
}

export async function checkShouldNotify(
  currentTime: string,
  lastConversation: string,
  memories: string
): Promise<{ shouldNotify: boolean; message?: string; emotion?: string }> {
  const prompt = `現在時刻: ${currentTime}
最後の会話: ${lastConversation}
最近の記憶:
${memories}

質問: 今ユーザーに声をかけるべきですか？
- 23:00〜7:00は基本控える
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

  return { shouldNotify: true, message: cleanContent, emotion };
}
