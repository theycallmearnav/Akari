const { PermissionsBitField } = require('discord.js');

const PUBLIC_INVITE_PERMISSIONS = [
  'ViewChannel',
  'SendMessages',
  'EmbedLinks',
  'AttachFiles',
  'ReadMessageHistory',
  'UseExternalEmojis',
  'AddReactions',
  'Connect',
  'Speak',
  'UseVAD',
];

function getInvitePermissions() {
  return PermissionsBitField.resolve(PUBLIC_INVITE_PERMISSIONS).toString();
}

function getInviteUrl(clientId, permissions = getInvitePermissions()) {
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;
}

function getSupportUrl(config) {
  const url = config?.links?.support;
  return typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;
}

module.exports = {
  PUBLIC_INVITE_PERMISSIONS,
  getInvitePermissions,
  getInviteUrl,
  getSupportUrl,
};
