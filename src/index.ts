import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Client,
    EmbedBuilder,
    Events,
    GatewayIntentBits,
    ModalBuilder,
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
const REVIEW_CHANNEL_ID: string = process.env.REVIEW_CHANNEL_ID || "1505291368308932628";
const RESULTS_CHANNEL_ID: string = process.env.RESULTS_CHANNEL_ID || "1505287736850907296";
const PORT: number = parseInt(process.env.PORT || "10000");

const recentApplications = new Map<string, number>();

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

setInterval(() => {
    const now = Date.now();
    for (const [userId, timestamp] of recentApplications) {
        if (now - timestamp > 5 * 60 * 1000) {
            recentApplications.delete(userId);
        }
    }
}, 5 * 60 * 1000);

client.once(Events.ClientReady, async (c) => {
    console.log(`✅ Бот ${c.user.tag} запущен!`);
    console.log(`📊 Серверов: ${c.guilds.cache.size}`);
    await sendApplicationMessage(c);
});

async function sendApplicationMessage(client: Client) {
    const appChannel = await client.channels.fetch(APPLICATIONS_CHANNEL_ID).catch(() => null);
    if (!appChannel?.isTextBased()) {
        console.log("❌ Канал для заявок не найден!");
        return;
    }

    const textChannel = appChannel as TextChannel;
    const messages = await textChannel.messages.fetch({ limit: 10 });
    const botMsg = messages.find(m =>
        m.author.id === client.user?.id &&
        m.embeds.length > 0 &&
        m.embeds[0].title?.includes("Путь в клан")
    );

    if (botMsg) {
        console.log("📨 Сообщение уже существует");
        return;
    }

    const botAvatar = client.user?.displayAvatarURL({ size: 256 }) || "";

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("👋 Путь в клан начинается здесь!")
        .setDescription(
            "Уведомление о приглашении на обзвон обычно отправляется в личные сообщения. " +
            "Если ЛС закрыты, оно отправляется в канал — <#" + RESULTS_CHANNEL_ID + ">. " +
            "В этот канал также приходят уведомления об отказе в наборе.\n\n" +
            "Обычно заявки обрабатываются в течение **1-3 дней** — всё зависит от того, " +
            "насколько загружены наши люди на данный момент.\n\n" +
            "Подать заявку можно только при **открытом наборе**. " +
            "Если не выходит — набор закрыт. Внимательно прочтите сообщение ниже."
        )
        .setThumbnail(botAvatar)
        .setFooter({ text: "Желаем удачи! 🍀", iconURL: botAvatar })
        .setTimestamp();

    const button = new ButtonBuilder()
        .setCustomId("open_application")
        .setLabel("📝 Подать заявку")
        .setStyle(ButtonStyle.Primary);

    await textChannel.send({
        embeds: [embed],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
    });

    console.log(`📨 Сообщение отправлено`);
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton() && interaction.customId === "open_application") {
        const modal = new ModalBuilder()
            .setCustomId("application_modal")
            .setTitle("📋 Заявка на вступление в клан");

        const inputs = [
            new TextInputBuilder().setCustomId("nickname").setLabel("🎮 Игровой никнейм и статик").setPlaceholder("Введите ваш ник и статик").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100),
            new TextInputBuilder().setCustomId("age").setLabel("🎂 Возраст и средний онлайн").setPlaceholder("Сколько лет и средний онлайн?").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50),
            new TextInputBuilder().setCustomId("experience").setLabel("⏳ Стаж на проекте и сервера").setPlaceholder("Как давно играете? На каких серверах?").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500),
            new TextInputBuilder().setCustomId("about").setLabel("🏠 В каких семьях вы находились").setPlaceholder("Расскажите о вашем опыте в семьях").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000),
            new TextInputBuilder().setCustomId("discord_contact").setLabel("⚔ Откаты с арены (спешик/сайга)").setPlaceholder("Укажите откаты или оставьте пустым").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100),
        ];

        modal.addComponents(inputs.map(i => new ActionRowBuilder<TextInputBuilder>().addComponents(i)));

        await interaction.showModal(modal).catch(e => console.error("Ошибка showModal:", e.message));
        return;
    }

    if (interaction.isModalSubmit() && interaction.customId === "application_modal") {
        const lastApplication = recentApplications.get(interaction.user.id);
        if (lastApplication && Date.now() - lastApplication < 5 * 60 * 1000) {
            await interaction.reply({ 
                content: "⚠️ **Вы уже подали заявку!**\n\nПожалуйста, ожидайте рассмотрения. Повторная отправка возможна через 5 минут.", 
                flags: 64 
            }).catch(() => {});
            return;
        }

        await interaction.deferReply({ flags: 64 }).catch(() => {});

        recentApplications.set(interaction.user.id, Date.now());

        const data = {
            nickname: interaction.fields.getTextInputValue("nickname"),
            age: interaction.fields.getTextInputValue("age"),
            experience: interaction.fields.getTextInputValue("experience"),
            about: interaction.fields.getTextInputValue("about"),
            contact: interaction.fields.getTextInputValue("discord_contact") || "Не указан",
        };

        console.log(`📝 Заявка от ${interaction.user.tag}`);

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle("📋 Новая заявка на вступление!")
            .setDescription(`${interaction.user} хочет вступить в клан`)
            .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "👤 Discord", value: `${interaction.user.tag}\nID: \`${interaction.user.id}\``, inline: false },
                { name: "🎮 Никнейм и статик", value: data.nickname, inline: false },
                { name: "🎂 Возраст и онлайн", value: data.age, inline: false },
                { name: "⚔ Откаты с арены", value: data.contact, inline: false },
                { name: "⏳ Стаж и сервера", value: data.experience, inline: false },
                { name: "🏠 Опыт в семьях", value: data.about, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: "Статус: Новая заявка" });

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`review_${interaction.user.id}`).setLabel("🔍 На рассмотрение").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`approve_${interaction.user.id}`).setLabel("✅ Одобрить").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`call_${interaction.user.id}`).setLabel("📞 На обзвон").setStyle(ButtonStyle.Secondary),
        );

        const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL_ID).catch(() => null);
        if (reviewChannel?.isTextBased()) {
            await (reviewChannel as TextChannel).send({ embeds: [embed], components: [buttons] });
            console.log("✅ Заявка отправлена в канал рассмотрения");
        } else {
            console.log("❌ Канал рассмотрения не найден");
        }

        await interaction.editReply({
            content: "✅ **Заявка успешно отправлена!**\n\n" +
                "Ожидайте рассмотрения в течение 1-3 дней.\n" +
                "Уведомление о результате придёт в ЛС или в <#" + RESULTS_CHANNEL_ID + ">.\n\n" +
                "Желаем удачи! 🍀"
        }).catch(() => {});
        return;
    }

    if (interaction.isButton()) {
        const id = interaction.customId;
        const prefixes = ["review_", "approve_", "reject_", "call_"];
        const prefix = prefixes.find(p => id.startsWith(p));
        if (!prefix) return;

        await interaction.deferUpdate().catch(() => {});

        const userId = id.replace(prefix, "");
        const adminMention = interaction.user.toString();

        const actions: Record<string, { label: string; status: string; color: number; remove: boolean; emoji: string }> = {
            "review_": { label: "взята на рассмотрение", status: "🔍 На рассмотрении", color: 0x3498DB, remove: false, emoji: "🔍" },
            "approve_": { label: "одобрена", status: "✅ Одобрено", color: 0x2ECC71, remove: true, emoji: "✅" },
            "reject_": { label: "отклонена", status: "❌ Отклонено", color: 0xE74C3C, remove: true, emoji: "❌" },
            "call_": { label: "на обзвоне", status: "📞 Обзвон", color: 0x9B59B6, remove: false, emoji: "📞" },
        };

        const action = actions[prefix];
        let userTag = "Неизвестный пользователь";

        try {
            const user = await client.users.fetch(userId);
            userTag = user.tag;
            const dm = new EmbedBuilder()
                .setColor(action.color)
                .setTitle(`📢 Заявка ${action.label}`)
                .setDescription(getDmText(action.label, adminMention))
                .setTimestamp()
                .setFooter({ text: "Администрация клана" });
            await user.send({ embeds: [dm] });
            console.log(`✅ Уведомление отправлено ${user.tag}`);
        } catch {
            console.log(`⚠️ Не удалось отправить ЛС пользователю ${userId}`);
        }

        const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(action.color)
            .setFooter({ text: `Статус: ${action.status} администратором ${interaction.user.tag}` });

        await interaction.editReply({
            embeds: [newEmbed],
            components: action.remove ? [] : interaction.message.components,
        }).catch(() => {});

        if (prefix === "approve_" || prefix === "reject_") {
            const resultsChannel = await client.channels.fetch(RESULTS_CHANNEL_ID).catch(() => null);
            if (resultsChannel?.isTextBased()) {
                const resultEmbed = new EmbedBuilder()
                    .setColor(action.color)
                    .setTitle(`${action.emoji} Заявка ${action.label}!`)
                    .setDescription(
                        `**Пользователь:** <@${userId}>\n` +
                        `**Discord:** ${userTag}\n` +
                        `**ID:** \`${userId}\`\n\n` +
                        `**Администратор:** ${adminMention}\n` +
                        `Решение принято администратором ${adminMention}.`
                    )
                    .setTimestamp();

                await (resultsChannel as TextChannel).send({ embeds: [resultEmbed] });
                console.log(`📢 Результат отправлен в канал итогов`);
            }
        }

        console.log(`✅ Заявка ${userId} ${action.label} администратором ${interaction.user.tag}`);
        return;
    }
});

