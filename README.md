# Clothes Classification
This **Electron** application uses my trained `ResNet50` model to classify **12 categories** of clothing in the images

## Quick start
```bash
git clone git@github.com:razveetonormalno/clothes-classification-electron-app.git clothes-classification
cd clothes-classification

pip install -r requirements.txt
pyintsaller --onefile backend/predict.py
pyintsaller --onefile backend/server.py

npm install
npm start
```
