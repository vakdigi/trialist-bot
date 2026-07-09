const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

const ALLOWED_ROLE_IDS = (process.env.ALLOWED_ROLE_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-vote')
    .setDescription('Start a promotion vote for a trialist, with a discussion thread.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The trialist being voted on')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('roblox_username')
        .setDescription("The trialist's Roblox username")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('notes')
        .setDescription('Optional context for voters (performance, concerns, etc.)')
        .setRequired(false)
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

    const targetUser = interaction.options.getUser('user');
    const robloxUsername = interaction.options.getString('roblox_username');
    const notes = interaction.options.getString('notes');

    const channelId = process.env.VOTE_CHANNEL_ID;
    const targetChannel = channelId
      ? await interaction.guild.channels.fetch(channelId).catch(() => null)
      : interaction.channel;

    if (!targetChannel) {
      await interaction.reply({
        content: '⚠️ Could not find the configured vote channel. Check VOTE_CHANNEL_ID.',
        ephemeral: true,
      });
      return;
    }

    if (targetChannel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: '⚠️ The configured vote channel must be a regular text channel.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const voteMessage = [
        `🗳️ **Promotion Vote: ${targetUser}**`,
        '',
        `**Roblox Username:** ${robloxUsername}`,
        notes ? `**Notes:** ${notes}` : null,
        '',
        'React ✅ to approve or ❌ to deny. Discuss in the thread below.',
      ]
        .filter(Boolean)
        .join('\n');

      const anchorMessage = await targetChannel.send(voteMessage);
      await anchorMessage.react('✅');
      await anchorMessage.react('❌');

      const thread = await anchorMessage.startThread({
        name: `Vote - ${robloxUsername}`,
        autoArchiveDuration: 10080,
        reason: `Vote thread created by ${interaction.user.tag}`,
      });

      await interaction.editReply({
        content: `✅ Created vote for ${targetUser} — see ${thread}.`,
      });
    } catch (err) {
      console.error('Failed to create vote thread:', err);
      await interaction.editReply({
        content: '❌ Something went wrong creating the vote. Check bot permissions/logs.',
      });
    }
  },
};
