import 'dotenv/config';
import { startBot } from './discord.js';
import { startCronJobs } from './cron.js';

console.log('Starting Hinata Bot...');

startBot();
startCronJobs();

console.log('Hinata Bot is running!');
