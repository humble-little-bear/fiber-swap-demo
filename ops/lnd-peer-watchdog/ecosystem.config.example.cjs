// Example PM2 app for the LND peer watchdog. Copy next to the script, adjust
// paths/env, then: pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: 'lnd-peer-watchdog',
      script: '/home/retric/lnd-watchdog/lnd-peer-watchdog.sh',
      interpreter: 'bash',
      cwd: '/home/retric/lnd-watchdog',
      autorestart: true,
      restart_delay: 30000,
      env: {
        PEER_URI: '027431fbdbbc67df1ed0cf30568fe8ab04ef2fbff296ebcc0c826dc01e923799f5@16.162.99.28:8973',
        CHANNEL_POINT: '70fdfd0dd7960b1b7ca1f562ae031b3a37925fa957eb97c97536f82ed5f37c35:1',
        LND_DIR: '/home/retric/.lnd',
        NETWORK: 'testnet',
        RPCSERVER: '127.0.0.1:10009',
        LNCLI: '/home/retric/.local/bin/lncli',
        INTERVAL: '60',
        LOG_FILE: '/home/retric/lnd-watchdog/watchdog.log',
      },
    },
  ],
};
