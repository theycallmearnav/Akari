const BetterSqlite3 = require('better-sqlite3');
const path = require('path');

const db = new BetterSqlite3(path.join(process.cwd(), 'database.db'));

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -32000');
db.pragma('temp_store = MEMORY');
db.pragma('mmap_size = 1073741824');
db.pragma('page_size = 4096');

const serialize = (data) => JSON.stringify(data);
const deserialize = (data, fallback = []) => {
    try {
        if (!data) return fallback;
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
        return fallback;
    }
};

const tables = [
    {
        name: 'liked',
        schema: `
            userId TEXT PRIMARY KEY,
            songs TEXT DEFAULT '[]'
        `
    },
    {
        name: 'userpreferences',
        schema: `
            userId TEXT PRIMARY KEY,
            musicSource TEXT DEFAULT 'ytmsearch'
        `
    },
    {
        name: 'twofourseven',
        schema: `
            guildId TEXT PRIMARY KEY,
            textId TEXT,
            voiceId TEXT
        `
    },
    {
        name: 'reboot',
        schema: `
            id TEXT PRIMARY KEY,
            channelId TEXT,
            messageId TEXT,
            guildId TEXT
        `
    },
    {
        name: 'playtime_users',
        schema: `
            userId TEXT PRIMARY KEY,
            totalMs INTEGER DEFAULT 0,
            updatedAt INTEGER DEFAULT 0
        `
    },
    {
        name: 'playtime_guilds',
        schema: `
            userId TEXT,
            guildId TEXT,
            totalMs INTEGER DEFAULT 0,
            updatedAt INTEGER DEFAULT 0,
            PRIMARY KEY (userId, guildId)
        `
    },
    {
        name: 'playtime_partners',
        schema: `
            userId TEXT,
            partnerId TEXT,
            totalMs INTEGER DEFAULT 0,
            updatedAt INTEGER DEFAULT 0,
            PRIMARY KEY (userId, partnerId)
        `
    }
];

tables.forEach((table) => {
    db.prepare(`CREATE TABLE IF NOT EXISTS ${table.name} (${table.schema})`).run();

    if (table.name === 'reboot') {
        const columns = db.prepare('PRAGMA table_info(reboot)').all();
        const columnNames = columns.map((column) => column.name);
        if (!columnNames.includes('guildId')) {
            db.prepare('ALTER TABLE reboot ADD COLUMN guildId TEXT').run();
        }
    }
});

const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_liked_userId ON liked(userId)',
    'CREATE INDEX IF NOT EXISTS idx_userpreferences_userId ON userpreferences(userId)',
    'CREATE INDEX IF NOT EXISTS idx_twofourseven_guildId ON twofourseven(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_playtime_guilds_user_total ON playtime_guilds(userId, totalMs DESC)',
    'CREATE INDEX IF NOT EXISTS idx_playtime_partners_user_total ON playtime_partners(userId, totalMs DESC)'
];

indexes.forEach((index) => {
    db.prepare(index).run();
});

