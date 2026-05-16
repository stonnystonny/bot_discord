import {
    Client,
    Events,
    GatewayIntentBits,
    GuildMember,
    Role,
    TextChannel,
} from "discord.js";
import "dotenv/config";
import http from "http";

const TOKEN: string = process.env.DISCORD_TOKEN || "";
const GUEST_ROLE_NAME: string = process.env.GUEST_ROLE_NAME || "Guest";
const WELCOME_CHANNEL_ID: string = process.env.WELCOME_CHANNEL_ID || "";
const PORT: number = parseInt(process.env.PORT || "10000");

if (!TOKEN) {
    console.error("❌ ОШИБКА: Токен не найден!");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`✅ Бот ${readyClient.user.tag} успешно запущен!`);
    console.log(`📊 Серверов: ${readyClient.guilds.cache.size}`);
});

client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    console.log(`🔔 Новый участник: ${member.user.tag}`);
    const guild = member.guild;
    const guestRole: Role | undefined = guild.roles.cache.find(
        (role) => role.name === GUEST_ROLE_NAME
    );

    if (!guestRole) {
        console.error(`❌ Роль "${GUEST_ROLE_NAME}" не найдена на сервере ${guild.name}`);
        return;
    }

    try {
        await member.roles.add(guestRole);
        console.log(`✅ Роль ${guestRole.name} выдана пользователю ${member.user.tag}`);
    } catch (error) {
        console.error(`❌ Не удалось выдать роль:`, error);
        return;
    }

    const welcomeMessage = `Добро пожаловать, ${member.user}!`;
    let targetChannel: TextChannel | null = null;

    try {
        if (WELCOME_CHANNEL_ID) {
            const channel = await client.channels.fetch(WELCOME_CHANNEL_ID);
            if (channel && channel.isTextBased() && !channel.isDMBased()) {
                targetChannel = channel as TextChannel;
            }
        } else {
            if (guild.systemChannel) {
                targetChannel = guild.systemChannel as TextChannel;
            }
        }

        if (targetChannel) {
            await targetChannel.send(welcomeMessage);
            console.log(`💬 Приветствие отправлено в #${targetChannel.name}`);
        } else {
            console.log("❌ Канал для приветствия не найден");
        }
    } catch (error) {
        console.error("❌ Ошибка при отправке:", error);
    }
});

http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is alive!");
}).listen(PORT, () => {
    console.log(`🌐 HTTP сервер запущен на порту ${PORT}`);
});

console.log("Запускаю бота...");
client.login(TOKEN);