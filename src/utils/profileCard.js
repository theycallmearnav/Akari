const zlib = require("zlib");

const FONT = {
    " ": ["000", "000", "000", "000", "000", "000", "000"],
    "!": ["010", "010", "010", "010", "010", "000", "010"],
    "#": ["10101", "10101", "11111", "10101", "11111", "10101", "10101"],
    "&": ["0110", "1001", "1010", "0100", "1010", "1001", "0111"],
    "'": ["010", "010", "010", "000", "000", "000", "000"],
    "(": ["001", "010", "100", "100", "100", "010", "001"],
    ")": ["100", "010", "001", "001", "001", "010", "100"],
    "+": ["000", "010", "010", "111", "010", "010", "000"],
    ",": ["000", "000", "000", "000", "010", "010", "100"],
    "-": ["000", "000", "000", "111", "000", "000", "000"],
    ".": ["000", "000", "000", "000", "000", "010", "010"],
    "/": ["001", "001", "010", "010", "010", "100", "100"],
    "0": ["111", "101", "101", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "010", "010", "111"],
    "2": ["111", "001", "001", "111", "100", "100", "111"],
    "3": ["111", "001", "001", "111", "001", "001", "111"],
    "4": ["101", "101", "101", "111", "001", "001", "001"],
    "5": ["111", "100", "100", "111", "001", "001", "111"],
    "6": ["111", "100", "100", "111", "101", "101", "111"],
    "7": ["111", "001", "001", "010", "010", "100", "100"],
    "8": ["111", "101", "101", "111", "101", "101", "111"],
    "9": ["111", "101", "101", "111", "001", "001", "111"],
    ":": ["000", "010", "010", "000", "010", "010", "000"],
    "?": ["111", "001", "001", "010", "010", "000", "010"],
    "@": ["01110", "10001", "10111", "10101", "10111", "10000", "01111"],
    "A": ["010", "101", "101", "111", "101", "101", "101"],
    "B": ["110", "101", "101", "110", "101", "101", "110"],
    "C": ["011", "100", "100", "100", "100", "100", "011"],
    "D": ["110", "101", "101", "101", "101", "101", "110"],
    "E": ["111", "100", "100", "110", "100", "100", "111"],
    "F": ["111", "100", "100", "110", "100", "100", "100"],
    "G": ["011", "100", "100", "101", "101", "101", "011"],
    "H": ["101", "101", "101", "111", "101", "101", "101"],
    "I": ["111", "010", "010", "010", "010", "010", "111"],
    "J": ["001", "001", "001", "001", "001", "101", "010"],
    "K": ["101", "101", "110", "100", "110", "101", "101"],
    "L": ["100", "100", "100", "100", "100", "100", "111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["1001", "1101", "1011", "1001", "1001", "1001", "1001"],
    "O": ["010", "101", "101", "101", "101", "101", "010"],
    "P": ["110", "101", "101", "110", "100", "100", "100"],
    "Q": ["0100", "1010", "1010", "1010", "1010", "1010", "0111"],
    "R": ["110", "101", "101", "110", "110", "101", "101"],
    "S": ["011", "100", "100", "010", "001", "001", "110"],
    "T": ["111", "010", "010", "010", "010", "010", "010"],
    "U": ["101", "101", "101", "101", "101", "101", "111"],
    "V": ["101", "101", "101", "101", "101", "101", "010"],
    "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
    "X": ["101", "101", "101", "010", "101", "101", "101"],
    "Y": ["101", "101", "101", "010", "010", "010", "010"],
    "Z": ["111", "001", "001", "010", "100", "100", "111"],
    "_": ["000", "000", "000", "000", "000", "000", "111"],
    "|": ["010", "010", "010", "010", "010", "010", "010"],
};

const WIDTH = 1000;
const HEIGHT = 420;

function color(hex) {
    const normalized = hex.replace("#", "");
    return [
        parseInt(normalized.slice(0, 2), 16),
        parseInt(normalized.slice(2, 4), 16),
        parseInt(normalized.slice(4, 6), 16),
        255
    ];
}

function blendPixel(data, index, rgba) {
    const alpha = rgba[3] / 255;
    const inverseAlpha = 1 - alpha;

    data[index] = Math.round(rgba[0] * alpha + data[index] * inverseAlpha);
    data[index + 1] = Math.round(rgba[1] * alpha + data[index + 1] * inverseAlpha);
    data[index + 2] = Math.round(rgba[2] * alpha + data[index + 2] * inverseAlpha);
    data[index + 3] = 255;
}

function createCanvas(width, height, fill) {
    const data = Buffer.alloc(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
        data[i] = fill[0];
        data[i + 1] = fill[1];
        data[i + 2] = fill[2];
        data[i + 3] = 255;
    }
    return { width, height, data };
}

function setPixel(canvas, x, y, rgba) {
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
    blendPixel(canvas.data, (y * canvas.width + x) * 4, rgba);
}

function fillRect(canvas, x, y, width, height, rgba) {
    const startX = Math.max(0, Math.floor(x));
    const startY = Math.max(0, Math.floor(y));
    const endX = Math.min(canvas.width, Math.ceil(x + width));
    const endY = Math.min(canvas.height, Math.ceil(y + height));

    for (let row = startY; row < endY; row++) {
        for (let col = startX; col < endX; col++) {
            setPixel(canvas, col, row, rgba);
        }
    }
}

function fillCircle(canvas, centerX, centerY, radius, rgba) {
    const r2 = radius * radius;
    for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y++) {
        for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            if (dx * dx + dy * dy <= r2) {
                setPixel(canvas, x, y, rgba);
            }
        }
    }
}