const createManager = (tableName, primaryKey = 'id') => ({
    get: (pkValue) => {
        return db.prepare(`SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`).get(pkValue);
    },
    set: (pkValue, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            if (key === primaryKey) continue;
            updates.push(`${key} = ?`);
            let val = data[key];
            if (typeof val === 'object' && val !== null) val = serialize(val);
            params.push(val);
        }

        const exists = db.prepare(`SELECT 1 FROM ${tableName} WHERE ${primaryKey} = ?`).get(pkValue);
        if (exists) {
            if (!updates.length) return;
            params.push(pkValue);
            db.prepare(`UPDATE ${tableName} SET ${updates.join(', ')} WHERE ${primaryKey} = ?`).run(...params);
            return;
        }

        const keys = [primaryKey, ...Object.keys(data).filter((key) => key !== primaryKey)];
        const vals = keys.map((key) => {
            let value = key === primaryKey ? pkValue : data[key];
            if (typeof value === 'object' && value !== null) value = serialize(value);
            return value;
        });

        db.prepare(`INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
    },
    delete: (pkValue) => {
        db.prepare(`DELETE FROM ${tableName} WHERE ${primaryKey} = ?`).run(pkValue);
    },
    getAll: () => {
        return db.prepare(`SELECT * FROM ${tableName}`).all();
    }
});

const managers = {};

managers.liked = {
    get: (userId) => {
        const row = db.prepare('SELECT * FROM liked WHERE userId = ?').get(userId);
        return row ? deserialize(row.songs) : [];
    },
    set: (userId, songs) => {
        db.prepare('INSERT OR REPLACE INTO liked (userId, songs) VALUES (?, ?)').run(userId, serialize(songs));
    }
};

managers.userpreferences = createManager('userpreferences', 'userId');
managers.twofourseven = createManager('twofourseven', 'guildId');
managers.reboot = createManager('reboot', 'id');

const addUserPlaytime = db.prepare(`
    INSERT INTO playtime_users (userId, totalMs, updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET
        totalMs = totalMs + excluded.totalMs,
        updatedAt = excluded.updatedAt
`);

const addGuildPlaytime = db.prepare(`
    INSERT INTO playtime_guilds (userId, guildId, totalMs, updatedAt)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(userId, guildId) DO UPDATE SET
        totalMs = totalMs + excluded.totalMs,
        updatedAt = excluded.updatedAt
`);

const addPartnerPlaytime = db.prepare(`
    INSERT INTO playtime_partners (userId, partnerId, totalMs, updatedAt)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(userId, partnerId) DO UPDATE SET
        totalMs = totalMs + excluded.totalMs,
        updatedAt = excluded.updatedAt
`);

const addPlaytimeSession = db.transaction((guildId, userIds, elapsedMs, updatedAt) => {
    const uniqueUserIds = [...new Set(userIds)]
        .filter((userId) => typeof userId === 'string' && userId.length > 0);

    for (const userId of uniqueUserIds) {
        addUserPlaytime.run(userId, elapsedMs, updatedAt);
        addGuildPlaytime.run(userId, guildId, elapsedMs, updatedAt);
    }

    for (let i = 0; i < uniqueUserIds.length; i++) {
        for (let j = i + 1; j < uniqueUserIds.length; j++) {
            const firstUserId = uniqueUserIds[i];
            const secondUserId = uniqueUserIds[j];

            addPartnerPlaytime.run(firstUserId, secondUserId, elapsedMs, updatedAt);
            addPartnerPlaytime.run(secondUserId, firstUserId, elapsedMs, updatedAt);
        }
    }
});

managers.playtime = {
    addSession: (guildId, userIds, elapsedMs) => {
        const roundedElapsedMs = Math.max(0, Math.floor(Number(elapsedMs) || 0));
        if (!guildId || !Array.isArray(userIds) || userIds.length === 0 || roundedElapsedMs < 1000) {
            return;
        }

        addPlaytimeSession(guildId, userIds, roundedElapsedMs, Date.now());
    },

    getProfile: (userId) => {
        const user = db.prepare('SELECT userId, totalMs, updatedAt FROM playtime_users WHERE userId = ?').get(userId);
        const topGuild = db.prepare(`
            SELECT guildId, totalMs
            FROM playtime_guilds
            WHERE userId = ?
            ORDER BY totalMs DESC
            LIMIT 1
        `).get(userId);
        const topPartner = db.prepare(`
            SELECT partnerId, totalMs
            FROM playtime_partners
            WHERE userId = ?
            ORDER BY totalMs DESC
            LIMIT 1
        `).get(userId);
        const guildSummary = db.prepare('SELECT COUNT(*) AS count FROM playtime_guilds WHERE userId = ? AND totalMs > 0').get(userId);
        const partnerSummary = db.prepare('SELECT COUNT(*) AS count FROM playtime_partners WHERE userId = ? AND totalMs > 0').get(userId);

        return {
            totalMs: user?.totalMs || 0,
            updatedAt: user?.updatedAt || 0,
            topGuild: topGuild || null,
            topPartner: topPartner || null,
            guildCount: guildSummary?.count || 0,
            partnerCount: partnerSummary?.count || 0
        };
    },

    getTopGuilds: (userId, limit = 5) => {
        return db.prepare(`
            SELECT guildId, totalMs
            FROM playtime_guilds
            WHERE userId = ?
            ORDER BY totalMs DESC
            LIMIT ?
        `).all(userId, limit);
    },

    getTopPartners: (userId, limit = 5) => {
        return db.prepare(`
            SELECT partnerId, totalMs
            FROM playtime_partners
            WHERE userId = ?
            ORDER BY totalMs DESC
            LIMIT ?
        `).all(userId, limit);
    }
};

module.exports = { db, ...managers };
