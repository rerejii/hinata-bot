import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Message, ChannelType } from 'discord.js';
import { generateResponse } from './grok.js';
import { searchMemories, saveMemory, updateLastConversationTime } from './mem0.js';
import { generateImage } from './pixai.js';

const DISCORD_BOT_TOKEN = process.env['DISCORD_BOT_TOKEN']!;
const DISCORD_USER_ID = process.env['DISCORD_USER_ID']!;

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;

  if (message.channel.type !== ChannelType.DM) return;

  console.log(`DM received from ${message.author.tag}: ${message.content}`);

  let replied = false;

  try {
    const memories = await searchMemories(message.content);
    const { content, imagePrompt } = await generateResponse(message.content, memories);

    await message.reply(content);
    replied = true;

    // Image generation runs separately - errors won't affect the main response
    try {
      const imageUrl = await generateImage(imagePrompt);
      if (imageUrl) {
        await message.channel.send(imageUrl);
      }
    } catch (imageError) {
      console.error('Image generation error:', imageError);
    }

    // Memory saving runs separately - errors won't affect the user
    try {
      await saveMemory(`ユーザー: ${message.content}\nひなた: ${content}`);
    } catch (memoryError) {
      console.error('Memory save error:', memoryError);
    }

    updateLastConversationTime();
  } catch (error) {
    console.error('Error handling message:', error);
    if (!replied) {
      try {
        await message.reply('ごめんなさい、ちょっと調子悪いみたいです... [worried]');
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    }
  }
});

export async function sendDMToUser(content: string, imageUrl?: string): Promise<void> {
  try {
    const user = await client.users.fetch(DISCORD_USER_ID);
    await user.send(content);

    if (imageUrl) {
      await user.send(imageUrl);
    }

    updateLastConversationTime();
  } catch (error) {
    console.error('Error sending DM:', error);
  }
}

export function startBot(): void {
  client.login(DISCORD_BOT_TOKEN);
}
