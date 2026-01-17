import cron from 'node-cron';
import { checkShouldNotify } from './grok.js';
import { getRecentMemories, getLastConversationTime, saveMemory } from './mem0.js';
import { sendDMToUser } from './discord.js';
import { generateImage } from './pixai.js';

export function startCronJobs(): void {
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly check...');

    try {
      const now = new Date();
      const currentTime = now.toLocaleString('ja-JP');
      const lastConversation = getLastConversationTime();
      const memories = await getRecentMemories();

      const result = await checkShouldNotify(currentTime, lastConversation, memories);

      if (result.shouldNotify && result.message) {
        console.log('Sending scheduled notification...');

        let imageUrl: string | null = null;
        if (result.emotion) {
          imageUrl = await generateImage(result.emotion);
        }

        await sendDMToUser(result.message, imageUrl ?? undefined);
        await saveMemory(`[定時通知] ひなた: ${result.message}`);

        console.log('Notification sent successfully');
      } else {
        console.log('No notification needed at this time');
      }
    } catch (error) {
      console.error('Error in cron job:', error);
    }
  });

  console.log('Cron jobs started');
}
