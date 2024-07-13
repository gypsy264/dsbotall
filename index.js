// Load environment variables from .env file
require('dotenv').config();

// Import the Discord.js library
const { Client, GatewayIntentBits } = require('discord.js');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Prefix for commands
const prefix = '!';

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Ready!');
    client.user.setActivity('with Discord.js', { type: 'PLAYING' });
});

// Utility function to pause execution for a specified time
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Utility function to format time in hours, minutes, and seconds
const formatTime = ms => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
};

// Function to check if the user already has the same message content in their DMs
const userHasMessage = async (user, content) => {
    const dmChannel = await user.createDM();
    const messages = await dmChannel.messages.fetch({ limit: 100 });
    return messages.some(message => message.content === content);
};

// Listen for messages
client.on('messageCreate', async message => {
    // Ignore messages that don't start with the prefix or are from bots
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    // Parse the command and arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Command handling
    if (command === 'ping') {
        message.channel.send('pong');
    } else if (command === 'hello') {
        message.channel.send('Hello there!');
    } else if (command === 'help') {
        message.channel.send('Available commands: !ping, !hello, !help, !sendmessage, !sendmessagetouser, !sendmessagetoall');
    } else if (command === 'sendmessage') {
        // Ensure only authorized users can run this command
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.channel.send('You do not have permission to use this command.');
        }

        const content = args.join(' ');
        if (!content) {
            return message.channel.send('Please provide a message to send.');
        }

        const members = await message.guild.members.fetch();
        const delayBetweenMessages = 2000; // 2 seconds
        const delayBetweenBatches = 60 * 60 * 1000; // 1 hour
        const batchLimit = Math.floor(0.75 * 100); // 75% of 100 messages

        let batchCount = 0;

        for (const member of members.values()) {
            if (!member.user.bot) {
                member.send(content).catch(err => console.error(`Could not send message to ${member.user.tag}: ${err}`));
                await sleep(delayBetweenMessages);
                batchCount++;

                if (batchCount >= batchLimit) {
                    batchCount = 0;
                    console.log('Reached batch limit, waiting for an hour before continuing...');
                    await sleep(delayBetweenBatches);
                }
            }
        }

        message.channel.send('Message sent to all members.');
    } else if (command === 'sendmessagetouser') {
        // Ensure only authorized users can run this command
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.channel.send('You do not have permission to use this command.');
        }

        // Check if a user was mentioned
        const user = message.mentions.users.first();
        if (!user) {
            return message.channel.send('Please mention a user to send the message to.');
        }

        // Get the message content
        const content = args.slice(1).join(' ');
        if (!content) {
            return message.channel.send('Please provide a message to send.');
        }

        // Send the message to the mentioned user
        user.send(content)
            .then(() => {
                console.log(`Message sent to ${user.tag}: ${content}`);
                message.channel.send(`Message sent to ${user.tag}.`);
            })
            .catch(err => {
                console.error(`Could not send message to ${user.tag}: ${err}`);
                message.channel.send(`Failed to send message to ${user.tag}.`);
            });
    } else if (command === 'sendmessagetoall') {
        // Ensure only authorized users can run this command
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.channel.send('You do not have permission to use this command.');
        }

        const content = args.join(' ');
        if (!content) {
            return message.channel.send('Please provide a message to send.');
        }

        const members = await message.guild.members.fetch();
        const totalMembers = members.size;
        const delayBetweenMessages = 2000; // 2 seconds
        const delayBetweenBatches = 60 * 60 * 1000; // 1 hour
        const batchLimit = Math.floor(0.75 * 100); // 75% of 100 messages

        // Calculate the total time required
        const batches = Math.ceil(totalMembers / batchLimit);
        const totalTime = (batches - 1) * delayBetweenBatches + totalMembers * delayBetweenMessages;
        console.log(`Estimated time to send messages to all members: ${formatTime(totalTime)}`);

        let batchCount = 0;
        let totalCount = 0;
        let completed = false;

        while (!completed) {
            for (const member of members.values()) {
                if (!member.user.bot) {
                    const alreadyHasMessage = await userHasMessage(member.user, content);
                    if (!alreadyHasMessage) {
                        await member.send(content)
                            .then(() => console.log(`Message sent to ${member.user.tag}: ${content}`))
                            .catch(err => console.error(`Could not send message to ${member.user.tag}: ${err}`));
                        await sleep(delayBetweenMessages);
                        batchCount++;
                        totalCount++;
                    } else {
                        console.log(`User ${member.user.tag} already has the message: ${content}`);
                    }

                    if (batchCount >= batchLimit) {
                        batchCount = 0;
                        console.log('Reached batch limit, waiting for an hour before continuing...');
                        await sleep(delayBetweenBatches);
                    }

                    if (totalCount >= totalMembers) {
                        completed = true;
                        break;
                    }
                }
            }
        }

        message.channel.send('Message sent to all members.');
    }
});

// Error handling
client.on('error', error => {
    console.error('The WebSocket encountered an error:', error);
});

client.on('shardError', error => {
    console.error('A websocket connection encountered an error:', error);
});

// Login to Discord with your app's token
client.login(process.env.DISCORD_TOKEN);
