import 'dotenv/config';

const PIXAI_API_KEY = process.env['PIXAI_API_KEY']!;
const PIXAI_BASE_URL = 'https://api.pixai.art/v1';
const MODEL_ID = '1935090615918113018';

interface TaskResponse {
  id: string;
  status: string;
  outputs?: {
    mediaUrls?: string[];
  };
}

const EMOTION_PROMPTS: Record<string, string> = {
  happy: 'gentle knowing smile showing slight teeth, deep intentional blush, hands pressed to cheeks cutely',
  pleading: 'amber eyes sparkling with coy warmth, both hands clutching oversized teal jacket sleeves near face shyly yet playfully, blushing heavily',
  pout: 'pouting, puffed cheeks, slightly annoyed but cute, tsundere expression, arms crossed',
  worried: 'worried expression, concerned, anxious eyes looking up, hands clasped together',
  stern: 'serious expression, stern determined look, hands on hips, eyebrows slightly furrowed',
  sleepy: 'sleepy, drowsy, tired, half-closed amber eyes, yawning, rubbing eyes with sleeve',
};

const BASE_PROMPT =
  '1girl, solo, cute loli, short light brown hair with soft highlights, bob cut, straight bangs, large amber eyes gazing up warmly with coy glint, small stature, petite, oversized teal jacket often slipping off shoulders or sleeves pulled over hands, white shirt underneath, casual style, warm soft lighting, colorful pastel bokeh background, anime style, masterpiece, best quality, high detail';

const NEGATIVE_PROMPT =
  'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry';

export async function generateImage(emotion: string): Promise<string | null> {
  const emotionPrompt = EMOTION_PROMPTS[emotion] ?? EMOTION_PROMPTS['happy'];
  const prompt = `${BASE_PROMPT}, ${emotionPrompt}`;

  try {
    // Step 1: Create generation task
    const createResponse = await fetch(`${PIXAI_BASE_URL}/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PIXAI_API_KEY}`,
      },
      body: JSON.stringify({
        parameters: {
          prompts: prompt,
          negativePrompts: NEGATIVE_PROMPT,
          modelId: MODEL_ID,
          width: 512,
          height: 768,
          batchSize: 1,
          loras: {
            '1967432076913663882': 0.7,
          },
        },
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`PixAI create error: ${createResponse.status} - ${errorText}`);
      return null;
    }

    const createData = (await createResponse.json()) as TaskResponse;
    const taskId = createData.id;

    if (!taskId) {
      console.error('PixAI: No task ID returned');
      return null;
    }

    console.log(`PixAI: Task created with ID: ${taskId}`);

    // Step 2: Poll for task completion
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const statusResponse = await fetch(`${PIXAI_BASE_URL}/task/${taskId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PIXAI_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        console.error(`PixAI status check error: ${statusResponse.status}`);
        continue;
      }

      const task = (await statusResponse.json()) as TaskResponse;
      console.log(`PixAI: Task status: ${task.status}`);

      if (task.status === 'completed') {
        const mediaUrls = task.outputs?.mediaUrls ?? [];
        if (mediaUrls.length > 0) {
          console.log(`PixAI: Image generated: ${mediaUrls[0]}`);
          return mediaUrls[0] ?? null;
        }
        console.error('PixAI: No media URLs in completed task');
        return null;
      }

      if (task.status === 'failed' || task.status === 'cancelled') {
        console.error(`PixAI: Task ${task.status}`);
        return null;
      }
    }

    console.error('PixAI: Generation timeout');
    return null;
  } catch (error) {
    console.error('PixAI error:', error);
    return null;
  }
}
