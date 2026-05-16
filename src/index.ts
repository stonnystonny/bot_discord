import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Client,
    EmbedBuilder,
    Events,
    GatewayIntentBits,
    GuildMember,
    Interaction,
    ModalBuilder,
    Role,
    TextChannel,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import "dotenv/config";
import http from "http";

const TOKEN: string = process.env.DISCORD_TOKEN || "";
const GUEST_ROLE_NAME: string = process.env.GUEST_ROLE_NAME || "Guest";
const WELCOME_CHANNEL_ID: string = process.env.WELCOME_CHANNEL_ID || "";
const APPLICATIONS_CHANNEL_ID: string = process.env.APPLICATIONS_CHANNEL_ID || "1505286263807148252";
const RESULTS_CHANNEL_ID: string = process.env.RESULTS_CHANNEL_ID || "";
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

client.once(Events.ClientReady, async (readyClient) => {
    console.log(`✅ Бот ${readyClient.user.tag} успешно запущен!`);
    console.log(`📊 Серверов: ${readyClient.guilds.cache.size}`);

    // Отправляем сообщение с заявкой в канал "Заявки"
    const appChannel = await client.channels.fetch(APPLICATIONS_CHANNEL_ID);
    if (appChannel && appChannel.isTextBased()) {
        const textChannel = appChannel as TextChannel;

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("👋 Путь в клан начинается здесь!")
            .setDescription(
                "**Уведомление о приглашении на обзвон** обычно отправляется в личные сообщения.\n" +
                "Если ЛС закрыты, оно отправляется в канал — <#" + RESULTS_CHANNEL_ID + ">.\n" +
                "В этот канал также приходят уведомления об отказе в наборе.\n\n" +
                "Обычно заявки обрабатываются в течение **1-3 дней** — всё зависит от того, насколько загружены наши люди на данный момент.\n\n" +
                "⚠️ Подать заявку можно только при **открытом наборе**. Если не выходит — набор закрыт.\n" +
                "Внимательно прочтите сообщение ниже."
            )
            .setFooter({ text: "Удачи!" })
            .setTimestamp();

        const button = new ButtonBuilder()
            .setCustomId("open_application")
            .setLabel("📝 Подать заявку")
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await textChannel.send({
            embeds: [embed],
            components: [row],
        });

        console.log(`📨 Сообщение с заявкой отправлено в канал #${textChannel.name}`);
    } else {
        console.log("❌ Канал для заявок не найден!");
    }
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "open_application") {
        const modal = new ModalBuilder()
            .setCustomId("application_modal")
            .setTitle("Заявка на вступление в клан");

        const nicknameInput = new TextInputBuilder()
            .setCustomId("nickname")
            .setLabel("Ваш игровой никнейм и статик")
            .setPlaceholder("Введите ваш ник и статик в игре")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        const ageInput = new TextInputBuilder()
            .setCustomId("age")
            .setLabel("Ваш возраст и средний онлайн в игра")
            .setPlaceholder("Сколько вам лет и сколько онлайн?")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(3);

        const experienceInput = new TextInputBuilder()
            .setCustomId("experience")
            .setLabel("Стаж на проекте и сервера")
            .setPlaceholder("Как давно играете? И на каких серверах?")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(500);

        const aboutInput = new TextInputBuilder()
            .setCustomId("about")
            .setLabel("В каких семьях вы находились")
            .setPlaceholder("Расскажите о вашем опыте в семьях, если он есть")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);

        const discordInput = new TextInputBuilder()
            .setCustomId("discord_contact")
            .setLabel("откаты с арены спешик или сайга")
            .setPlaceholder("Откаты с арены спешик или сайга, если есть. Если нет - оставьте поле пустым")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(100);

        const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(nicknameInput);
        const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(ageInput);
        const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(experienceInput);
        const row4 = new ActionRowBuilder<TextInputBuilder>().addComponents(aboutInput);
        const row5 = new ActionRowBuilder<TextInputBuilder>().addComponents(discordInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        await interaction.showModal(modal);
    }
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === "application_modal") {
        const nickname = interaction.fields.getTextInputValue("nickname");
        const age = interaction.fields.getTextInputValue("age");
        const experience = interaction.fields.getTextInputValue("experience");
        const about = interaction.fields.getTextInputValue("about");
        const discordContact = interaction.fields.getTextInputValue("discord_contact") || "Не указан";

        if (RESULTS_CHANNEL_ID) {
            const resultsChannel = await client.channels.fetch(RESULTS_CHANNEL_ID);
            if (resultsChannel && resultsChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setTitle("📋 Новая заявка!")
                    .setAuthor({
                        name: interaction.user.tag,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .addFields(
                        { name: "👤 Discord", value: `<@${interaction.user.id}>`, inline: true },
                        { name: "🎮 Никнейм", value: nickname, inline: true },
                        { name: "🎂 Возраст", value: age, inline: true },
                        { name: "⏳ Опыт", value: experience },
                        { name: "📝 О себе", value: about },
                        { name: "📞 Контактный Discord", value: discordContact }
                    )
                    .setTimestamp()
                    .setFooter({ text: `ID: ${interaction.user.id}` });

                await (resultsChannel as TextChannel).send({ embeds: [embed] });
            }
        }

        await interaction.reply({
            content: "✅ **Заявка успешно отправлена!**\n\n" +
                "Ожидайте, обычно заявки обрабатываются в течение 1-3 дней.\n" +
                "Уведомление придёт в личные сообщения или в канал <#" + RESULTS_CHANNEL_ID + ">.",
            ephemeral: true, // Видно только пользователю
        });

        console.log(`📋 Заявка от ${interaction.user.tag}: ${nickname}`);
    }
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