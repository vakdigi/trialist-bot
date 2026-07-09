require('dotenv').config();
const { REST, Routes } = require('discord.js');
const createTrialist = require('./commands/create-trialist');
const threadAdd = require('./commands/thread-add');
const threadRemove = require('./commands/thread-remove');
const createVote = require('./commands/create-vote');

const commands = [createTrialist, threadAdd, threadRemove, createVote].map((cmd) =>
  cmd.data.toJSON()
);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash command(s)...`);

    if (process.env.GUILD_ID) {
      // Guild-scoped: available instantly, good for development/testing.
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`Registered commands to guild ${process.env.GUILD_ID}.`);
    } else {
      // Global: available in all servers, but can take up to an hour to propagate.
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
        body: commands,
      });
      console.log('Registered global commands.');
    }
  } catch (error) {
    console.error(error);
  }
})();
