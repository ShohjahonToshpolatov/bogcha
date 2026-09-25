export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  jwt: {
    accessSecret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresInDays: parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? '30', 10),
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT,
    bucket: process.env.S3_BUCKET,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION ?? 'us-east-1',
  },

  mediamtx: {
    url: process.env.MEDIAMTX_URL ?? 'rtsp://localhost:8554',
    apiUrl: process.env.MEDIAMTX_API_URL ?? 'http://localhost:9997',
    hlsUrl: process.env.MEDIAMTX_HLS_URL ?? 'http://localhost:8888',
    webrtcUrl: process.env.MEDIAMTX_WEBRTC_URL ?? 'http://localhost:8889',
  },

  fcm: {
    serverKey: process.env.FCM_SERVER_KEY,
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },

  sms: {
    provider: process.env.SMS_PROVIDER ?? 'eskiz',
    login: process.env.SMS_LOGIN,
    password: process.env.SMS_PASSWORD,
  },

  payme: {
    merchantId: process.env.PAYME_MERCHANT_ID,
    key: process.env.PAYME_KEY,
  },

  click: {
    merchantId: process.env.CLICK_MERCHANT_ID,
    serviceId: process.env.CLICK_SERVICE_ID,
    secret: process.env.CLICK_SECRET,
  },
});
