const path = require('path');
const { app } = require('electron');

// Определяем, запущено ли приложение в режиме разработки
const isDev = process.env.NODE_ENV === 'development';

// Получаем базовый путь приложения
const getAppPath = () => {
    if (isDev) {
        return path.join(__dirname, '..', '..');
    }
    // В упакованном приложении файлы находятся в app.asar
    return path.join(process.resourcesPath, 'app.asar');
};

// Получаем путь к ресурсам
const getResourcePath = () => {
    if (isDev) {
        return path.join(__dirname, '..', '..');
    }
    return process.resourcesPath;
};

// Получаем путь к моделям
const getModelsPath = () => {
    return path.join(getResourcePath(), 'models');
};

// Получаем путь к исполняемым файлам Python
const getPythonExecutablePath = (executableName) => {
    if (isDev) {
        return path.join(__dirname, '..', '..', 'dist', executableName);
    }
    return path.join(process.resourcesPath, 'dist', executableName);
};

module.exports = {
    getAppPath,
    getResourcePath,
    getModelsPath,
    getPythonExecutablePath,
    isDev
}; 