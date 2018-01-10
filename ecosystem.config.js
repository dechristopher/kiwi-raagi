module.exports = {
    /**
     * Application configuration section
     * http://pm2.keymetrics.io/docs/usage/application-declaration/
     */
    apps: [
        // First application
        {
            name: 'raagi',
            script: 'index.js',
            watch: true,
            env: {
                RAAGI_VERSION: 'v1.4.0'
            },
            env_production: {
                NODE_ENV: 'production'
            },
            instances: 4,
            exec_mode: "cluster"
        }
    ]
};