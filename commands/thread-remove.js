const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

const ALLOWED_ROLE_IDS = (process.env.ALLOWED_ROLE_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('thread-remove')
    .setDescription('Remove a user\'s access to the current private thread.')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to remove').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const memberRoleIds = interaction.member.roles.cache.map((role) => role.id);
    const isAllowed =
      ALLOWED_ROLE_IDS.length === 0 ||
      ALLOWED_ROLE_IDS.some((roleId) => memberRoleIds.includes(roleId));

    if (!isAllowed) {
      await interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    if (
      interaction.channel.type !== ChannelType.PrivateThread &&
      interaction.channel.type !== ChannelType.PublicThread
    ) {
      await interaction.reply({
        content: '⚠️ This command must be run inside a thread.',
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user');

    try {
      await interaction.channel.members.remove(targetUser.id);
      await interaction.reply({
        content: `✅ Removed ${targetUser} from this thread.`,
        ephemeral: true,
      });
    } catch (err) {
      console.error('Failed to remove thread member:', err);
      await interaction.reply({
        content: '❌ Could not remove that user. Check bot permissions.',
        ephemeral: true,
      });
    }
  },
};
