// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;

let server = null;

function createWindow() {
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

  mainWindow.loadFile('loading.html');
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  startServer().then(() => {
    mainWindow.loadFile('index.html');
  }).catch((err) => {
    console.error('Ошибка запуска сервера:', err);
    dialog.showErrorBox('Ошибка', 'Не удалось запустить сервер. Проверьте логи');
    // app.quit();
  });
}

app.whenReady().then(createWindow);

// Обработка запроса от рендерера для предсказания изображения
ipcMain.handle('predict-image', async (event) => {
  return new Promise((resolve, reject) => {
    // Открываем диалог выбора файла
    dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
      ]
    }).then(result => {
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        console.log('Выбран файл:', filePath);

        // Отправляем путь к изображению в renderer
        mainWindow.webContents.send('image-selected', filePath);

        // Проверяем существование файла
        if (!fs.existsSync(filePath)) {
          console.error('Файл не существует:', filePath);
          reject(new Error('Файл не существует'));
          return;
        }

        console.log('Запуск Python-скрипта с файлом:', filePath);
        
        // const pythonProcess = spawn('python', [path.join(__dirname, 'predict.py'), filePath]);
        const pythonProcess = spawn('python', [path.join(__dirname, 'dist', 'predict.py'), filePath]);
        
        // ЗАПУСК PREDICT.PY через упаковщик
        // const predictPath = path.join(process.resourcesPath, 'predict');
        // const pythonProcess = spawn(predictPath, [filePath], {
        //   cwd: process.resourcesPath,
        // });
        let dataString = '';

        pythonProcess.stdout.on('data', (data) => {
          dataString += data.toString();
          console.log('Получены данные от Python:', dataString);
        });

        pythonProcess.stderr.on('data', (data) => {
          console.error('Ошибка Python:', data.toString());
        });

        pythonProcess.on('close', (code) => {
          console.log('Python процесс завершился с кодом:', code);
          if (code === 0) {
            try {
              const result = JSON.parse(dataString);
              console.log('Успешно получен результат:', result);
              resolve(result);
            } catch (error) {
              console.error('Ошибка при разборе JSON:', error);
              reject(new Error('Ошибка при разборе результата: ' + error.message));
            }
          } else {
            reject(new Error(`НЕУДАЧА: код ${code}`));
          }
        });

        pythonProcess.on('error', (error) => {
          console.error('Ошибка запуска Python процесса:', error);
          reject(new Error('Ошибка запуска Python процесса: ' + error.message));
        });
      } else {
        reject(new Error('Файл не был выбран'));
      }
    }).catch(error => {
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
        console.log('Сервер ответил:', res.toString())
        if (res.status === 200) {
          clearInterval(interval);
          resolve();
        }
      } catch (err) {
        if (Date.now() - startTime > timeout) {
          clearInterval(interval);
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

    // ЗАПУСК SERVER.PY через упаковщик
    // const serverPath = path.join(process.resourcesPath, 'server');
    // const portFile = path.join(process.resourcesPath, 'port.txt');
    const portFile = 'port.txt';

    // const server = spawn('python', ['server.py']);
    const serverPath = path.join(__dirname, 'dist', 'server');
    
    // 📄 Лог файл
    const logFile = path.join(process.resourcesPath, 'server.log');
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    if (server !== null) {
      return resolve()
    }
    // 🧠 Важный момент: задать cwd
    server = spawn(serverPath, {
      cwd: process.resourcesPath,
    });
    
    // 📥 Логируем всё
    server.stdout.pipe(logStream);
    server.stderr.pipe(logStream);
    console.log("Сервер запущен")
    
    // const server = spawn(serverPath);
    server.on('error', (err) => {
      logStream.write('[ERROR SPAWN] ' + err.toString() + '\n');
      reject(err);
    });


    server.on('error', reject);

    server.stdout.on('data', (data) => {
      console.log('[SERVER]', data.toString());
    });

    server.stderr.on('data', (data) => {
      console.error('[SERVER-ERROR]', data.toString());
    });

    // Ждем, пока появится файл port.txt и сервер станет доступен
    console.log(portFile);
    const timeout = 35000;
    const startTime = Date.now();

    const checkServerReady = setInterval(() => {
      if (fs.existsSync(portFile)) {
        const port = fs.readFileSync(portFile, 'utf-8').trim();

        waitForServerReady(port)
          .then(() => {
            clearInterval(checkServerReady);
            resolve();
          })
          .catch((err) => {
            clearInterval(checkServerReady);
            reject(err);
          });
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkServerReady);
        reject(new Error('port.txt не появился вовремя'));
      }
    }, 500);
  });
}


app.on('before-quit', () => {
  console.log('🛑 Закрытие приложения...');
  if (server) {
    console.log('⛔ Убиваем серверный процесс...');
    server.kill(); // отправляет SIGTERM
    server = null;
  }
});



// startServer();