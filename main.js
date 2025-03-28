// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;

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

  mainWindow.loadFile('index.html');
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
        const pythonProcess = spawn('python', [path.join(__dirname, 'predict.py'), filePath]);
        // const pythonProcess = spawn(path.join(__dirname, 'dist', 'predict'), [filePath]);
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

function startServer() {
    const server = spawn('python', ['server.py'], { stdio: 'inherit' });

    server.on('error', (err) => {
        console.error('Ошибка при запуске сервера:', err);
    });

    server.on('close', (code) => {
        console.log(`Сервер завершил работу с кодом ${code}`);
    });
}

startServer();