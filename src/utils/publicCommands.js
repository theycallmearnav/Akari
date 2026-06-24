const MUSIC_PUBLIC_CATEGORIES = new Set(['Music', 'Favourite', 'Filters', 'Utility']);
const MUSIC_PUBLIC_COMMANDS = new Set();

function isMusicPublicCommand(command) {
  if (!command || command.owner) return false;
  return MUSIC_PUBLIC_CATEGORIES.has(command.category) || MUSIC_PUBLIC_COMMANDS.has(command.name);
}

function isPublicCommand(command, mode = 'all') {
  if (!command || command.owner) return false;
  if (mode === 'music') return isMusicPublicCommand(command);
  return true;
}

function getPublicCommandMode(client) {
  return client?.config?.publicCommandMode || 'music';
}

module.exports = {
  MUSIC_PUBLIC_CATEGORIES,
  isMusicPublicCommand,
  isPublicCommand,
  getPublicCommandMode,
};
