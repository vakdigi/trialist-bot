const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

const ALLOWED_ROLE_IDS = (process.env.ALLOWED_ROLE_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-trialist')
    .setDescription('Create an onboarding thread for a new trialist and ping them.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The Discord user to ping')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('roblox_id')
        .setDescription("The trialist's Roblox ID / username")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('date_of_initiation')
        .setDescription('Date of initiation (e.g. 2026-07-06)')
        .setRequired(true)
    )
    // Sets a sane default so random members can't even see the command;
    // real enforcement still happens below via ALLOWED_ROLE_IDS.
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    // Role gate: only members with one of the configured roles can run this.
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
    const robloxId = interaction.options.getString('roblox_id');
    const dateOfInitiation = interaction.options.getString('date_of_initiation');

    const channelId = process.env.TRIALIST_CHANNEL_ID;
    const targetChannel = channelId
      ? await interaction.guild.channels.fetch(channelId).catch(() => null)
      : interaction.channel;

    if (!targetChannel) {
      await interaction.reply({
        content:
          '⚠️ Could not find the configured trialist channel. Check TRIALIST_CHANNEL_ID.',
        ephemeral: true,
      });
      return;
    }

    if (targetChannel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content:
          '⚠️ The configured channel must be a regular text channel (not a forum) so it can hold private threads.',
        ephemeral: true,
      });
      return;
    }

    // Acknowledge immediately so Discord doesn't time out the interaction.
    await interaction.deferReply({ ephemeral: true });

    try {
      // PrivateThread: only invited members + users with Manage Threads can see it,
      // regardless of whether they can otherwise view the parent channel.
      const thread = await targetChannel.threads.create({
        name: `Trialist - ${targetUser.username}`,
        type: ChannelType.PrivateThread,
        invitable: false, // only mods (Manage Threads) can add/remove members, not the trialist
        autoArchiveDuration: 10080, // 7 days
        reason: `Trialist onboarding created by ${interaction.user.tag}`,
      });

      // Give the trialist access to this specific thread.
      await thread.members.add(targetUser.id);

      // ---- Predetermined message template. Edit this to match your format. ----
      const message = [
        `👋 Welcome, ${targetUser}!`,
        '',
        `**Username:** ${targetUser.username}`,
        `**Roblox ID:** ${robloxId}`,
        `**Date of Initiation:** ${dateOfInitiation}`,
        '',
        'A staff member will be with you shortly to walk you through the trialist process.',
      ].join('\n');
      // --------------------------------------------------------------------------

      await thread.send(message);

      await interaction.editReply({
        content: `✅ Created ${thread} and pinged ${targetUser}.`,
      });
    } catch (err) {
      console.error('Failed to create trialist thread:', err);
      await interaction.editReply({
        content: '❌ Something went wrong creating the thread. Check bot permissions/logs.',
      });
    }
  },
};
