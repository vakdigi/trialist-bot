require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const createTrialist = require('./commands/create-trialist');
const threadAdd = require('./commands/thread-add');
const threadRemove = require('./commands/thread-remove');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();
for (const cmd of [createTrialist, threadAdd, threadRemove]) {
  client.commands.set(cmd.data.name, cmd);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    const errPayload = {
      content: '❌ There was an error executing this command.',
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errPayload);
    } else {
      await interaction.reply(errPayload);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
