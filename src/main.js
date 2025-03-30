// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getAppPath, getResourcePath, getPythonExecutablePath } = require('./utils/paths');

// Путь к файлу с портом
const portFile = path.join(getResourcePath(), 'port.txt');

// Настройка логирования
const MAX_LOG_SIZE = 1024 * 1024
const logFile = path.join(getResourcePath(), 'server.log');

// Если размер файла с логами превышает MAX_LOG_SIZE Байт – очистить его
if (fs.existsSync(logFile)) {
  const stats = fs.statSync(logFile);
  if (stats.size > MAX_LOG_SIZE) {
    fs.writeFileSync(logFile, '');
  }
}
const logStream = fs.createWriteStream(logFile, { flags: 'a', encoding: "utf-8" });
logStream.write("\n\nЗапуск приложения\n");


// Функция для логирования
const log = (message, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}\n`;
  console.log(logMessage.trim());
  logStream.write(logMessage);
};


let mainWindow;
let server = null;

function createWindow() {
  log('Создание главного окна приложения');
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 850,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(getAppPath(), 'src/loading.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log('Главное окно приложения готово к отображению');
  });

  startServer().then(() => {
    mainWindow.loadFile(path.join(getAppPath(), 'src/index.html'));
    log('Загружен основной интерфейс приложения');
  }).catch((err) => {
    log(`Ошибка запуска сервера: ${err.message}`, 'ERROR');
    dialog.showErrorBox('Ошибка', 'Не удалось запустить сервер. Попробуйте перезапустить программу или проверьте `server.log`');
  });
}

app.whenReady().then(createWindow);

// Обработка запроса от рендерера для предсказания изображения
ipcMain.handle('predict-image', async (event) => {
  return new Promise((resolve, reject) => {
    dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
      ]
    }).then(result => {
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        log(`Выбран файл для обработки: ${filePath}`);

        mainWindow.webContents.send('image-selected', filePath);

        if (!fs.existsSync(filePath)) {
          log(`Файл не существует: ${filePath}`, 'ERROR');
          reject(new Error('Файл не существует'));
          return;
        }

        log(`Запуск Python-скрипта predict с файлом: ${filePath}`);
        
        const predictPath = getPythonExecutablePath('predict');
        const pythonProcess = spawn(predictPath, [filePath], {
          cwd: getResourcePath()
        });
        
        let dataString = '';

        pythonProcess.stdout.on('data', (data) => {
          dataString += data.toString();
          log(`Получены данные от Python: ${dataString.trim()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
          log(`Ошибка Python: ${data.toString().trim()}`, 'ERROR');
        });

        pythonProcess.on('close', (code) => {
          log(`Python процесс завершился с кодом: ${code}`);
          if (code === 0) {
            try {
              const result = JSON.parse(dataString);
              log(`Успешно получен результат: ${JSON.stringify(result)}`);
              resolve(result);
            } catch (error) {
              log(`Ошибка при разборе JSON: ${error.message}`, 'ERROR');
              reject(new Error('Ошибка при разборе результата: ' + error.message));
            }
          } else {
            log(`НЕУДАЧА: код ${code}`, 'ERROR');
            reject(new Error(`НЕУДАЧА: код ${code}`));
          }
        });

        pythonProcess.on('error', (error) => {
          log(`Ошибка запуска Python процесса: ${error.message}`, 'ERROR');
          reject(new Error('Ошибка запуска Python процесса: ' + error.message));
        });
      }
    }).catch(error => {
      log(`Ошибка при выборе файла: ${error.message}`, 'ERROR');
      reject(error);
    });
  });
});

function waitForServerReady(port, timeout = 30000) {
  const axios = require('axios');
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:${port}/ping`);
        log("Сервер ответил");
        if (res.status === 200) {
          clearInterval(interval);
          resolve();
        }
      } catch (err) {
        if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          log('Сервер не ответил вовремя', 'ERROR');
          reject(new Error('Сервер не ответил вовремя'));
        }
      }
    }, 500);
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    const path = require('path');

    const serverPath = getPythonExecutablePath('server');
    const resourcePath = getResourcePath();
    
    if (server !== null) {
      log('Сервер уже запущен');
      return resolve();
    }

    log('Запуск сервера...');
    log(`Путь к серверу: ${serverPath}`);
    log(`Путь к ресурсам: ${resourcePath}`);

    // Создаем объект с переменными окружения
    // const env = {
    //   ...process.env,  // Копируем все существующие переменные окружения
    //   NODE_ENV: isDev ? 'development' : 'production',
    //   RESOURCE_PATH: resourcePath
    // };

    server = spawn(serverPath, {
      cwd: resourcePath
    });
    
    server.stdout.pipe(logStream);
    server.stderr.pipe(logStream);
    log('Сервер запущен');
    
    server.on('error', (err) => {
      log(`Ошибка запуска сервера: ${err.toString()}`, 'ERROR');
      reject(err);
    });

    server.stdout.on('data', (data) => {
      log(`[SERVER] ${data.toString().trim()}`);
    });

    server.stderr.on('data', (data) => {
      log(`[SERVER-ERROR] ${data.toString().trim()}`, 'ERROR');
    });

    const timeout = 60000;
    const startTime = Date.now();

    const checkServerReady = setInterval(() => {
      if (fs.existsSync(portFile)) {
        const port = fs.readFileSync(portFile, 'utf-8').trim();
        log(`Найден порт сервера: ${port}`);

        waitForServerReady(port)
          .then(() => {
            clearInterval(checkServerReady);
            log('Сервер успешно запущен и готов к работе');
            resolve();
          })
          .catch((err) => {
            clearInterval(checkServerReady);
            log(`Ошибка при ожидании готовности сервера: ${err.message}`, 'ERROR');
            reject(err);
          });
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkServerReady);
        log('port.txt не появился вовремя', 'ERROR');
        reject(new Error('port.txt не появился вовремя'));
      }
    }, 500);
  });
}

app.on('before-quit', () => {
  const axios = require('axios');
  
  if (server && !server.killed) {
    log("ПЫТАЮСЬ ЗАКРЫТЬ СЕРВЕР");
    const port = fs.readFileSync(portFile, 'utf-8').trim();
    axios.delete(`http://127.0.0.1:${port}/kill`);
  }
  
  if (fs.existsSync(portFile)) {
    fs.unlinkSync(portFile);
    log('Удалён файл port.txt')
  }

  log('🛑 Закрытие приложения...');
  app.exit();
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  log(`Необработанное исключение: ${error.message}`, 'ERROR');
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Необработанное отклонение промиса: ${reason}`, 'ERROR');
});