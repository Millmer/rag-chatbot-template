module.exports = {
    // Modify these to include the public URLs you want to have access to the API
    allowed_origins: [
        'http://localhost:8080',
        'http://localhost:5173',
    ],
    initial_message: "Hi I'm GastroGuru, ask me any question about recipes and diets!",
    RECONNECTION_THRESHOLD: 1000 // 1 second
}