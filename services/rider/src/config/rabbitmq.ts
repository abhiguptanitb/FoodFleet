import amqp from "amqplib";

let channel: amqp.Channel;

const REQUIRED_ENV_VARS = [
  "RABBITMQ_URL",
  "RIDER_QUEUE",
  "ORDER_READY_QUEUE",
] as const;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const getRequiredEnv = (name: (typeof REQUIRED_ENV_VARS)[number]) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const connectRabbitMQ = async () => {
  const rabbitUrl = getRequiredEnv("RABBITMQ_URL");
  const riderQueue = getRequiredEnv("RIDER_QUEUE");
  const orderReadyQueue = getRequiredEnv("ORDER_READY_QUEUE");

  let lastError: unknown;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const connection = await amqp.connect(rabbitUrl);

      channel = await connection.createChannel();

      await channel.assertQueue(riderQueue, {
        durable: true,
      });
      await channel.assertQueue(orderReadyQueue, {
        durable: true,
      });

      console.log("Connected to RabbitMQ (rider service)");
      return;
    } catch (error) {
      lastError = error;

      if (attempt < 5) {
        console.warn(
          `RabbitMQ connection failed for rider service. Retrying (${attempt}/5)...`
        );
        await delay(2000);
      }
    }
  }

  console.error(`Last RabbitMQ error: ${getErrorMessage(lastError)}`);
  throw new Error(
    "Rider service could not connect to RabbitMQ. Make sure RabbitMQ is running and RABBITMQ_URL points to it."
  );
};

export const getChannel = () => channel;
