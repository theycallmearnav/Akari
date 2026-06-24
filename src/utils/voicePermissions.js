const { PermissionsBitField } = require("discord.js");

function missingVoicePermissions(channel, member) {
    const permissions = channel?.permissionsFor(member);
    if (!permissions) return ["ViewChannel", "Connect", "Speak"];

    return [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak,
    ]
        .filter((permission) => !permissions.has(permission))
        .map((permission) => Object.keys(PermissionsBitField.Flags).find(
            (key) => PermissionsBitField.Flags[key] === permission
        ) || permission.toString());
}

module.exports = {
    missingVoicePermissions,
};