function fillRoundedRect(canvas, x, y, width, height, radius, rgba) {
    fillRect(canvas, x + radius, y, width - radius * 2, height, rgba);
    fillRect(canvas, x, y + radius, width, height - radius * 2, rgba);
    fillCircle(canvas, x + radius, y + radius, radius, rgba);
    fillCircle(canvas, x + width - radius, y + radius, radius, rgba);
    fillCircle(canvas, x + radius, y + height - radius, radius, rgba);
    fillCircle(canvas, x + width - radius, y + height - radius, radius, rgba);
}

function drawAvatar(canvas, user, x, y, radius) {
    const rawId = String(user.id || "1");
    const seed = /^\d+$/.test(rawId)
        ? BigInt(rawId)
        : BigInt([...rawId].reduce((total, char) => total + char.charCodeAt(0), 1));
    const first = Number(seed % 155n) + 55;
    const second = Number((seed / 13n) % 155n) + 55;
    const third = Number((seed / 97n) % 155n) + 55;

    fillCircle(canvas, x, y, radius + 7, [255, 255, 255, 55]);
    fillCircle(canvas, x, y, radius, [first, second, third, 255]);
    fillCircle(canvas, x - radius / 3, y - radius / 5, radius / 2, [255, 255, 255, 22]);

    const initial = (user.displayName || user.username || "?").trim().charAt(0).toUpperCase() || "?";
    drawText(canvas, initial, x - 22, y - 30, 8, [255, 255, 255, 255], 1);
}

function glyphWidth(char) {
    const glyph = FONT[char.toUpperCase()] || FONT["?"];
    return glyph[0].length;
}

function textWidth(text, scale, spacing = 1) {
    return text
        .split("")
        .reduce((total, char, index) => total + glyphWidth(char) * scale + (index === 0 ? 0 : spacing * scale), 0);
}

