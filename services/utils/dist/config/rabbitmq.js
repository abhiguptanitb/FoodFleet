import amqp from "amqplib";
let channel;
const REQUIRED_ENV_VARS = ["RABBITMQ_URL", "PAYMENT_QUEUE"];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getErrorMessage = (error) => error instanceof Error ? error.message : String(error);
const getRequiredEnv = (name) => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};
export const connectRabbitMQ = async () => {
    const rabbitUrl = getRequiredEnv("RABBITMQ_URL");
    const paymentQueue = getRequiredEnv("PAYMENT_QUEUE");
    let lastError;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
        try {
            const connection = await amqp.connect(rabbitUrl);
            channel = await connection.createChannel();
            await channel.assertQueue(paymentQueue, {
                durable: true,
            });
            return;
        }
        catch (error) {
            lastError = error;
            if (attempt < 5) {
                console.warn(`RabbitMQ connection failed. Retrying (${attempt}/5)...`);
                await delay(2000);
            }
        }
    }
    console.error(`Last RabbitMQ error: ${getErrorMessage(lastError)}`);
    throw new Error("Utils service could not connect to RabbitMQ. Make sure RabbitMQ is running and RABBITMQ_URL points to it.");
};
export const getChannel = () => channel;
