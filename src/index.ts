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
    TextInputStyle
} from "discord.js";
import "dotenv/config";
import http from "http";

const TOKEN: string = process.env.DISCORD_TOKEN || "";
const GUEST_ROLE_NAME: string = process.env.GUEST_ROLE_NAME || "Guest";
const WELCOME_CHANNEL_ID: string = process.env.WELCOME_CHANNEL_ID || "";
const APPLICATIONS_CHANNEL_ID: string = process.env.APPLICATIONS_CHANNEL_ID || "1505286263807148252";
const REVIEW_CHANNEL_ID: string = process.env.REVIEW_CHANNEL_ID || "1505291368308932628";
const RESULTS_CHANNEL_ID: string = process.env.RESULTS_CHANNEL_ID || "";
const PORT: number = parseInt(process.env.PORT || "10000");

const BANNER_URL = "https://i.imgur.com/ТВОЯ_КАРТИНКА.png";

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

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setImage(BANNER_URL) // БАННЕР ВВЕРХУ
        .setTitle("👋 Путь в клан начинается здесь!")
        .setDescription(
            "## Добро пожаловать в нашу семью!\n\n" +
            "Мы рады, что ты решил присоединиться к нам.\n\n" +
            "### 📋 Процесс:\n" +
            "• Обзвон — в ЛС\n" +
            "• Отказ — в <#" + RESULTS_CHANNEL_ID + ">\n" +
            "• Сроки: 1-3 дня\n\n" +
            "### ⚠️ Важно:\n" +
            "• Заявки только при открытом наборе"
        )
        .setFooter({ text: "Желаем удачи! 🍀" })
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
    // КНОПКА ПОДАТЬ ЗАЯВКУ
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
        await interaction.deferReply({ flags: 64 }).catch(() => {});

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
        }

        await interaction.editReply({
            content: "✅ **Заявка отправлена!**\n\nОжидайте 1-3 дня. Уведомление придёт в ЛС или в <#" + RESULTS_CHANNEL_ID + ">."
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

        const actions: Record<string, { label: string; status: string; color: number; remove: boolean }> = {
            "review_": { label: "взята на рассмотрение", status: "🔍 На рассмотрении", color: 0x3498DB, remove: false },
            "approve_": { label: "одобрена", status: "✅ Одобрено", color: 0x2ECC71, remove: true },
            "reject_": { label: "отклонена", status: "❌ Отклонено", color: 0xE74C3C, remove: true },
            "call_": { label: "на обзвоне", status: "📞 Обзвон", color: 0x9B59B6, remove: false },
        };

        const action = actions[prefix];
        try {
            const user = await client.users.fetch(userId);
            const dm = new EmbedBuilder()
                .setColor(action.color)
                .setTitle(`📢 Заявка ${action.label}`)
                .setDescription(getDmText(action.label))
                .setTimestamp();
            await user.send({ embeds: [dm] });
            console.log(`✅ Уведомление отправлено ${user.tag}`);
        } catch {
            console.log("⚠️ ЛС закрыты");
        }

        const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(action.color)
            .setFooter({ text: `Статус: ${action.status}` });

        await interaction.editReply({
            embeds: [newEmbed],
            components: action.remove ? [] : interaction.message.components,
        }).catch(() => {});

        console.log(`✅ Заявка ${userId} ${action.label}`);
        return;
    }
});

function getDmText(action: string): string {
    const texts: Record<string, string> = {
        "взята на рассмотрение": "Ваша заявка взята на рассмотрение.\n\nОжидайте решения в ближайшее время!",
        "одобрена": "🎉 Поздравляем! Заявка одобрена!\n\nДобро пожаловать в клан! Скоро с вами свяжутся.",
        "отклонена": "❌ К сожалению, заявка отклонена.\n\nПопробуйте подать заявку позже.",
        "на обзвоне": "📞 Вас приглашают на собеседование!\n\nАдминистратор свяжется для уточнения времени.",
    };
    return texts[action] || "Статус заявки изменён.";
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
            .addFields({ name: "📝 Заявка в клан:", value: `<#${APPLICATIONS_CHANNEL_ID}>` })
            .setTimestamp();

        await (channel as TextChannel).send({ embeds: [embed] }).catch(() => {});
    }
});

http.createServer((_, res) => { res.writeHead(200); res.end("OK"); }).listen(PORT, () => console.log(`🌐 HTTP:${PORT}`));

console.log("🚀 Запуск...");
client.login(TOKEN);