function sanitizeText(text) {
    return String(text || "")
        .normalize("NFKD")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function truncateText(text, maxWidth, scale) {
    const sanitized = sanitizeText(text);
    if (textWidth(sanitized, scale) <= maxWidth) {
        return sanitized;
    }

    let result = sanitized;
    while (result.length > 0 && textWidth(`${result}...`, scale) > maxWidth) {
        result = result.slice(0, -1);
    }

    return `${result.trim()}...`;
}

function drawText(canvas, text, x, y, scale, rgba, spacing = 1) {
    let cursorX = Math.floor(x);
    const normalized = sanitizeText(text).toUpperCase();

    for (const char of normalized) {
        const glyph = FONT[char] || FONT["?"];
        for (let row = 0; row < glyph.length; row++) {
            for (let col = 0; col < glyph[row].length; col++) {
                if (glyph[row][col] !== "1") continue;
                fillRect(canvas, cursorX + col * scale, y + row * scale, scale, scale, rgba);
            }
        }
        cursorX += (glyph[0].length + spacing) * scale;
    }
}

function drawBar(canvas, x, y, width, height, ratio, fill, background) {
    fillRoundedRect(canvas, x, y, width, height, Math.floor(height / 2), background);
    const fillWidth = Math.max(height, Math.floor(width * Math.max(0.05, Math.min(1, ratio))));
    fillRoundedRect(canvas, x, y, fillWidth, height, Math.floor(height / 2), fill);
}

function makeCrcTable() {
    const table = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c >>> 0;
    }
    return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buffer) {
    let crc = 0 ^ -1;
    for (let i = 0; i < buffer.length; i++) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
    const typeBuffer = Buffer.from(type, "ascii");
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function encodePng(canvas) {
    const scanlines = Buffer.alloc((canvas.width * 4 + 1) * canvas.height);
    for (let y = 0; y < canvas.height; y++) {
        const scanlineOffset = y * (canvas.width * 4 + 1);
        scanlines[scanlineOffset] = 0;
        canvas.data.copy(scanlines, scanlineOffset + 1, y * canvas.width * 4, (y + 1) * canvas.width * 4);
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(canvas.width, 0);
    ihdr.writeUInt32BE(canvas.height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        chunk("IHDR", ihdr),
        chunk("IDAT", zlib.deflateSync(scanlines, { level: 9 })),
        chunk("IEND", Buffer.alloc(0))
    ]);
}

function formatDuration(ms) {
    const totalSeconds = Math.floor((Number(ms) || 0) / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${Math.max(0, totalSeconds)}s`;
}

function drawMetric(canvas, label, value, x, y, width, ratio) {
    fillRoundedRect(canvas, x, y, width, 86, 8, [16, 23, 35, 232]);
    drawText(canvas, label, x + 18, y + 16, 3, [143, 161, 184, 255]);
    drawText(canvas, value, x + 18, y + 42, 4, [241, 245, 249, 255]);
    drawBar(canvas, x + 18, y + 68, width - 36, 8, ratio, [45, 212, 191, 255], [51, 65, 85, 255]);
}

function createProfileCard(profile) {
    const canvas = createCanvas(WIDTH, HEIGHT, [8, 13, 23, 255]);

    for (let y = 0; y < HEIGHT; y++) {
        const mix = y / HEIGHT;
        for (let x = 0; x < WIDTH; x++) {
            const index = (y * WIDTH + x) * 4;
            canvas.data[index] = Math.round(8 + 8 * mix + 7 * (x / WIDTH));
            canvas.data[index + 1] = Math.round(13 + 16 * mix);
            canvas.data[index + 2] = Math.round(23 + 26 * mix + 14 * (1 - x / WIDTH));
        }
    }

    fillCircle(canvas, 900, 58, 180, [45, 212, 191, 20]);
    fillCircle(canvas, 80, 380, 150, [56, 189, 248, 18]);
    fillRoundedRect(canvas, 28, 28, WIDTH - 56, HEIGHT - 56, 10, [15, 23, 42, 228]);
    fillRect(canvas, 58, 136, WIDTH - 116, 1, [148, 163, 184, 70]);

    drawAvatar(canvas, profile.user, 104, 86, 40);

    const displayName = truncateText(profile.user.displayName || profile.user.username || "Unknown User", 470, 6);
    drawText(canvas, displayName, 166, 62, 6, [248, 250, 252, 255]);
    drawText(canvas, "PLAYBACK PROFILE", 168, 112, 3, [94, 234, 212, 255]);

    const totalMs = profile.totalMs || 0;
    const topGuildMs = profile.topGuild?.totalMs || 0;
    const topPartnerMs = profile.topPartner?.totalMs || 0;
    const topGuildName = profile.topGuild?.name || "No server yet";
    const topPartnerName = profile.topPartner?.name || "No companion yet";

    drawMetric(canvas, "TOTAL PLAYTIME", formatDuration(totalMs), 58, 164, 270, 1);
    drawMetric(canvas, "TOP SERVER", formatDuration(topGuildMs), 365, 164, 270, totalMs ? topGuildMs / totalMs : 0);
    drawMetric(canvas, "TOP COMPANION", formatDuration(topPartnerMs), 672, 164, 270, totalMs ? topPartnerMs / totalMs : 0);

    fillRoundedRect(canvas, 58, 282, 884, 78, 8, [2, 6, 23, 178]);
    drawText(canvas, "MOST ACTIVE SERVER", 82, 300, 3, [148, 163, 184, 255]);
    drawText(canvas, truncateText(topGuildName, 360, 4), 82, 327, 4, [226, 232, 240, 255]);

    drawText(canvas, "MOST PLAYED WITH", 528, 300, 3, [148, 163, 184, 255]);
    drawText(canvas, truncateText(topPartnerName, 340, 4), 528, 327, 4, [226, 232, 240, 255]);

    const footer = totalMs > 0
        ? `${profile.guildCount || 0} servers | ${profile.partnerCount || 0} companions tracked`
        : "Listen to music in voice to start building this profile";
    drawText(canvas, footer, 60, 382, 3, [100, 116, 139, 255]);

    return encodePng(canvas);
}

module.exports = {
    createProfileCard,
    formatDuration,
};
