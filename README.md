<p align="center"> <img src="./assets/banner_.jpg" alt="AKARI Banner" width="100%"> </p> <p align="center"> <img src="./assets/baddie.jpg" alt="AKARI Logo" width="180"> </p> <h1 align="center">🌸 AKARI</h1> <p align="center"> <b>The Ultimate Discord Music Bot</b><br> A bot with the smoothest music experience and high-quality streaming. </p> <p align="center"> <a href="https://dsc.gg/quantumdev">Support Server</a> </p>


# AKARI

AKARI is a Discord music bot built with Node.js, discord.js, Kazagumo, Shoukaku, Lavalink, and SQLite.

## Requirements

- Node.js `22.x`, `24.x`, or `25.x`
- npm `10` or newer
- A Discord bot application and bot token
- A running Lavalink server
- Git, if installing from GitHub

Node.js `20` and `23` are not supported by this project. The repo uses `engine-strict=true`, so npm may refuse to install dependencies on unsupported Node versions.

## Installation

Clone the repository:

```bash
git clone https://github.com/theycallmearnav/Akari.git
cd Akari
```

Install dependencies:

```bash
npm ci
```

Create your environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and add your real bot token and Lavalink details.

## Configuration

Required `.env` values:

```env
BOT_TOKEN=your_discord_bot_token
LAVALINK_URL=localhost:2333
LAVALINK_AUTH=your_lavalink_password
LAVALINK_SECURE=false
```

Optional `.env` values:

```env
OWNER_IDS=123456789012345678,234567890123456789
SUPPORT_URL=https://discord.gg/your-server
SPOTIFY_ID=your_spotify_client_id
SPOTIFY_SECRET=your_spotify_client_secret
LASTFM_KEY=your_lastfm_api_key
LASTFM_SECRET=your_lastfm_secret
LAVALINK_NAME=AKARI
```

You can also set Lavalink with host and port instead of `LAVALINK_URL`:

```env
LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_AUTH=your_lavalink_password
LAVALINK_SECURE=false
```

Do not upload your real `.env` file to GitHub. It contains secrets and is already ignored by `.gitignore`.

## Discord Bot Setup

In the Discord Developer Portal:

1. Create an application.
2. Add a bot to the application.
3. Copy the bot token into `.env` as `BOT_TOKEN`.
4. Enable the `Message Content Intent`.
5. Invite the bot with these scopes:
   - `bot`
   - `applications.commands`

The bot needs these main permissions:

- View Channels
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Use External Emojis
- Add Reactions
- Connect
- Speak
- Use Voice Activity

Slash commands are registered automatically when the bot starts.

## Running

Start the bot:

```bash
npm start
```

Run the smoke test:

```bash
npm run smoke
```

Development mode:

```bash
npm run dev
```

`npm run dev` requires `nodemon`. If it is not installed globally, install it in the project:

```bash
npm install --save-dev nodemon
```

## Database

The bot creates a local SQLite database file named `database.db` in the project root. Database files are ignored by Git.

## Native Dependency Notes

This project uses `better-sqlite3`, which includes a native binary. If you move the project between operating systems or Node versions, rebuild it:

```bash
npm run rebuild:native
```

For Linux deployment:

```bash
npm run deploy:linux
```