function getDmText(action: string, adminMention: string): string {
    const texts: Record<string, string> = {
        "взята на рассмотрение": 
            `Ваша заявка была взята на рассмотрение администратором ${adminMention}.\n\n` +
            "Мы внимательно изучим вашу анкету и примем решение в ближайшее время.\n\n" +
            "Ожидайте дальнейших уведомлений!",
        "одобрена": 
            "🎉 **Поздравляем!**\n\n" +
            `Ваша заявка на вступление в клан была одобрена администратором ${adminMention}!\n\n` +
            "Добро пожаловать! 🎉\n\n" +
            "В ближайшее время с вами свяжется администрация для дальнейших инструкций.",
        "отклонена": 
            `❌ К сожалению, ваша заявка на вступление в клан была отклонена администратором ${adminMention}.\n\n` +
            "Это может быть связано с:\n" +
            "• Несоответствием требованиям клана\n" +
            "• Закрытым набором\n" +
            "• Другими причинами\n\n" +
            "Не расстраивайтесь! Вы можете попробовать подать заявку снова в будущем.",
        "на обзвоне": 
            "📞 **Приглашение на собеседование!**\n\n" +
            "Вас приглашают на голосовое собеседование!\n\n" +
            `• С вами свяжется администратор ${adminMention} для уточнения времени\n` +
            "• Обзвон проходит в голосовом канале Discord\n" +
            "• Подготовьтесь рассказать о себе и своём опыте\n\n" +
            "Пожалуйста, будьте на связи и проверяйте личные сообщения!\n\n" +
            "Удачи! 🍀",
    };
    return texts[action] || "Статус вашей заявки изменился.";
}

client.on(Events.GuildMemberAdd, async (member) => {
    const role = member.guild.roles.cache.find(r => r.name === GUEST_ROLE_NAME);
    if (role) {
        await member.roles.add(role).catch(() => {});
        console.log(`✅ Роль ${role.name} выдана ${member.user.tag}`);
    }

    const channel = WELCOME_CHANNEL_ID
        ? await client.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null)
        : member.guild.systemChannel;

    if (channel?.isTextBased() && !channel.isDMBased()) {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("👋 Добро пожаловать!")
            .setDescription(`${member.user}, добро пожаловать на сервер!`)
            .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
            .addFields({ name: "📝 Чтобы подать заявку в клан:", value: `Перейдите в канал <#${APPLICATIONS_CHANNEL_ID}>` })
            .setTimestamp()
            .setFooter({ text: "Мы рады видеть тебя!" });

        await (channel as TextChannel).send({ embeds: [embed] }).catch(() => {});
    }
});

http.createServer((_, res) => { res.writeHead(200); res.end("OK"); }).listen(PORT, () => console.log(`🌐 HTTP:${PORT}`));

console.log("🚀 Запуск...");
client.login(TOKEN);