import 'dotenv/config';

const PIXAI_API_KEY = process.env['PIXAI_API_KEY']!;
const PIXAI_BASE_URL = 'https://api.pixai.art';

interface MediaResult {
  id: string;
  urls: {
    variant?: string;
    small?: string;
    medium?: string;
    original?: string;
  };
}

interface GenerationTask {
  id: string;
  status: string;
  outputs?: MediaResult[];
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
    const createResponse = await fetch(`${PIXAI_BASE_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PIXAI_API_KEY}`,
      },
      body: JSON.stringify({
        query: `
          mutation createGenerationTask($parameters: JSONObject!) {
            createGenerationTask(parameters: $parameters) {
              id
              status
            }
          }
        `,
        variables: {
          parameters: {
            prompts: prompt,
            negativePrompts: NEGATIVE_PROMPT,
            modelId: '1648918127446573124',
            width: 512,
            height: 768,
            steps: 25,
          },
        },
      }),
    });

    if (!createResponse.ok) {
      console.error(`PixAI create error: ${createResponse.status}`);
      return null;
    }

    const createData = (await createResponse.json()) as {
      data?: { createGenerationTask?: { id: string } };
    };
    const taskId = createData.data?.createGenerationTask?.id;

    if (!taskId) {
      console.error('PixAI: No task ID returned');
      return null;
    }

    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const statusResponse = await fetch(`${PIXAI_BASE_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PIXAI_API_KEY}`,
        },
        body: JSON.stringify({
          query: `
            query getGenerationTask($id: ID!) {
              generationTask(id: $id) {
                id
                status
                outputs {
                  id
                  urls {
                    variant
                    small
                    medium
                    original
                  }
                }
              }
            }
          `,
          variables: { id: taskId },
        }),
      });

      if (!statusResponse.ok) {
        continue;
      }

      const statusData = (await statusResponse.json()) as {
        data?: { generationTask?: GenerationTask };
      };
      const task = statusData.data?.generationTask;

      if (task?.status === 'completed' && task.outputs && task.outputs.length > 0) {
        const output = task.outputs[0];
        return output?.urls?.medium ?? output?.urls?.small ?? output?.urls?.original ?? null;
      }

      if (task?.status === 'failed') {
        console.error('PixAI generation failed');
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
